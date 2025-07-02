"""
Sync management endpoints for Callivate API
Handles offline sync, conflict resolution, and data synchronization
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional, Dict, Any
from app.models.sync import SyncQueue, SyncQueueCreate
from app.models.user import User
from app.api.api_v1.endpoints.auth import get_current_user
from app.core.database import get_supabase
from supabase import Client
from datetime import datetime, timedelta
from uuid import UUID
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/queue", response_model=List[SyncQueue])
async def batch_sync_queue(
    sync_items: List[SyncQueueCreate],
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Batch process sync queue items from client"""
    try:
        processed_items = []
        
        for item in sync_items:
            # Validate the sync item belongs to current user
            if str(item.user_id) != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot sync data for another user"
                )
            
            try:
                # Process the sync operation
                result = await _process_sync_item(item, supabase)
                processed_items.append(result)
                
            except Exception as item_error:
                logger.error(f"Error processing sync item {item.record_id}: {str(item_error)}")
                
                # Create failed sync queue entry
                failed_item_data = {
                    "user_id": current_user.id,
                    "table_name": item.table_name,
                    "record_id": item.record_id,
                    "operation": item.operation,
                    "data": item.data,
                    "conflict_resolution": item.conflict_resolution,
                    "status": "failed",
                    "error_message": str(item_error),
                    "retry_count": 0
                }
                
                failed_response = supabase.table("sync_queue").insert(failed_item_data).execute()
                if failed_response.data:
                    processed_items.append(SyncQueue(**failed_response.data[0]))
        
        logger.info(f"Processed {len(processed_items)} sync items for user {current_user.id}")
        return processed_items
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing sync queue: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process sync queue"
        )

@router.get("/status/{user_id}")
async def get_sync_status(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    include_completed: bool = Query(False, description="Include completed sync items"),
    limit: int = Query(100, description="Maximum number of items to return")
):
    """Get sync status for user"""
    try:
        # Users can only access their own sync status
        if str(user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this sync status"
            )
        
        # Query sync queue items
        query = supabase.table("sync_queue").select("*").eq("user_id", user_id)
        
        if not include_completed:
            query = query.neq("status", "completed")
        
        query = query.order("created_at", desc=True).limit(limit)
        
        response = query.execute()
        sync_items = [SyncQueue(**item) for item in response.data]
        
        # Calculate sync statistics
        pending_count = len([item for item in sync_items if item.status == "pending"])
        processing_count = len([item for item in sync_items if item.status == "processing"])
        failed_count = len([item for item in sync_items if item.status == "failed"])
        completed_count = len([item for item in sync_items if item.status == "completed"])
        
        # Get last successful sync time
        last_sync_response = supabase.table("sync_queue").select("processed_at").eq("user_id", user_id).eq("status", "completed").order("processed_at", desc=True).limit(1).execute()
        
        last_sync_time = None
        if last_sync_response.data:
            last_sync_time = last_sync_response.data[0]["processed_at"]
        
        return {
            "user_id": user_id,
            "sync_items": sync_items,
            "statistics": {
                "pending": pending_count,
                "processing": processing_count,
                "failed": failed_count,
                "completed": completed_count,
                "total": len(sync_items)
            },
            "last_sync_time": last_sync_time,
            "has_pending_changes": pending_count > 0 or processing_count > 0,
            "has_conflicts": failed_count > 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting sync status for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get sync status"
        )

