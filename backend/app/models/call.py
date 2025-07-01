"""
Call-related Pydantic models for Callivate API
Handles AI voice calls via Twilio
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal, List, Dict, Any
from datetime import datetime
from uuid import UUID

class CallBase(BaseModel):
    """Base call model"""
    user_id: UUID
    task_id: UUID
    user_phone: str = Field(..., min_length=10, max_length=20)
    task_title: str = Field(..., min_length=1, max_length=200)
    call_type: Literal["task_reminder", "follow_up", "streak_check"] = "task_reminder"
    scheduled_time: datetime

class CallCreate(CallBase):
    """Model for scheduling a new call"""
    pass

class CallUpdate(BaseModel):
    """Model for updating call information"""
    status: Optional[Literal["scheduled", "in_progress", "completed", "failed", "no_answer"]] = None
    call_duration: Optional[int] = None  # seconds
    user_response: Optional[str] = None
    task_completed: Optional[bool] = None
    ai_confidence: Optional[float] = None
    follow_up_needed: Optional[bool] = None

class Call(CallBase):
    """Complete call model"""
    id: UUID
    call_sid: Optional[str] = None  # Twilio call SID
    status: Literal["scheduled", "in_progress", "completed", "failed", "no_answer"] = "scheduled"
    call_duration: Optional[int] = None  # seconds
    user_response: Optional[str] = None
    task_completed: Optional[bool] = None
    ai_confidence: Optional[float] = None
    follow_up_needed: Optional[bool] = None
    cost: Optional[float] = None  # Backend cost (not user cost)
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class CallResponse(BaseModel):
    """API response for call operations"""
    call: Call
    message: str
    estimated_cost: float = 0.0085  # ~$0.0085 per minute
    user_cost: float = 0.0  # Always free for users

class CallScheduleRequest(BaseModel):
    """Request model for scheduling calls"""
    user_id: UUID
    task_id: UUID
    user_phone: str = Field(..., min_length=10, max_length=20)
    task_title: str = Field(..., min_length=1, max_length=200)
    preferred_time: Optional[datetime] = None
    call_type: Literal["task_reminder", "follow_up", "streak_check"] = "task_reminder"

class CallTwiMLRequest(BaseModel):
    """Request model for TwiML generation"""
    task_title: str
    user_name: str
    call_sid: str
    user_phone: str

class CallWebhookData(BaseModel):
    """Model for Twilio webhook data"""
    call_sid: str
    call_status: str
    call_duration: Optional[str] = None
    recording_url: Optional[str] = None
    speech_result: Optional[str] = None
    
class CallAnalytics(BaseModel):
    """Model for call analytics"""
    total_calls: int
    successful_calls: int
    success_rate: float
    average_duration: float
    task_completion_rate: float
    cost_per_month: float
    user_satisfaction: Optional[float] = None

class CallRecording(BaseModel):
    """Model for call recordings"""
    recording_sid: str
    call_sid: str
    duration: int
    status: str
    uri: str
    transcription: Optional[str] = None
    date_created: datetime

class CallTranscription(BaseModel):
    """Model for call transcriptions"""
    call_sid: str
    transcription_text: str
    confidence_score: float
    language: str = "en-US"
    speaker_labels: Optional[List[str]] = None
    sentiment_analysis: Optional[Dict[str, Any]] = None 