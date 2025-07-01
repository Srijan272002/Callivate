"""
Voice Service for Callivate
Handles voice synthesis with free-first approach
"""

from typing import Optional, Dict, Any, List
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class VoiceService:
    """
    Voice service that prioritizes free browser TTS
    with optional premium upgrades
    """
    
    def __init__(self):
        self.use_browser_tts = settings.USE_BROWSER_TTS
        
    async def get_available_voices(self, include_premium: bool = False) -> List[Dict[str, Any]]:
        """
        Get list of available voices, prioritizing free options
        """
        voices = []
        
        # Always include browser voices (FREE)
        browser_voices = [
            {
                "id": "browser-default-female",
                "name": "Device Default Female Voice",
                "provider": "browser",
                "category": "standard",
                "is_premium": False,
                "is_recommended": True,
                "description": "Uses your device's built-in voice (free)"
            },
            {
                "id": "browser-default-male", 
                "name": "Device Default Male Voice",
                "provider": "browser",
                "category": "standard", 
                "is_premium": False,
                "is_recommended": True,
                "description": "Uses your device's built-in voice (free)"
            }
        ]
        voices.extend(browser_voices)
        
        # Add premium voices if requested and API keys available
        if include_premium:
            if settings.ELEVENLABS_API_KEY:
                voices.extend(self._get_elevenlabs_voices())
            if settings.OPENAI_API_KEY:
                voices.extend(self._get_openai_voices())
            if settings.GOOGLE_TTS_API_KEY:
                voices.extend(self._get_google_voices())
                
        return voices
    
    async def generate_voice_preview(self, voice_id: str, text: str) -> Dict[str, Any]:
        """
        Generate voice preview
        Browser TTS will be handled on frontend
        """
        if voice_id.startswith("browser-"):
            return {
                "voice_id": voice_id,
                "preview_type": "browser",
                "text": text,
                "instructions": "This will use your device's built-in voice when played"
            }
        
        # For premium voices, implement actual API calls
        return {
            "voice_id": voice_id,
            "preview_type": "api",
            "status": "not_implemented", 
            "message": "Premium voice preview coming soon"
        }
    
    def _get_elevenlabs_voices(self) -> List[Dict[str, Any]]:
        """Get ElevenLabs voices (premium)"""
        return [
            {
                "id": "elevenlabs-rachel",
                "name": "Rachel (ElevenLabs)",
                "provider": "elevenlabs", 
                "category": "premium",
                "is_premium": True,
                "description": "High-quality AI voice (requires ElevenLabs API)"
            }
        ]
    
    def _get_openai_voices(self) -> List[Dict[str, Any]]:
        """Get OpenAI TTS voices (premium)"""
        openai_voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
        return [
            {
                "id": f"openai-{voice}",
                "name": f"{voice.title()} (OpenAI)",
                "provider": "openai",
                "category": "neural", 
                "is_premium": True,
                "description": f"OpenAI TTS voice: {voice}"
            }
            for voice in openai_voices
        ]
    
    def _get_google_voices(self) -> List[Dict[str, Any]]:
        """Get Google Cloud TTS voices (premium)"""
        return [
            {
                "id": "google-wavenet-us-1",
                "name": "Google WaveNet US Female",
                "provider": "google",
                "category": "premium",
                "is_premium": True,
                "description": "Google Cloud premium voice"
            }
        ] 