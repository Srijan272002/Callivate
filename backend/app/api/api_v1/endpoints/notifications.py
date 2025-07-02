"""
Advanced Notification Management Endpoints for Callivate API
Implements 6.6 Advanced Notification System features
"""

from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import pytz
from app.models.notification import NotificationLog, NotificationCreate
from app.services.notification_service import AdvancedNotificationService, NotificationBatch
from app.core.database import get_supabase

router = APIRouter()

@router.get("/{user_id}/history", response_model=List[NotificationLog])
async def get_user_notification_history(
    user_id: str,
    limit: Optional[int] = 50,
    offset: Optional[int] = 0,
    notification_type: Optional[str] = None
):
    """Get user's notification delivery history with filtering"""
    try:
        supabase = get_supabase()
        
        query = supabase.table("notification_logs").select("*").eq("user_id", user_id)
        
        if notification_type:
            query = query.eq("notification_type", notification_type)
        
        result = query.order("sent_at", desc=True).limit(limit).offset(offset).execute()
        
        return result.data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching notification history: {str(e)}"
        )

@router.post("/send", response_model=Dict[str, Any])
async def send_notification(notification: NotificationCreate):
    """
    Send a notification with advanced features:
    - Smart timing optimization
    - Delivery tracking via Supabase
    - Fallback coordination
    """
    try:
        notification_service = AdvancedNotificationService()
        
        # Enhanced notification sending with tracking
        if notification.notification_type == "task_reminder":
            result = await notification_service.send_task_reminder(
                user_id=str(notification.user_id),
                task_id=str(notification.task_execution_id) if notification.task_execution_id else "unknown",
                task_title=notification.title,
                device_token=notification.device_token or "mock-token"
            )
        elif notification.notification_type == "follow_up":
            result = await notification_service.send_follow_up_notification(
                user_id=str(notification.user_id),
                task_id=str(notification.task_execution_id) if notification.task_execution_id else "unknown",
                task_title=notification.title,
                device_token=notification.device_token or "mock-token"
            )
        else:
            # Default notification sending
            result = await notification_service._send_expo_notification({
                "user_id": str(notification.user_id),
                "type": notification.notification_type,
                "title": notification.title,
                "body": notification.body,
                "device_token": notification.device_token or "mock-token",
                "data": {"userId": str(notification.user_id)}
            })
        
        return {
            "success": result.get("success", False),
            "provider": result.get("provider", "unknown"),
            "message": result.get("message", "Notification processed"),
            "cost": result.get("cost", 0.0),
            "delivery_tracking": True
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending notification: {str(e)}"
        )

