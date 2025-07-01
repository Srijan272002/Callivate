"""
Analytics-related Pydantic models for Callivate API
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID

class AnalyticsBase(BaseModel):
    """Base analytics model with common fields"""
    month_year: str = Field(..., pattern="^[0-9]{4}-[0-9]{2}$")
    tasks_completed: int = Field(default=0, ge=0)
    tasks_missed: int = Field(default=0, ge=0)
    completion_rate: float = Field(default=0.0, ge=0.0, le=100.0)
    longest_streak: int = Field(default=0, ge=0)
    most_used_voice_id: Optional[str] = None
    total_call_duration: int = Field(default=0, ge=0)

class Analytics(AnalyticsBase):
    """Complete analytics model with all fields"""
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class AnalyticsResponse(BaseModel):
    """API response model for analytics data"""
    monthly_data: Analytics
    trends: Dict[str, Any]
    comparisons: Dict[str, Any]
    insights: list[str]
    
    class Config:
        from_attributes = True 