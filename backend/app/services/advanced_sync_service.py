"""
Advanced Sync Infrastructure Service for Callivate
Handles batch sync processing, conflict resolution, incremental sync optimization,
and sync status reporting with Supabase
"""

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import hashlib

from supabase import Client
from app.core.database import get_supabase

logger = logging.getLogger(__name__)

class SyncOperation(Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"

class SyncStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CONFLICT = "conflict"

class ConflictResolution(Enum):
    SERVER_WINS = "server_wins"
    CLIENT_WINS = "client_wins"
    MERGE = "merge"
    MANUAL = "manual"

@dataclass
class SyncItem:
    id: str
    user_id: str
    table_name: str
    record_id: str
    operation: SyncOperation
    data: Dict[str, Any]
    conflict_resolution: ConflictResolution
    retry_count: int
    max_retries: int
    status: SyncStatus
    error_message: Optional[str]
    created_at: datetime
    processed_at: Optional[datetime]

@dataclass
class SyncResult:
    success: bool
    items_processed: int
    items_failed: int
    conflicts_resolved: int
    errors: List[str]
    processing_time: float

class AdvancedSyncService:
    """
    Advanced sync service with conflict resolution and optimization
    """
    
    def __init__(self):
        self.supabase = get_supabase()
        self.is_running = False
        self.batch_size = 50
        self.max_concurrent_batches = 5
        self.sync_cache = {}
        
    async def start_service(self):
        """Start the advanced sync service"""
        if self.is_running:
            logger.warning("Advanced sync service is already running")
            return
            
        self.is_running = True
        logger.info("Starting advanced sync service...")
        
        # Start concurrent processing tasks without blocking
        self._tasks = [
            asyncio.create_task(self._batch_sync_processor()),
            asyncio.create_task(self._conflict_resolver()),
            asyncio.create_task(self._incremental_sync_optimizer()),
            asyncio.create_task(self._sync_cleanup_processor()),
        ]
        
        logger.info("✅ Advanced sync service started successfully")
    
    async def stop_service(self):
        """Stop the advanced sync service"""
        self.is_running = False
        
        # Cancel all background tasks
        if hasattr(self, '_tasks'):
            for task in self._tasks:
                if not task.done():
                    task.cancel()
            
            # Wait for tasks to complete cancellation
            if self._tasks:
                await asyncio.gather(*self._tasks, return_exceptions=True)
        
        logger.info("Advanced sync service stopped")
    
    # Batch Sync Processing
    
    async def _batch_sync_processor(self):
        """Main batch sync processing loop"""
        while self.is_running:
            try:
                await self._process_sync_batches()
                await asyncio.sleep(30)  # Process every 30 seconds
            except Exception as e:
                logger.error(f"Error in batch sync processor: {e}")
                await asyncio.sleep(60)
    
    async def _process_sync_batches(self):
        """Process sync items in batches"""
        try:
            # Get pending sync items
            pending_items = await self._get_pending_sync_items()
            
            if not pending_items:
                return
            
            # Group by user for better processing
            user_batches = self._group_items_by_user(pending_items)
            
            # Process batches concurrently
            batch_tasks = []
            for user_id, items in user_batches.items():
                batch_task = self._process_user_batch(user_id, items)
                batch_tasks.append(batch_task)
                
                # Limit concurrent batches
                if len(batch_tasks) >= self.max_concurrent_batches:
                    await asyncio.gather(*batch_tasks, return_exceptions=True)
                    batch_tasks = []
            
            # Process remaining batches
            if batch_tasks:
                await asyncio.gather(*batch_tasks, return_exceptions=True)
                
        except Exception as e:
            logger.error(f"Error processing sync batches: {e}")
    
    async def _process_user_batch(self, user_id: str, items: List[SyncItem]) -> SyncResult:
        """Process sync batch for a specific user"""
        start_time = datetime.now()
        items_processed = 0
        items_failed = 0
        conflicts_resolved = 0
        errors = []
        
        try:
            logger.info(f"Processing {len(items)} sync items for user {user_id}")
            
            # Mark items as processing
            item_ids = [item.id for item in items]
            await self._update_sync_status(item_ids, SyncStatus.PROCESSING)
            
            # Process each item
            for item in items:
                try:
                    result = await self._process_sync_item(item)
                    
                    if result["success"]:
                        items_processed += 1
                        if result.get("conflict_resolved"):
                            conflicts_resolved += 1
                    else:
                        items_failed += 1
                        errors.append(f"Item {item.id}: {result.get('error', 'Unknown error')}")
                        
                except Exception as e:
                    items_failed += 1
                    errors.append(f"Item {item.id}: {str(e)}")
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"Batch complete for user {user_id}: "
                       f"{items_processed} success, {items_failed} failed, "
                       f"{conflicts_resolved} conflicts resolved")
            
            return SyncResult(
                success=items_failed == 0,
                items_processed=items_processed,
                items_failed=items_failed,
                conflicts_resolved=conflicts_resolved,
                errors=errors,
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Error processing user batch: {e}")
            return SyncResult(
                success=False,
                items_processed=items_processed,
                items_failed=len(items),
                conflicts_resolved=conflicts_resolved,
                errors=[str(e)],
                processing_time=(datetime.now() - start_time).total_seconds()
            )
    
    async def _process_sync_item(self, item: SyncItem) -> Dict[str, Any]:
        """Process individual sync item"""
        try:
            # Check for conflicts first
            conflict_result = await self._check_for_conflicts(item)
            
            if conflict_result["has_conflict"]:
                return await self._handle_conflict(item, conflict_result)
            
            # No conflict, proceed with operation
            return await self._execute_sync_operation(item)
            
        except Exception as e:
            logger.error(f"Error processing sync item {item.id}: {e}")
            await self._mark_sync_failed(item.id, str(e))
            return {"success": False, "error": str(e)}
    
    async def _execute_sync_operation(self, item: SyncItem) -> Dict[str, Any]:
        """Execute the sync operation"""
        try:
            if item.operation == SyncOperation.CREATE:
                result = await self._execute_create(item)
            elif item.operation == SyncOperation.UPDATE:
                result = await self._execute_update(item)
            elif item.operation == SyncOperation.DELETE:
                result = await self._execute_delete(item)
            else:
                raise ValueError(f"Unknown operation: {item.operation}")
            
            if result["success"]:
                await self._mark_sync_completed(item.id)
            else:
                await self._mark_sync_failed(item.id, result.get("error", "Operation failed"))
            
            return result
            
        except Exception as e:
            logger.error(f"Error executing sync operation: {e}")
            await self._mark_sync_failed(item.id, str(e))
            return {"success": False, "error": str(e)}
    
    async def _execute_create(self, item: SyncItem) -> Dict[str, Any]:
        """Execute CREATE operation"""
        try:
            response = self.supabase.table(item.table_name).insert(item.data).execute()
            
            if response.data:
                return {"success": True, "created_record": response.data[0]}
            else:
                return {"success": False, "error": "No data returned from insert"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _execute_update(self, item: SyncItem) -> Dict[str, Any]:
        """Execute UPDATE operation"""
        try:
            response = self.supabase.table(item.table_name).update(
                item.data
            ).eq("id", item.record_id).execute()
            
            if response.data:
                return {"success": True, "updated_record": response.data[0]}
            else:
                return {"success": False, "error": "No records updated"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _execute_delete(self, item: SyncItem) -> Dict[str, Any]:
        """Execute DELETE operation"""
        try:
            response = self.supabase.table(item.table_name).delete().eq(
                "id", item.record_id
            ).execute()
            
            return {"success": True, "deleted_record": response.data}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Conflict Resolution
    
    async def _conflict_resolver(self):
        """Process conflict resolution"""
        while self.is_running:
            try:
                await self._resolve_pending_conflicts()
                await asyncio.sleep(120)  # Check every 2 minutes
            except Exception as e:
                logger.error(f"Error in conflict resolver: {e}")
                await asyncio.sleep(300)
    
    async def _resolve_pending_conflicts(self):
        """Resolve pending conflicts in the sync queue"""
        try:
            # Get items with conflict status
            conflict_response = self.supabase.table("sync_queue").select("*").eq(
                "status", "conflict"
            ).order("created_at").limit(50).execute()
            
            conflict_items = conflict_response.data or []
            
            if not conflict_items:
                return
            
            logger.info(f"Processing {len(conflict_items)} conflict items")
            
            for conflict_data in conflict_items:
                try:
                    conflict_item = self._parse_sync_item(conflict_data)
                    
                    # Check if conflict can be auto-resolved
                    if conflict_item.conflict_resolution == ConflictResolution.SERVER_WINS:
                        await self._mark_sync_completed(conflict_item.id, "auto_resolved_server_wins")
                    elif conflict_item.conflict_resolution == ConflictResolution.CLIENT_WINS:
                        # Retry the operation
                        result = await self._force_sync_operation(conflict_item)
                        if result["success"]:
                            await self._mark_sync_completed(conflict_item.id, "auto_resolved_client_wins")
                        else:
                            await self._mark_sync_failed(conflict_item.id, f"Auto-resolution failed: {result.get('error')}")
                    # Manual conflicts remain for user resolution
                    
                except Exception as e:
                    logger.error(f"Error resolving conflict {conflict_data.get('id')}: {e}")
                    
        except Exception as e:
            logger.error(f"Error in resolve pending conflicts: {e}")
    
    async def _force_sync_operation(self, item: SyncItem) -> Dict[str, Any]:
        """Force sync operation, bypassing normal conflict checks"""
        try:
            logger.info(f"Force syncing {item.operation.value} operation for {item.table_name}:{item.record_id}")
            
            if item.operation == SyncOperation.CREATE:
                # Force create by upserting
                create_data = item.data.copy()
                create_data["id"] = item.record_id
                create_data["updated_at"] = datetime.now().isoformat()
                
                response = self.supabase.table(item.table_name).upsert(create_data).execute()
                
                if response.data:
                    return {"success": True, "forced_record": response.data[0]}
                else:
                    return {"success": False, "error": "Force create failed"}
                    
            elif item.operation == SyncOperation.UPDATE:
                # Force update with current timestamp
                update_data = item.data.copy()
                update_data["updated_at"] = datetime.now().isoformat()
                
                response = self.supabase.table(item.table_name).update(
                    update_data
                ).eq("id", item.record_id).execute()
                
                if response.data:
                    return {"success": True, "forced_record": response.data[0]}
                else:
                    return {"success": False, "error": "Force update failed"}
                    
            elif item.operation == SyncOperation.DELETE:
                # Force delete
                response = self.supabase.table(item.table_name).delete().eq(
                    "id", item.record_id
                ).execute()
                
                return {"success": True, "forced_delete": True}
            
            return {"success": False, "error": "Unknown operation type"}
            
        except Exception as e:
            logger.error(f"Error in force sync operation: {e}")
            return {"success": False, "error": str(e)}
    
    async def _mark_sync_conflict(self, item_id: str, conflict_data: Dict[str, Any]):
        """Mark sync item as having a conflict"""
        try:
            update_data = {
                "status": "conflict",
                "error_message": f"Conflict detected: {conflict_data.get('conflict_type', 'unknown')}",
                "processed_at": datetime.now().isoformat()
            }
            
            self.supabase.table("sync_queue").update(update_data).eq("id", item_id).execute()
            logger.info(f"Marked sync item {item_id} as conflict")
            
        except Exception as e:
            logger.error(f"Error marking sync conflict: {e}")
    
    async def _check_for_conflicts(self, item: SyncItem) -> Dict[str, Any]:
        """Check if sync item has conflicts with server data"""
        try:
            if item.operation == SyncOperation.CREATE:
                # Check if record already exists
                response = self.supabase.table(item.table_name).select("*").eq(
                    "id", item.record_id
                ).execute()
                
                if response.data:
                    return {
                        "has_conflict": True,
                        "conflict_type": "record_exists",
                        "server_data": response.data[0]
                    }
            
            elif item.operation == SyncOperation.UPDATE:
                # Check if record was modified since last sync
                response = self.supabase.table(item.table_name).select("*").eq(
                    "id", item.record_id
                ).execute()
                
                if not response.data:
                    return {
                        "has_conflict": True,
                        "conflict_type": "record_not_found",
                        "server_data": None
                    }
                
                server_record = response.data[0]
                
                # Compare update timestamps
                server_updated = server_record.get("updated_at")
                client_updated = item.data.get("updated_at")
                
                if server_updated and client_updated:
                    server_time = datetime.fromisoformat(server_updated.replace("Z", "+00:00"))
                    client_time = datetime.fromisoformat(client_updated.replace("Z", "+00:00"))
                    
                    if server_time > client_time:
                        return {
                            "has_conflict": True,
                            "conflict_type": "newer_version",
                            "server_data": server_record
                        }
            
            elif item.operation == SyncOperation.DELETE:
                # Check if record still exists and was modified
                response = self.supabase.table(item.table_name).select("*").eq(
                    "id", item.record_id
                ).execute()
                
                if not response.data:
                    # Record already deleted, no conflict
                    return {"has_conflict": False}
                
                server_record = response.data[0]
                # Could check if it was modified since delete request
                return {
                    "has_conflict": True,
                    "conflict_type": "record_exists",
                    "server_data": server_record
                }
            
            return {"has_conflict": False}
            
        except Exception as e:
            logger.error(f"Error checking conflicts: {e}")
            return {"has_conflict": False, "error": str(e)}
    
    async def _handle_conflict(self, item: SyncItem, conflict_result: Dict[str, Any]) -> Dict[str, Any]:
        """Handle sync conflict based on resolution strategy"""
        try:
            conflict_type = conflict_result.get("conflict_type")
            server_data = conflict_result.get("server_data")
            
            if item.conflict_resolution == ConflictResolution.SERVER_WINS:
                # Server wins, mark as completed without changes
                await self._mark_sync_completed(item.id)
                return {
                    "success": True,
                    "conflict_resolved": True,
                    "resolution": "server_wins",
                    "server_data": server_data
                }
            
            elif item.conflict_resolution == ConflictResolution.CLIENT_WINS:
                # Client wins, force the operation
                result = await self._force_sync_operation(item)
                result["conflict_resolved"] = True
                result["resolution"] = "client_wins"
                return result
            
            elif item.conflict_resolution == ConflictResolution.MERGE:
                # Attempt to merge data
                merge_result = await self._merge_conflict_data(item, server_data)
                return merge_result
            
            elif item.conflict_resolution == ConflictResolution.MANUAL:
                # Mark for manual resolution
                await self._mark_sync_conflict(item.id, conflict_result)
                return {
                    "success": False,
                    "conflict_resolved": False,
                    "resolution": "manual_required",
                    "conflict_data": conflict_result
                }
            
        except Exception as e:
            logger.error(f"Error handling conflict: {e}")
            return {"success": False, "error": str(e)}
    
    async def _merge_conflict_data(self, item: SyncItem, server_data: Dict[str, Any]) -> Dict[str, Any]:
        """Attempt to merge conflicting data"""
        try:
            merged_data = {}
            
            # Start with server data as base
            merged_data.update(server_data)
            
            # Apply client changes that don't conflict with timestamps
            for key, value in item.data.items():
                if key not in ["id", "created_at", "updated_at"]:
                    # Use client value if it's different and more recent
                    if key not in server_data or server_data[key] != value:
                        merged_data[key] = value
            
            # Update timestamp to now
            merged_data["updated_at"] = datetime.now().isoformat()
            
            # Execute the merged update
            response = self.supabase.table(item.table_name).update(
                merged_data
            ).eq("id", item.record_id).execute()
            
            if response.data:
                await self._mark_sync_completed(item.id)
                return {
                    "success": True,
                    "conflict_resolved": True,
                    "resolution": "merged",
                    "merged_data": response.data[0]
                }
            else:
                return {"success": False, "error": "Merge operation failed"}
                
        except Exception as e:
            logger.error(f"Error merging conflict data: {e}")
            return {"success": False, "error": str(e)}
    
    # Incremental Sync Optimization
    
    async def _incremental_sync_optimizer(self):
        """Optimize sync operations with incremental updates"""
        while self.is_running:
            try:
                await self._optimize_incremental_sync()
                await asyncio.sleep(300)  # Run every 5 minutes
            except Exception as e:
                logger.error(f"Error in incremental sync optimizer: {e}")
                await asyncio.sleep(600)
    
    async def _optimize_incremental_sync(self):
        """Optimize sync operations by detecting incremental changes"""
        try:
            # Get users with pending sync items
            users_with_sync = await self._get_users_with_pending_sync()
            
            for user_id in users_with_sync:
                await self._optimize_user_sync(user_id)
                
        except Exception as e:
            logger.error(f"Error optimizing incremental sync: {e}")
    
    async def _optimize_user_sync(self, user_id: str):
        """Optimize sync for specific user"""
        try:
            # Get user's pending sync items
            user_items = await self._get_user_pending_sync_items(user_id)
            
            # Group by table and record
            table_groups = {}
            for item in user_items:
                key = f"{item.table_name}:{item.record_id}"
                if key not in table_groups:
                    table_groups[key] = []
                table_groups[key].append(item)
            
            # Optimize each group
            for key, items in table_groups.items():
                if len(items) > 1:
                    await self._consolidate_sync_items(items)
                    
        except Exception as e:
            logger.error(f"Error optimizing user sync: {e}")
    
    async def _consolidate_sync_items(self, items: List[SyncItem]):
        """Consolidate multiple sync items for same record"""
        try:
            # Sort by creation time
            items.sort(key=lambda x: x.created_at)
            
            # Keep only the latest operation
            latest_item = items[-1]
            older_items = items[:-1]
            
            # Mark older items as completed (superseded)
            for item in older_items:
                await self._mark_sync_completed(item.id, "superseded_by_newer_operation")
            
            logger.info(f"Consolidated {len(older_items)} sync items, keeping latest: {latest_item.id}")
            
        except Exception as e:
            logger.error(f"Error consolidating sync items: {e}")
    
    async def _get_users_with_pending_sync(self) -> List[str]:
        """Get list of user IDs who have pending sync items"""
        try:
            response = self.supabase.table("sync_queue").select("user_id").eq(
                "status", "pending"
            ).execute()
            
            if not response.data:
                return []
            
            # Get unique user IDs
            user_ids = list(set([item["user_id"] for item in response.data]))
            logger.info(f"Found {len(user_ids)} users with pending sync items")
            return user_ids
            
        except Exception as e:
            logger.error(f"Error getting users with pending sync: {e}")
            return []
    
    async def _get_user_pending_sync_items(self, user_id: str) -> List[SyncItem]:
        """Get pending sync items for a specific user"""
        try:
            response = self.supabase.table("sync_queue").select("*").eq(
                "user_id", user_id
            ).eq("status", "pending").order("created_at").execute()
            
            if not response.data:
                return []
            
            return [self._parse_sync_item(data) for data in response.data]
            
        except Exception as e:
            logger.error(f"Error getting user pending sync items: {e}")
            return []
    
    # Cleanup and Maintenance
    
    async def _sync_cleanup_processor(self):
        """Clean up old sync data"""
        while self.is_running:
            try:
                await self._cleanup_old_sync_data()
                await asyncio.sleep(86400)  # Run daily
            except Exception as e:
                logger.error(f"Error in sync cleanup processor: {e}")
                await asyncio.sleep(43200)
    
    async def _cleanup_old_sync_data(self):
        """Clean up old completed sync items"""
        try:
            # Delete completed sync items older than 30 days
            cutoff_date = datetime.now() - timedelta(days=30)
            
            response = self.supabase.table("sync_queue").delete().eq(
                "status", "completed"
            ).lte("processed_at", cutoff_date.isoformat()).execute()
            
            if response.data:
                logger.info(f"Cleaned up {len(response.data)} old sync items")
                
        except Exception as e:
            logger.error(f"Error cleaning up sync data: {e}")
    
    # Helper Methods
    
    async def _get_pending_sync_items(self) -> List[SyncItem]:
        """Get pending sync items"""
        try:
            response = self.supabase.table("sync_queue").select("*").eq(
                "status", "pending"
            ).order("created_at").limit(self.batch_size * self.max_concurrent_batches).execute()
            
            return [self._parse_sync_item(data) for data in response.data or []]
            
        except Exception as e:
            logger.error(f"Error getting pending sync items: {e}")
            return []
    
    def _group_items_by_user(self, items: List[SyncItem]) -> Dict[str, List[SyncItem]]:
        """Group sync items by user"""
        user_groups = {}
        for item in items:
            if item.user_id not in user_groups:
                user_groups[item.user_id] = []
            user_groups[item.user_id].append(item)
        return user_groups
    
    def _parse_sync_item(self, data: Dict[str, Any]) -> SyncItem:
        """Parse sync item from database data"""
        return SyncItem(
            id=data.get("id"),
            user_id=data.get("user_id"),
            table_name=data.get("table_name"),
            record_id=data.get("record_id"),
            operation=SyncOperation(data.get("operation")),
            data=json.loads(data.get("data", "{}")),
            conflict_resolution=ConflictResolution(data.get("conflict_resolution", "server_wins")),
            retry_count=data.get("retry_count", 0),
            max_retries=data.get("max_retries", 3),
            status=SyncStatus(data.get("status")),
            error_message=data.get("error_message"),
            created_at=datetime.fromisoformat(data.get("created_at").replace("Z", "+00:00")),
            processed_at=datetime.fromisoformat(data.get("processed_at").replace("Z", "+00:00")) if data.get("processed_at") else None
        )
    
    async def _update_sync_status(self, item_ids: List[str], status: SyncStatus):
        """Update sync status for multiple items"""
        try:
            update_data = {"status": status.value}
            if status == SyncStatus.PROCESSING:
                update_data["processed_at"] = datetime.now().isoformat()
            
            for item_id in item_ids:
                self.supabase.table("sync_queue").update(update_data).eq("id", item_id).execute()
                
        except Exception as e:
            logger.error(f"Error updating sync status: {e}")
    
    async def _mark_sync_completed(self, item_id: str, note: Optional[str] = None):
        """Mark sync item as completed"""
        try:
            update_data = {
                "status": "completed",
                "processed_at": datetime.now().isoformat()
            }
            if note:
                update_data["error_message"] = note
                
            self.supabase.table("sync_queue").update(update_data).eq("id", item_id).execute()
            
        except Exception as e:
            logger.error(f"Error marking sync completed: {e}")
    
    async def _mark_sync_failed(self, item_id: str, error_message: str):
        """Mark sync item as failed"""
        try:
            self.supabase.table("sync_queue").update({
                "status": "failed",
                "error_message": error_message,
                "processed_at": datetime.now().isoformat()
            }).eq("id", item_id).execute()
            
        except Exception as e:
            logger.error(f"Error marking sync failed: {e}")

# Global instance
advanced_sync_service = AdvancedSyncService()

async def start_advanced_sync_service():
    """Start the global advanced sync service"""
    await advanced_sync_service.start_service()

async def stop_advanced_sync_service():
    """Stop the global advanced sync service"""
    await advanced_sync_service.stop_service()

def get_advanced_sync_service() -> AdvancedSyncService:
    """Get advanced sync service instance"""
    return advanced_sync_service 