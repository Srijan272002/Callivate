"""
Notification management endpoints for Callivate API
"""

from fastapi import APIRouter, HTTPException, status
from typing import List
from app.models.notification import NotificationLog, NotificationCreate

router = APIRouter()

@router.get("/{user_id}", response_model=List[NotificationLog])
async def get_user_notifications(user_id: str):
    """Get user's notification history"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Notification endpoints to be implemented"
    )

@router.post("/", response_model=NotificationLog)
async def send_notification(notification: NotificationCreate):
    """
    Send a notification via Expo (FREE)
    
    - Uses Expo push notifications by default (completely free)
    - No credit card or premium services required
    """
    from app.services.notification_service import NotificationService
    
    notification_service = NotificationService()
    
    try:
        result = await notification_service.send_task_reminder(
            user_id=str(notification.user_id),
            task_title=notification.title,
            device_token=notification.device_token or "mock-token"
        )
        
        # Return mock NotificationLog for now
        from datetime import datetime
        import uuid
        
        return {
            "id": uuid.uuid4(),
            "user_id": notification.user_id,
            "notification_type": notification.notification_type,
            "title": notification.title,
            "body": notification.body,
            "platform": notification.platform,
            "device_token": notification.device_token,
            "task_execution_id": notification.task_execution_id,
            "sent_at": datetime.now(),
            "delivery_status": "sent" if result["success"] else "failed",
            "error_message": result.get("error", None)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending notification: {str(e)}"
        ) 