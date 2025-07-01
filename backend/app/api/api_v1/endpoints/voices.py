"""
Voice management endpoints for Callivate API
Prioritizes free browser TTS with optional premium upgrades
"""

from fastapi import APIRouter, HTTPException, status
from app.models.voice import VoiceResponse, VoicePreview, VoicePreviewResponse
from app.services.voice_service import VoiceService

router = APIRouter()
voice_service = VoiceService()

@router.get("/", response_model=VoiceResponse)
async def get_voices(include_premium: bool = False):
    """
    Get available voices with free-first approach
    
    - **include_premium**: Include premium voices (requires API keys)
    - Returns browser TTS voices by default (100% free)
    """
    try:
        voices = await voice_service.get_available_voices(include_premium=include_premium)
        return {
            "voices": voices,
            "total": len(voices),
            "free_count": len([v for v in voices if not v.get("is_premium", False)]),
            "premium_count": len([v for v in voices if v.get("is_premium", False)]),
            "providers": list(set(v["provider"] for v in voices)),
            "message": "Browser TTS voices are completely free and work on all devices!"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving voices: {str(e)}"
        )

@router.post("/{voice_id}/preview", response_model=VoicePreviewResponse)
async def preview_voice(voice_id: str, preview: VoicePreview):
    """Generate voice preview with sample text"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Voice preview to be implemented"
    )

@router.put("/users/{user_id}/default-voice")
async def set_default_voice(user_id: str, voice_id: str):
    """Set user's default voice"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Voice preferences to be implemented"
    ) 