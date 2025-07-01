"""
Sync-related Pydantic models for Callivate API
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime
from uuid import UUID

class SyncQueueBase(BaseModel):
    """Base sync queue model"""
    table_name: str
    record_id: UUID
    operation: Literal["create", "update", "delete"]
    data: Optional[Dict[str, Any]] = None
    conflict_resolution: Literal["server_wins", "client_wins", "merge"] = "server_wins"

class SyncQueueCreate(SyncQueueBase):
    """Model for creating sync queue item"""
    user_id: UUID

class SyncQueue(SyncQueueBase):
    """Complete sync queue model"""
    id: UUID
    user_id: UUID
    retry_count: int = 0
    max_retries: int = 3
    status: Literal["pending", "processing", "completed", "failed"] = "pending"
    error_message: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True 