"""
Streak-related Pydantic models for Callivate API
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from uuid import UUID

class StreakBase(BaseModel):
    """Base streak model with common fields"""
    current_streak: int = Field(default=0, ge=0)
    longest_streak: int = Field(default=0, ge=0)
    last_completion_date: Optional[date] = None
    streak_start_date: Optional[date] = None
    total_completions: int = Field(default=0, ge=0)
    total_tasks: int = Field(default=0, ge=0)

class StreakUpdate(BaseModel):
    """Model for updating streak information"""
    current_streak: Optional[int] = Field(None, ge=0)
    longest_streak: Optional[int] = Field(None, ge=0)
    last_completion_date: Optional[date] = None
    streak_start_date: Optional[date] = None
    total_completions: Optional[int] = Field(None, ge=0)
    total_tasks: Optional[int] = Field(None, ge=0)

class Streak(StreakBase):
    """Complete streak model with all fields"""
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class StreakStats(BaseModel):
    """Model for streak statistics and calculations"""
    current_streak: int
    longest_streak: int
    completion_rate: float
    days_since_last_completion: int
    is_streak_active: bool
    streak_risk_level: str  # "low", "medium", "high"
    next_milestone: int
    days_to_milestone: int

class StreakCalendarDay(BaseModel):
    """Model for individual calendar day in streak view"""
    date: date
    status: str  # "completed", "missed", "pending", "future"
    task_count: int
    completion_count: int
    completion_rate: float

class StreakCalendar(BaseModel):
    """Model for monthly streak calendar"""
    year: int
    month: int
    days: list[StreakCalendarDay]
    monthly_stats: StreakStats
    streak_data: Streak

class StreakHistory(BaseModel):
    """Model for streak history over time"""
    date: date
    streak_value: int
    completion_count: int
    task_count: int
    milestone_reached: Optional[int] = None

class StreakMilestone(BaseModel):
    """Model for streak milestones"""
    value: int
    name: str
    description: str
    icon: str
    achieved: bool
    achieved_date: Optional[date] = None

class StreakResponse(BaseModel):
    """API response model for streak data"""
    streak: Streak
    stats: StreakStats
    milestones: list[StreakMilestone]
    recent_history: list[StreakHistory]
    
    class Config:
        from_attributes = True

class StreakBreakNotification(BaseModel):
    """Model for streak break notifications"""
    user_id: UUID
    previous_streak: int
    broken_date: date
    reason: str
    encouragement_message: str
    restart_suggestion: str 