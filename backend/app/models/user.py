"""
User-related Pydantic models for Callivate API
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class UserBase(BaseModel):
    """Base user model with common fields"""
    email: EmailStr
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: str = "UTC"

class UserCreate(UserBase):
    """Model for creating a new user"""
    onboarding_completed: bool = False

class UserUpdate(BaseModel):
    """Model for updating user information"""
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: Optional[str] = None
    onboarding_completed: Optional[bool] = None

class User(UserBase):
    """Complete user model with all fields"""
    id: UUID
    created_at: datetime
    updated_at: datetime
    last_login: datetime
    onboarding_completed: bool
    
    class Config:
        from_attributes = True

class UserSettingsBase(BaseModel):
    """Base user settings model"""
    default_voice_id: str = "google-wavenet-en-us-1"
    voice_provider: str = Field(default="google", pattern="^(google|elevenlabs|openai)$")
    silent_mode: bool = False
    notification_enabled: bool = True
    notification_sound: bool = True
    time_format: str = Field(default="12h", pattern="^(12h|24h)$")

class UserSettingsCreate(UserSettingsBase):
    """Model for creating user settings"""
    user_id: UUID

class UserSettingsUpdate(BaseModel):
    """Model for updating user settings"""
    default_voice_id: Optional[str] = None
    voice_provider: Optional[str] = Field(None, pattern="^(google|elevenlabs|openai)$")
    silent_mode: Optional[bool] = None
    notification_enabled: Optional[bool] = None
    notification_sound: Optional[bool] = None
    time_format: Optional[str] = Field(None, pattern="^(12h|24h)$")

class UserSettings(UserSettingsBase):
    """Complete user settings model"""
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class UserWithSettings(User):
    """User model with settings included"""
    settings: Optional[UserSettings] = None

class UserResponse(BaseModel):
    """API response model for user data"""
    user: User
    settings: Optional[UserSettings] = None
    
    class Config:
        from_attributes = True 