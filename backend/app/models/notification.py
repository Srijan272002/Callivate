"""
Notification-related Pydantic models for Callivate API
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID

class NotificationBase(BaseModel):
    """Base notification model"""
    notification_type: Literal["push", "local", "call_fallback", "streak_break"]
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=1000)
    platform: Optional[Literal["ios", "android", "web"]] = None
    device_token: Optional[str] = None

class NotificationCreate(NotificationBase):
    """Model for creating notifications"""
    user_id: UUID
    task_execution_id: Optional[UUID] = None

class NotificationLog(NotificationBase):
    """Complete notification model"""
    id: UUID
    user_id: UUID
    task_execution_id: Optional[UUID] = None
    sent_at: datetime
    delivery_status: Literal["pending", "sent", "delivered", "failed"] = "pending"
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True 