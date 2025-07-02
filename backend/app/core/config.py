"""
Core configuration for Callivate FastAPI backend
Manages environment variables and application settings
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List, Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    """Application settings and configuration"""
    
    # Application
    DEBUG: bool = False
    APP_NAME: str = "Callivate API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Server Configuration
    HOST: str = Field(default="0.0.0.0", alias="SERVER_HOST")
    PORT: int = Field(default=8000, alias="SERVER_PORT")
    ALLOWED_HOSTS: List[str] = Field(default=["*"])
    ALLOWED_ORIGINS: List[str] = Field(default=["*"])
    
    # Database - Supabase (REQUIRED)
    SUPABASE_URL: str
    # Support both old (SUPABASE_KEY) and new (SUPABASE_ANON_KEY) names for backward compatibility
    SUPABASE_ANON_KEY: str = Field(alias="SUPABASE_KEY")
    SUPABASE_SERVICE_ROLE_KEY: str
    
    # Authentication (Simplified - Supabase handles OAuth)
    # Support both old (SECRET_KEY) and new (JWT_SECRET_KEY) names for backward compatibility
    JWT_SECRET_KEY: str = Field(default="your-secret-key-change-in-production", alias="SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Twilio Configuration (Required for AI Voice Calls)
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    # Support both old (TWILIO_PHONE_NUMBER) and new (TWILIO_FROM_PHONE) names
    TWILIO_FROM_PHONE: Optional[str] = Field(default=None, alias="TWILIO_PHONE_NUMBER")
    TWILIO_WEBHOOK_URL: Optional[str] = None
    
    # AI Services (REQUIRED)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.0-flash-exp"
    GEMINI_MAX_TOKENS: int = 1000
    GEMINI_TEMPERATURE: float = 0.7
    
    # Voice Services (FREE ALTERNATIVES)
    # Browser Web Speech API (free) - no API key needed
    USE_BROWSER_TTS: bool = True
    BROWSER_TTS_DEFAULT_RATE: float = 0.9
    BROWSER_TTS_DEFAULT_PITCH: float = 1.0
    BROWSER_TTS_DEFAULT_VOLUME: float = 1.0
    
    # Optional: ElevenLabs (has free tier)
    ELEVENLABS_API_KEY: Optional[str] = None
    ELEVENLABS_MODEL_ID: str = "eleven_monolingual_v1"
    ELEVENLABS_VOICE_STABILITY: float = 0.75
    ELEVENLABS_VOICE_SIMILARITY: float = 0.75
    
    # Optional: OpenAI TTS (requires payment)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_TTS_MODEL: str = "tts-1"
    OPENAI_TTS_VOICE: str = "alloy"
    OPENAI_TTS_SPEED: float = 1.0
    
    # Optional: Google Services (requires credit card)
    GOOGLE_TTS_API_KEY: Optional[str] = None
    GOOGLE_TTS_LANGUAGE_CODE: str = "en-US"
    GOOGLE_TTS_VOICE_NAME: str = "en-US-Wavenet-D"
    GOOGLE_TTS_AUDIO_ENCODING: str = "MP3"
    
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
    ANALYTICS_RETENTION_DAYS: int = 90
    
    # Application Settings
    BASE_URL: str = "http://localhost:8000"  # Update for production
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Call System Configuration
    MAX_CALL_DURATION: int = 180  # 3 minutes
    SPEECH_TIMEOUT: int = 5  # seconds
    CALL_RETRY_ATTEMPTS: int = 2
    DEFAULT_CALL_VOICE: str = "alice"  # Twilio voice
    
    # AI Configuration
    AI_RESPONSE_MAX_LENGTH: int = 30  # words
    AI_CONFIDENCE_THRESHOLD: float = 0.6
    AI_FALLBACK_ENABLED: bool = True
    
    # Cost Management
    ESTIMATED_CALL_COST_PER_MINUTE: float = 0.0085  # USD
    USER_COST: float = 0.0  # Always free for users
    COST_ALERTS_ENABLED: bool = True
    MONTHLY_COST_LIMIT: float = 1000.0  # USD
    
    # Analytics & Logging
    ENABLE_CALL_RECORDING: bool = True
    ENABLE_CALL_TRANSCRIPTION: bool = True
    LOG_LEVEL: str = "INFO"
    
    # Security
    WEBHOOK_SECRET: Optional[str] = None
    RATE_LIMIT_CALLS_PER_MINUTE: int = 10
    ALLOWED_PHONE_COUNTRIES: List[str] = ["+1"]  # US/Canada
    
    # Feature Flags
    ENABLE_AI_CALLING: bool = True
    ENABLE_PREMIUM_VOICES: bool = True
    ENABLE_VOICE_ANALYTICS: bool = True
    ENABLE_CALL_SCHEDULING: bool = True
    
    # Background Services Configuration
    BACKGROUND_SERVICES_ENABLED: bool = Field(True, description="Enable background services")
    TASK_ENGINE_BATCH_SIZE: int = Field(50, description="Task execution batch size")
    ANALYTICS_GENERATION_HOUR: int = Field(2, description="Hour to run analytics generation (0-23)")
    SYNC_BATCH_SIZE: int = Field(100, description="Sync processing batch size")
    CLEANUP_RETENTION_DAYS: int = Field(90, description="Data retention period in days")

    # Real-time Configuration
    REALTIME_ENABLED: bool = Field(True, description="Enable real-time features")
    REALTIME_CHANNEL_TIMEOUT: int = Field(3600, description="Real-time channel timeout in seconds")
    REALTIME_MAX_CONNECTIONS: int = Field(1000, description="Maximum real-time connections")

    # Privacy & Security Configuration
    CONTENT_FILTER_LEVEL: str = Field("medium", description="Content filtering level (low/medium/high)")
    RATE_LIMIT_ENABLED: bool = Field(True, description="Enable rate limiting")
    DEFAULT_RATE_LIMIT: int = Field(100, description="Default rate limit per hour")
    VOICE_CLEANUP_DELAY_HOURS: int = Field(24, description="Voice recording cleanup delay")
    IP_BLOCKING_ENABLED: bool = Field(True, description="Enable IP blocking")

    # Task Execution Configuration
    TASK_EXECUTION_GRACE_PERIOD_HOURS: int = Field(2, description="Grace period before marking tasks as missed")
    FOLLOW_UP_DELAY_MINUTES: int = Field(30, description="Follow-up reminder delay")
    CALLING_TIME_START: int = Field(7, description="Earliest calling hour (0-23)")
    CALLING_TIME_END: int = Field(22, description="Latest calling hour (0-23)")

    # Analytics Configuration
    ANALYTICS_BATCH_SIZE: int = Field(1000, description="Analytics processing batch size")
    SYSTEM_METRICS_RETENTION_DAYS: int = Field(30, description="System metrics retention")
    USER_ANALYTICS_RETENTION_MONTHS: int = Field(24, description="User analytics retention")

    # Sync Configuration
    SYNC_CONFLICT_RESOLUTION: str = Field("server_wins", description="Default conflict resolution strategy")
    SYNC_MAX_RETRIES: int = Field(3, description="Maximum sync retry attempts")
    SYNC_RETRY_DELAY_SECONDS: int = Field(300, description="Sync retry delay")
    INCREMENTAL_SYNC_ENABLED: bool = Field(True, description="Enable incremental sync optimization")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        # Allow extra fields for backward compatibility
        extra = "ignore"
        # Populate by name ensures aliases work correctly
        populate_by_name = True

    @property
    def is_ai_configured(self) -> bool:
        """Check if AI services are properly configured"""
        return bool(self.GEMINI_API_KEY)
    
    @property
    def is_calling_configured(self) -> bool:
        """Check if calling services are properly configured"""
        return bool(
            self.TWILIO_ACCOUNT_SID 
            and self.TWILIO_AUTH_TOKEN 
            and self.TWILIO_FROM_PHONE
        )
    
    @property
    def available_voice_providers(self) -> List[str]:
        """Get list of available voice providers"""
        providers = ["browser"]  # Always available
        
        if self.ELEVENLABS_API_KEY:
            providers.append("elevenlabs")
        if self.OPENAI_API_KEY:
            providers.append("openai")
        if self.GOOGLE_TTS_API_KEY:
            providers.append("google")
            
        return providers
    
    @property
    def voice_system_status(self) -> dict:
        """Get comprehensive voice system status"""
        return {
            "ai_configured": self.is_ai_configured,
            "calling_configured": self.is_calling_configured,
            "voice_providers": self.available_voice_providers,
            "features_available": {
                "ai_calling": self.is_ai_configured and self.is_calling_configured,
                "voice_synthesis": True,  # Browser TTS always works
                "premium_voices": len(self.available_voice_providers) > 1,
                "call_analytics": True,
                "ai_scripts": self.is_ai_configured
            },
            "cost_status": {
                "user_cost": self.USER_COST,
                "estimated_call_cost": self.ESTIMATED_CALL_COST_PER_MINUTE,
                "free_features": ["browser_tts", "ai_scripts", "basic_calling"]
            }
        }

# Backward compatibility helper function
def _get_env_value(primary_key: str, fallback_key: str = None, default: str = None) -> str:
    """Get environment variable with fallback for backward compatibility"""
    import os
    value = os.getenv(primary_key)
    if value is None and fallback_key:
        value = os.getenv(fallback_key)
    if value is None and default:
        value = default
    return value

# Global settings instance
try:
    settings = Settings()
except Exception as e:
    # Handle missing environment variables gracefully
    import os
    print(f"⚠️  Configuration warning: {e}")
    print("🔧 Attempting to use minimal configuration...")
    
    # Set minimal required environment variables if missing
    if not os.getenv("SUPABASE_ANON_KEY") and not os.getenv("SUPABASE_KEY"):
        os.environ["SUPABASE_ANON_KEY"] = "your-supabase-anon-key"
    if not os.getenv("JWT_SECRET_KEY") and not os.getenv("SECRET_KEY"):
        os.environ["JWT_SECRET_KEY"] = "dev-secret-key-change-in-production"
    if not os.getenv("SUPABASE_URL"):
        os.environ["SUPABASE_URL"] = "https://your-project.supabase.co"
    if not os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
        os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "your-service-role-key"
    
    # Try again with defaults
    settings = Settings()

# Validate required settings (simplified for development)
def validate_settings():
    """Validate that only essential settings are configured"""
    required_settings = [
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY", 
        "SUPABASE_SERVICE_ROLE_KEY"
    ]
    
    missing = []
    for setting in required_settings:
        value = getattr(settings, setting, None)
        if not value or value.startswith("your-"):
            missing.append(setting)
    
    if missing and not settings.DEBUG:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

# Development vs Production configurations
if settings.DEBUG:
    # Development settings - more permissive
    print("🔧 Development mode: Using free alternatives")
    print(f"   - TTS: {'Browser Web Speech API (Free)' if settings.USE_BROWSER_TTS else 'External service'}")
    print(f"   - Push: {'Expo Notifications (Free)' if settings.USE_EXPO_NOTIFICATIONS else 'External service'}")
    
    # Only warn about missing settings in development
    if settings.SUPABASE_URL.startswith("https://your-"):
        print("⚠️  Please configure your Supabase URL and keys in .env file")
else:
    # Production settings - strict validation
    validate_settings()

# Log configuration status on startup
if __name__ == "__main__":
    import logging
    logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL))
    logger = logging.getLogger(__name__)
    
    status = settings.voice_system_status
    logger.info(f"Voice & AI System Status: {status}")
    
    if not status["ai_configured"]:
        logger.warning("Gemini AI not configured - AI features will be limited")
    if not status["calling_configured"]:
        logger.warning("Twilio not configured - calling features will be disabled")
    
    logger.info(f"Available voice providers: {status['voice_providers']}")
    logger.info(f"Features available: {status['features_available']}") 