@router.post("/resolve-conflicts")
async def resolve_conflicts(
    conflict_resolutions: List[Dict[str, Any]],
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Handle data conflicts with user-specified resolutions"""
    try:
        resolved_items = []
        
        for resolution in conflict_resolutions:
            sync_item_id = resolution.get("sync_item_id")
            resolution_strategy = resolution.get("resolution_strategy")  # "server_wins", "client_wins", "merge"
            merged_data = resolution.get("merged_data")  # For merge strategy
            
            if not sync_item_id or not resolution_strategy:
                continue
            
            # Get the sync item
            sync_response = supabase.table("sync_queue").select("*").eq("id", sync_item_id).eq("user_id", current_user.id).execute()
            
            if not sync_response.data:
                continue
            
            sync_item = SyncQueue(**sync_response.data[0])
            
            try:
                if resolution_strategy == "server_wins":
                    # Mark as completed, server data is already correct
                    update_data = {
                        "status": "completed",
                        "processed_at": datetime.now().isoformat(),
                        "conflict_resolution": "server_wins"
                    }
                    
                elif resolution_strategy == "client_wins":
                    # Apply the client data
                    await _apply_client_data(sync_item, supabase)
                    update_data = {
                        "status": "completed",
                        "processed_at": datetime.now().isoformat(),
                        "conflict_resolution": "client_wins"
                    }
                    
                elif resolution_strategy == "merge" and merged_data:
                    # Apply the merged data
                    await _apply_merged_data(sync_item, merged_data, supabase)
                    update_data = {
                        "status": "completed",
                        "processed_at": datetime.now().isoformat(),
                        "conflict_resolution": "merge",
                        "data": merged_data
                    }
                else:
                    raise ValueError("Invalid resolution strategy")
                
                # Update sync item status
                updated_response = supabase.table("sync_queue").update(update_data).eq("id", sync_item_id).execute()
                
                if updated_response.data:
                    resolved_items.append(SyncQueue(**updated_response.data[0]))
                    
            except Exception as resolve_error:
                logger.error(f"Error resolving conflict for sync item {sync_item_id}: {str(resolve_error)}")
                
                # Mark as failed with error
                supabase.table("sync_queue").update({
                    "status": "failed",
                    "error_message": f"Conflict resolution failed: {str(resolve_error)}",
                    "retry_count": sync_item.retry_count + 1
                }).eq("id", sync_item_id).execute()
        
        logger.info(f"Resolved {len(resolved_items)} conflicts for user {current_user.id}")
        return {
            "resolved_items": resolved_items,
            "resolved_count": len(resolved_items)
        }
        
    except Exception as e:
        logger.error(f"Error resolving conflicts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resolve conflicts"
        )

@router.post("/retry-failed")
async def retry_failed_sync_items(
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    max_retries: int = Query(3, description="Maximum retry attempts")
):
    """Retry failed sync items that haven't exceeded max retries"""
    try:
        # Get failed sync items that can be retried
        failed_response = supabase.table("sync_queue").select("*").eq("user_id", current_user.id).eq("status", "failed").lt("retry_count", max_retries).execute()
        
        retried_items = []
        
        for item_data in failed_response.data:
            sync_item = SyncQueue(**item_data)
            
            try:
                # Create new sync queue item from failed one
                retry_item = SyncQueueCreate(
                    user_id=sync_item.user_id,
                    table_name=sync_item.table_name,
                    record_id=sync_item.record_id,
                    operation=sync_item.operation,
                    data=sync_item.data,
                    conflict_resolution=sync_item.conflict_resolution
                )
                
                # Process the retry
                result = await _process_sync_item(retry_item, supabase)
                retried_items.append(result)
                
                # Mark original as completed
                supabase.table("sync_queue").update({
                    "status": "completed",
                    "processed_at": datetime.now().isoformat()
                }).eq("id", sync_item.id).execute()
                
            except Exception as retry_error:
                logger.error(f"Retry failed for sync item {sync_item.id}: {str(retry_error)}")
                
                # Increment retry count
                supabase.table("sync_queue").update({
                    "retry_count": sync_item.retry_count + 1,
                    "error_message": str(retry_error)
                }).eq("id", sync_item.id).execute()
        
        logger.info(f"Retried {len(retried_items)} failed sync items for user {current_user.id}")
        return {
            "retried_items": retried_items,
            "retry_count": len(retried_items)
        }
        
    except Exception as e:
        logger.error(f"Error retrying failed sync items: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retry sync items"
        )

@router.delete("/cleanup")
async def cleanup_completed_sync_items(
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    older_than_days: int = Query(7, description="Delete completed items older than N days")
):
    """Clean up old completed sync items"""
    try:
        cutoff_date = datetime.now() - timedelta(days=older_than_days)
        
        # Delete completed sync items older than cutoff
        delete_response = supabase.table("sync_queue").delete().eq("user_id", current_user.id).eq("status", "completed").lt("processed_at", cutoff_date.isoformat()).execute()
        
        deleted_count = len(delete_response.data) if delete_response.data else 0
        
        logger.info(f"Cleaned up {deleted_count} old sync items for user {current_user.id}")
        return {
            "deleted_count": deleted_count,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up sync items: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clean up sync items"
        )

@router.get("/conflicts")
async def get_sync_conflicts(
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get all unresolved sync conflicts for user"""
    try:
        # Get failed sync items (which represent conflicts)
        conflicts_response = supabase.table("sync_queue").select("*").eq("user_id", current_user.id).eq("status", "failed").order("created_at", desc=True).execute()
        
        conflicts = []
        for item_data in conflicts_response.data:
            sync_item = SyncQueue(**item_data)
            
            # Get current server data for comparison
            server_data = await _get_server_data(sync_item.table_name, sync_item.record_id, supabase)
            
            conflict_info = {
                "sync_item": sync_item,
                "client_data": sync_item.data,
                "server_data": server_data,
                "conflict_type": _determine_conflict_type(sync_item, server_data),
                "resolution_options": ["server_wins", "client_wins", "merge"]
            }
            
            conflicts.append(conflict_info)
        
        return {
            "conflicts": conflicts,
            "conflict_count": len(conflicts)
        }
        
    except Exception as e:
        logger.error(f"Error getting sync conflicts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get sync conflicts"
        )

# Helper functions

async def _process_sync_item(item: SyncQueueCreate, supabase: Client) -> SyncQueue:
    """Process a single sync queue item"""
    
    # Create sync queue entry
    queue_data = {
        "user_id": item.user_id,
        "table_name": item.table_name,
        "record_id": item.record_id,
        "operation": item.operation,
        "data": item.data,
        "conflict_resolution": item.conflict_resolution,
        "status": "processing"
    }
    
    queue_response = supabase.table("sync_queue").insert(queue_data).execute()
    sync_queue_item = SyncQueue(**queue_response.data[0])
    
    try:
        if item.operation == "create":
            await _handle_create_operation(item, supabase)
        elif item.operation == "update":
            await _handle_update_operation(item, supabase)
        elif item.operation == "delete":
            await _handle_delete_operation(item, supabase)
        
        # Mark as completed
        completed_response = supabase.table("sync_queue").update({
            "status": "completed",
            "processed_at": datetime.now().isoformat()
        }).eq("id", sync_queue_item.id).execute()
        
        return SyncQueue(**completed_response.data[0])
        
    except Exception as e:
        # Mark as failed
        failed_response = supabase.table("sync_queue").update({
            "status": "failed",
            "error_message": str(e),
            "retry_count": sync_queue_item.retry_count + 1
        }).eq("id", sync_queue_item.id).execute()
        
        return SyncQueue(**failed_response.data[0])

async def _handle_create_operation(item: SyncQueueCreate, supabase: Client):
    """Handle create operation with conflict detection"""
    # Check if record already exists
    existing = supabase.table(item.table_name).select("id").eq("id", item.record_id).execute()
    
    if existing.data:
        if item.conflict_resolution == "client_wins":
            # Update existing record
            supabase.table(item.table_name).update(item.data).eq("id", item.record_id).execute()
        # For server_wins, do nothing (server data is preserved)
    else:
        # Create new record
        create_data = item.data.copy()
        create_data["id"] = item.record_id
        supabase.table(item.table_name).insert(create_data).execute()

async def _handle_update_operation(item: SyncQueueCreate, supabase: Client):
    """Handle update operation with conflict detection"""
    # Get current server data
    server_response = supabase.table(item.table_name).select("*").eq("id", item.record_id).execute()
    
    if not server_response.data:
        # Record doesn't exist, create it
        create_data = item.data.copy()
        create_data["id"] = item.record_id
        supabase.table(item.table_name).insert(create_data).execute()
    else:
        server_data = server_response.data[0]
        
        # Check for conflicts (simplified conflict detection)
        if _has_conflict(item.data, server_data):
            if item.conflict_resolution == "client_wins":
                supabase.table(item.table_name).update(item.data).eq("id", item.record_id).execute()
            elif item.conflict_resolution == "merge":
                merged_data = _merge_data(item.data, server_data)
                supabase.table(item.table_name).update(merged_data).eq("id", item.record_id).execute()
            # For server_wins, do nothing
        else:
            # No conflict, apply update
            supabase.table(item.table_name).update(item.data).eq("id", item.record_id).execute()

async def _handle_delete_operation(item: SyncQueueCreate, supabase: Client):
    """Handle delete operation"""
    supabase.table(item.table_name).delete().eq("id", item.record_id).execute()

async def _apply_client_data(sync_item: SyncQueue, supabase: Client):
    """Apply client data to server"""
    if sync_item.operation == "create":
        create_data = sync_item.data.copy()
        create_data["id"] = sync_item.record_id
        supabase.table(sync_item.table_name).insert(create_data).execute()
    elif sync_item.operation == "update":
        supabase.table(sync_item.table_name).update(sync_item.data).eq("id", sync_item.record_id).execute()
    elif sync_item.operation == "delete":
        supabase.table(sync_item.table_name).delete().eq("id", sync_item.record_id).execute()

async def _apply_merged_data(sync_item: SyncQueue, merged_data: Dict[str, Any], supabase: Client):
    """Apply merged data to server"""
    if sync_item.operation in ["create", "update"]:
        # Try update first, then create if not exists
        update_response = supabase.table(sync_item.table_name).update(merged_data).eq("id", sync_item.record_id).execute()
        if not update_response.data:
            create_data = merged_data.copy()
            create_data["id"] = sync_item.record_id
            supabase.table(sync_item.table_name).insert(create_data).execute()

async def _get_server_data(table_name: str, record_id: UUID, supabase: Client) -> Optional[Dict[str, Any]]:
    """Get current server data for a record"""
    try:
        response = supabase.table(table_name).select("*").eq("id", record_id).execute()
        return response.data[0] if response.data else None
    except Exception:
        return None

def _determine_conflict_type(sync_item: SyncQueue, server_data: Optional[Dict[str, Any]]) -> str:
    """Determine the type of conflict"""
    if not server_data:
        return "missing_server_record"
    
    if sync_item.operation == "delete" and server_data:
        return "delete_conflict"
    
    if sync_item.operation == "update":
        return "update_conflict"
    
    return "unknown_conflict"

def _has_conflict(client_data: Dict[str, Any], server_data: Dict[str, Any]) -> bool:
    """Simple conflict detection based on updated_at timestamps"""
    client_updated = client_data.get("updated_at")
    server_updated = server_data.get("updated_at")
    
    if not client_updated or not server_updated:
        return False
    
    # If server was updated after client data, there's a conflict
    try:
        client_time = datetime.fromisoformat(client_updated.replace('Z', '+00:00'))
        server_time = datetime.fromisoformat(server_updated.replace('Z', '+00:00'))
        return server_time > client_time
    except Exception:
        return False

def _merge_data(client_data: Dict[str, Any], server_data: Dict[str, Any]) -> Dict[str, Any]:
    """Simple merge strategy - client data wins for most fields, but preserve server timestamps"""
    merged = server_data.copy()
    merged.update(client_data)
    
    # Preserve server timestamps
    if "created_at" in server_data:
        merged["created_at"] = server_data["created_at"]
    
    merged["updated_at"] = datetime.now().isoformat()
    
    return merged 