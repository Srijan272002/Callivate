"""
Task-related Pydantic models for Callivate API
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime, date, time
from uuid import UUID

class TaskBase(BaseModel):
    """Base task model with common fields"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    scheduled_time: time
    scheduled_date: Optional[date] = None
    recurrence_type: Literal["none", "daily", "weekly", "custom"] = "none"
    recurrence_pattern: Optional[Dict[str, Any]] = None
    voice_id: Optional[str] = None
    silent_mode: bool = False

class TaskCreate(TaskBase):
    """Model for creating a new task"""
    pass

class TaskUpdate(BaseModel):
    """Model for updating a task"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    scheduled_time: Optional[time] = None
    scheduled_date: Optional[date] = None
    recurrence_type: Optional[Literal["none", "daily", "weekly", "custom"]] = None
    recurrence_pattern: Optional[Dict[str, Any]] = None
    voice_id: Optional[str] = None
    silent_mode: Optional[bool] = None
    is_active: Optional[bool] = None

class Task(TaskBase):
    """Complete task model with all fields"""
    id: UUID
    user_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_completed_at: Optional[datetime] = None
    next_scheduled_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class TaskExecutionBase(BaseModel):
    """Base task execution model"""
    scheduled_at: datetime
    status: Literal["pending", "completed", "missed", "failed", "skipped"] = "pending"
    completion_method: Optional[Literal["call", "notification", "manual"]] = None
    call_duration: Optional[int] = None  # in seconds
    follow_up_attempted: bool = False
    follow_up_at: Optional[datetime] = None
    response_text: Optional[str] = None

class TaskExecutionCreate(TaskExecutionBase):
    """Model for creating a task execution"""
    task_id: UUID
    user_id: UUID

class TaskExecutionUpdate(BaseModel):
    """Model for updating task execution"""
    executed_at: Optional[datetime] = None
    status: Optional[Literal["pending", "completed", "missed", "failed", "skipped"]] = None
    completion_method: Optional[Literal["call", "notification", "manual"]] = None
    call_duration: Optional[int] = None
    follow_up_attempted: Optional[bool] = None
    follow_up_at: Optional[datetime] = None
    response_text: Optional[str] = None

class TaskExecution(TaskExecutionBase):
    """Complete task execution model"""
    id: UUID
    task_id: UUID
    user_id: UUID
    executed_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class TaskWithExecution(Task):
    """Task model with latest execution included"""
    latest_execution: Optional[TaskExecution] = None

class TaskResponse(BaseModel):
    """API response model for task data"""
    task: Task
    executions: list[TaskExecution] = []
    
    class Config:
        from_attributes = True

class TaskStats(BaseModel):
    """Model for task statistics"""
    total_tasks: int
    completed_today: int
    pending_today: int
    current_streak: int
    completion_rate: float
    
class DailyTaskSummary(BaseModel):
    """Model for daily task summary"""
    date: date
    tasks: list[TaskWithExecution]
    completion_rate: float
    total_tasks: int
    completed_tasks: int 