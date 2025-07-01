"""
Voice-related Pydantic models for Callivate API
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime
from uuid import UUID

class VoiceBase(BaseModel):
    """Base voice model with common fields"""
    id: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=200)
    provider: Literal["browser", "google", "elevenlabs", "openai"]
    category: Literal["standard", "premium", "neural"] = "standard"
    language_code: str = "en-US"
    gender: Optional[Literal["male", "female", "neutral"]] = None
    personality: List[str] = Field(default_factory=list)
    sample_text: Optional[str] = None
    is_premium: bool = False
    is_active: bool = True

class VoiceCreate(VoiceBase):
    """Model for creating a new voice"""
    pass

class VoiceUpdate(BaseModel):
    """Model for updating voice information"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[Literal["standard", "premium", "neural"]] = None
    language_code: Optional[str] = None
    gender: Optional[Literal["male", "female", "neutral"]] = None
    personality: Optional[List[str]] = None
    sample_text: Optional[str] = None
    is_premium: Optional[bool] = None
    is_active: Optional[bool] = None

class Voice(VoiceBase):
    """Complete voice model with all fields"""
    created_at: datetime
    
    class Config:
        from_attributes = True

class VoiceResponse(BaseModel):
    """API response model for voice data"""
    voices: List[Voice]
    total: int
    premium_count: int
    providers: List[str]
    
class VoicePreview(BaseModel):
    """Model for voice preview requests"""
    voice_id: str
    text: Optional[str] = "This is an AI-generated call from Callivate. Have you completed your task today?"
    
class VoicePreviewResponse(BaseModel):
    """Response model for voice preview"""
    voice_id: str
    audio_url: str
    duration: float  # in seconds
    expires_at: datetime

class VoiceFilter(BaseModel):
    """Model for filtering voices"""
    provider: Optional[Literal["browser", "google", "elevenlabs", "openai"]] = None
    category: Optional[Literal["standard", "premium", "neural"]] = None
    gender: Optional[Literal["male", "female", "neutral"]] = None
    personality: Optional[List[str]] = None
    language_code: Optional[str] = None
    is_premium: Optional[bool] = None
    is_free_only: bool = False

class VoiceUsageStats(BaseModel):
    """Model for voice usage statistics"""
    voice_id: str
    voice_name: str
    usage_count: int
    last_used: Optional[datetime] = None
    avg_call_duration: Optional[float] = None
    user_rating: Optional[float] = None

class UserVoicePreferences(BaseModel):
    """Model for user's voice preferences"""
    user_id: UUID
    favorite_voices: List[str] = Field(default_factory=list)
    blocked_voices: List[str] = Field(default_factory=list)
    preferred_gender: Optional[Literal["male", "female", "neutral"]] = None
    preferred_personality: List[str] = Field(default_factory=list)
    auto_select_voice: bool = False
    
class VoiceRecommendation(BaseModel):
    """Model for voice recommendations"""
    voice: Voice
    match_score: float
    reasons: List[str]
    is_suggested: bool = True 