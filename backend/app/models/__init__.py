"""
Callivate Database Models Package
Contains Pydantic models for API request/response schemas
"""

from .user import User, UserCreate, UserUpdate, UserSettings, UserSettingsUpdate
from .task import Task, TaskCreate, TaskUpdate, TaskExecution, TaskExecutionCreate
from .voice import Voice, VoiceResponse  
from .note import Note, NoteCreate, NoteUpdate
from .streak import Streak, StreakUpdate
from .analytics import Analytics, AnalyticsResponse
from .sync import SyncQueue, SyncQueueCreate
from .notification import NotificationLog, NotificationCreate
from .call import Call, CallCreate, CallUpdate, CallResponse, CallScheduleRequest

__all__ = [
    # User models
    "User",
    "UserCreate", 
    "UserUpdate",
    "UserSettings",
    "UserSettingsUpdate",
    
    # Task models
    "Task",
    "TaskCreate",
    "TaskUpdate", 
    "TaskExecution",
    "TaskExecutionCreate",
    
    # Voice models
    "Voice",
    "VoiceResponse",
    
    # Note models
    "Note",
    "NoteCreate",
    "NoteUpdate",
    
    # Streak models
    "Streak",
    "StreakUpdate",
    
    # Analytics models
    "Analytics",
    "AnalyticsResponse",
    
    # Sync models
    "SyncQueue",
    "SyncQueueCreate",
    
    # Notification models
    "NotificationLog",
    "NotificationCreate",
    
    # Call models
    "Call",
    "CallCreate",
    "CallUpdate",
    "CallResponse",
    "CallScheduleRequest",
] 