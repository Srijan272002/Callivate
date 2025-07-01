"""
Core configuration for Callivate FastAPI backend
Manages environment variables and application settings
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List, Optional
import os

class Settings(BaseSettings):
    """Application settings and configuration"""
    
    # Application
    DEBUG: bool = False
    APP_NAME: str = "Callivate API"
    VERSION: str = "1.0.0"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Database - Supabase (REQUIRED)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    DATABASE_URL: str = ""
    
    # Authentication (Simplified - Supabase handles OAuth)
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Twilio Configuration (Required for AI Voice Calls)
    TWILIO_ACCOUNT_SID: str = Field(default="", env="TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN: str = Field(default="", env="TWILIO_AUTH_TOKEN") 
    TWILIO_PHONE_NUMBER: str = Field(default="", env="TWILIO_PHONE_NUMBER")
    
    # AI Services (REQUIRED)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash-exp"
    
    # Voice Services (FREE ALTERNATIVES)
    # Browser Web Speech API (free) - no API key needed
    USE_BROWSER_TTS: bool = True
    
    # Optional: ElevenLabs (has free tier)
    ELEVENLABS_API_KEY: Optional[str] = None
    
    # Optional: OpenAI TTS (requires payment)
    OPENAI_API_KEY: Optional[str] = None
    
    # Optional: Google Services (requires credit card)
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    GOOGLE_PROJECT_ID: str = ""
    GOOGLE_TTS_API_KEY: Optional[str] = None
    
    # Call Services (Optional - can use notifications instead)
    # Note: Twilio config is also defined above as required for AI calling
    
    # Push Notifications (FREE - Expo)
    EXPO_ACCESS_TOKEN: Optional[str] = None  # Optional, for advanced features
    USE_EXPO_NOTIFICATIONS: bool = True
    
    # Firebase (Optional alternative)
    FIREBASE_SERVICE_ACCOUNT_KEY_PATH: Optional[str] = None
    
    # Redis (Background Tasks) - Can use local Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Privacy and Security
    MAX_CONTENT_LENGTH: int = 10 * 1024 * 1024  # 10MB
    INAPPROPRIATE_CONTENT_FILTER: bool = True
    
    # Task Processing
    MAX_FOLLOW_UP_ATTEMPTS: int = 1
    CALL_SKIP_THRESHOLD_MINUTES: int = 5
    
    # Analytics
    ANALYTICS_RETENTION_DAYS: int = 365
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

# Global settings instance
settings = Settings()

# Validate required settings (simplified)
def validate_settings():
    """Validate that only essential settings are configured"""
    required_settings = [
        "SUPABASE_URL",
        "SUPABASE_KEY", 
        "GEMINI_API_KEY",  # Only essential for AI conversations
    ]
    
    missing = []
    for setting in required_settings:
        if not getattr(settings, setting):
            missing.append(setting)
    
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

# Development vs Production configurations
if settings.DEBUG:
    # Development settings
    settings.ALLOWED_HOSTS = ["*"]
    print("🔧 Development mode: Using free alternatives")
    print(f"   - TTS: {'Browser Web Speech API (Free)' if settings.USE_BROWSER_TTS else 'External service'}")
    print(f"   - Push: {'Expo Notifications (Free)' if settings.USE_EXPO_NOTIFICATIONS else 'External service'}")
else:
    # Production settings - restrict CORS
    validate_settings() 