@router.post("/batch", response_model=Dict[str, Any])
async def send_batch_notifications(
    batch_data: Dict[str, Any],
    background_tasks: BackgroundTasks
):
    """
    Send batch notifications efficiently using Expo's batch API
    """
    try:
        notification_service = AdvancedNotificationService()
        
        # Create notification batch
        batch = NotificationBatch(
            id=batch_data.get("id", f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"),
            user_id=batch_data.get("user_id", "system"),
            notifications=batch_data.get("notifications", []),
            scheduled_for=datetime.now(pytz.UTC),
            timezone=batch_data.get("timezone", "UTC"),
            batch_type=batch_data.get("batch_type", "manual")
        )
        
        # Process batch in background
        background_tasks.add_task(
            notification_service.send_batch_notifications,
            batch
        )
        
        return {
            "success": True,
            "batch_id": batch.id,
            "notification_count": len(batch.notifications),
            "message": "Batch processing started",
            "estimated_completion": (datetime.now() + timedelta(minutes=2)).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing batch notifications: {str(e)}"
        )

@router.post("/schedule-daily-motivation", response_model=Dict[str, Any])
async def schedule_daily_motivation_batch(
    timezone_data: Dict[str, List[str]],
    background_tasks: BackgroundTasks
):
    """
    Schedule daily motivation notifications in batches by timezone
    """
    try:
        notification_service = AdvancedNotificationService()
        
        # Schedule motivation batches in background
        background_tasks.add_task(
            notification_service.schedule_daily_motivation_batch,
            timezone_data
        )
        
        total_users = sum(len(users) for users in timezone_data.values())
        
        return {
            "success": True,
            "timezones_processed": len(timezone_data),
            "total_users": total_users,
            "message": "Daily motivation batches scheduled",
            "cost": 0.0  # Expo is free
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error scheduling daily motivation: {str(e)}"
        )

@router.get("/analytics/{user_id}", response_model=Dict[str, Any])
async def get_notification_analytics(
    user_id: str,
    days: Optional[int] = 30
):
    """
    Get notification delivery analytics for user
    """
    try:
        supabase = get_supabase()
        
        # Calculate date range
        end_date = datetime.now(pytz.UTC)
        start_date = end_date - timedelta(days=days)
        
        # Get notification logs
        result = supabase.table("notification_logs").select(
            "notification_type, delivery_status, sent_at"
        ).eq("user_id", user_id).gte(
            "sent_at", start_date.isoformat()
        ).lte(
            "sent_at", end_date.isoformat()
        ).execute()
        
        logs = result.data
        
        # Calculate analytics
        total_notifications = len(logs)
        successful_deliveries = len([log for log in logs if log["delivery_status"] == "sent"])
        failed_deliveries = len([log for log in logs if log["delivery_status"] == "failed"])
        
        # Type breakdown
        type_breakdown = {}
        for log in logs:
            notification_type = log["notification_type"]
            if notification_type not in type_breakdown:
                type_breakdown[notification_type] = {"sent": 0, "failed": 0}
            
            if log["delivery_status"] == "sent":
                type_breakdown[notification_type]["sent"] += 1
            elif log["delivery_status"] == "failed":
                type_breakdown[notification_type]["failed"] += 1
        
        delivery_rate = (successful_deliveries / total_notifications * 100) if total_notifications > 0 else 0
        
        return {
            "period_days": days,
            "total_notifications": total_notifications,
            "successful_deliveries": successful_deliveries,
            "failed_deliveries": failed_deliveries,
            "delivery_rate_percent": round(delivery_rate, 2),
            "type_breakdown": type_breakdown,
            "cost_savings": {
                "expo_notifications_used": successful_deliveries,
                "estimated_cost_savings": successful_deliveries * 0.01,  # Estimated $0.01 per notification saved
                "provider": "Expo (FREE)"
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching notification analytics: {str(e)}"
        )

@router.get("/scheduled/{user_id}", response_model=List[Dict[str, Any]])
async def get_scheduled_notifications(user_id: str):
    """Get user's scheduled notifications"""
    try:
        supabase = get_supabase()
        
        result = supabase.table("scheduled_notifications").select("*").eq(
            "user_id", user_id
        ).eq("status", "scheduled").order("scheduled_for", desc=False).execute()
        
        return result.data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching scheduled notifications: {str(e)}"
        )

@router.delete("/scheduled/{notification_id}", response_model=Dict[str, Any])
async def cancel_scheduled_notification(notification_id: str):
    """Cancel a scheduled notification"""
    try:
        supabase = get_supabase()
        
        result = supabase.table("scheduled_notifications").update({
            "status": "cancelled"
        }).eq("id", notification_id).execute()
        
        if result.data:
            return {
                "success": True,
                "message": "Notification cancelled successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scheduled notification not found"
            )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cancelling notification: {str(e)}"
        )

@router.post("/device-token", response_model=Dict[str, Any])
async def register_device_token(
    device_data: Dict[str, str]
):
    """Register or update user's device token for push notifications"""
    try:
        supabase = get_supabase()
        
        user_id = device_data.get("user_id")
        device_token = device_data.get("device_token")
        device_type = device_data.get("device_type", "unknown")
        device_name = device_data.get("device_name", "Unknown Device")
        
        if not user_id or not device_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user_id and device_token are required"
            )
        
        # Upsert device token
        device_record = {
            "user_id": user_id,
            "device_token": device_token,
            "device_type": device_type,
            "device_name": device_name,
            "is_active": True,
            "last_used_at": datetime.now(pytz.UTC).isoformat()
        }
        
        result = supabase.table("user_devices").upsert(device_record).execute()
        
        return {
            "success": True,
            "message": "Device token registered successfully",
            "device_id": result.data[0]["id"] if result.data else None
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error registering device token: {str(e)}"
        )

@router.get("/settings/{user_id}", response_model=Dict[str, Any])
async def get_notification_settings(user_id: str):
    """Get user's notification settings for smart timing"""
    try:
        supabase = get_supabase()
        
        result = supabase.table("user_notification_settings").select("*").eq(
            "user_id", user_id
        ).execute()
        
        if result.data:
            return result.data[0]
        else:
            # Return default settings
            return {
                "user_id": user_id,
                "notification_start_hour": 7,
                "notification_end_hour": 22,
                "avoid_quiet_hours": True,
                "follow_up_delay_minutes": 30,
                "batch_notifications": True,
                "smart_timing_enabled": True,
                "motivation_notifications": True,
                "streak_notifications": True
            }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching notification settings: {str(e)}"
        )

@router.put("/settings/{user_id}", response_model=Dict[str, Any])
async def update_notification_settings(
    user_id: str,
    settings: Dict[str, Any]
):
    """Update user's notification settings for smart timing"""
    try:
        supabase = get_supabase()
        
        settings_record = {
            **settings,
            "user_id": user_id,
            "updated_at": datetime.now(pytz.UTC).isoformat()
        }
        
        result = supabase.table("user_notification_settings").upsert(settings_record).execute()
        
        return {
            "success": True,
            "message": "Notification settings updated successfully",
            "settings": result.data[0] if result.data else settings_record
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating notification settings: {str(e)}"
        ) 