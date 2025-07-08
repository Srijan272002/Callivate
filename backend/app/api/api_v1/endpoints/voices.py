"""
Voice endpoints for Callivate API
Handles voice selection, previews, and management
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from app.models.voice import VoiceResponse, VoicePreview, VoicePreviewResponse, VoiceFilter, VoiceRecommendation, UserVoicePreferences
from app.models.user import User
from app.api.api_v1.endpoints.auth import get_current_user
from app.services.voice_service import VoiceService, AIService
from app.core.database import get_supabase
from supabase import Client
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
voice_service = VoiceService()
ai_service = AIService()

class VoicePreviewRequest(BaseModel):
    voice_id: str
    text: Optional[str] = None

class SetDefaultVoiceRequest(BaseModel):
    voice_id: str

class TestVoiceRequest(BaseModel):
    voice_id: str

@router.get("/", response_model=dict)
async def get_voices(
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    include_premium: bool = False,
    filter_params: VoiceFilter = Depends()
):
    """Get available voices for the user"""
    try:
        voices = await voice_service.get_available_voices(
            include_premium=include_premium,
            user_id=str(current_user.id)
        )
        
        return {
            "success": True,
            "voices": voices,
            "total_count": len(voices)
        }
    except Exception as e:
        logger.error(f"Error fetching voices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch voices"
        )

@router.get("/recommendations")
async def get_voice_recommendations(
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get personalized voice recommendations for the user"""
    try:
        recommendations = await voice_service.get_voice_recommendations(
            user_id=str(current_user.id)
        )
        
        return {
            "success": True,
            "recommendations": recommendations
        }
    except Exception as e:
        logger.error(f"Error fetching voice recommendations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch recommendations"
        )

@router.post("/preview")
async def preview_voice(
    request: VoicePreviewRequest,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Generate a preview of a voice"""
    try:
        preview = await voice_service.generate_voice_preview(
            voice_id=request.voice_id,
            text=request.text,
            user_id=str(current_user.id)
        )
        
        return {
            "success": True,
            "voice_preview": preview
        }
    except Exception as e:
        logger.error(f"Error generating voice preview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate voice preview"
        )

@router.post("/set-default")
async def set_default_voice(
    request: SetDefaultVoiceRequest,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Set user's default voice"""
    try:
        # Update or insert user preferences
        result = supabase.table('user_settings').upsert({
            'user_id': str(current_user.id),
            'default_voice_id': request.voice_id,
            'updated_at': 'now()'
        }).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user preferences"
            )
        
        return {
            "success": True,
            "message": "Default voice updated successfully",
            "voice_id": request.voice_id
        }
    except Exception as e:
        logger.error(f"Error setting default voice: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set default voice"
        )

@router.get("/user-preferences")
async def get_user_preferences(
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get user's voice and notification preferences"""
    try:
        result = supabase.table('user_settings').select('*').eq('user_id', str(current_user.id)).execute()
        
        if not result.data:
            # Return default preferences
            default_preferences = {
                'default_voice_id': 'browser-default-female',
                'enable_notifications': True,
                'enable_silent_mode': False,
                'preferred_time_format': '12h'
            }
            return {
                "success": True,
                "settings": default_preferences
            }
        
        settings = result.data[0]
        return {
            "success": True,
            "settings": {
                'default_voice_id': settings.get('default_voice_id', 'browser-default-female'),
                'enable_notifications': settings.get('notification_enabled', True),
                'enable_silent_mode': settings.get('silent_mode', False),
                'preferred_time_format': settings.get('time_format', '12h')
            }
        }
    except Exception as e:
        logger.error(f"Error fetching user preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user preferences"
        )

@router.post("/test")
async def test_voice(
    request: TestVoiceRequest,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Test if a voice is available and working"""
    try:
        # Get voice details first
        voices = await voice_service.get_available_voices(include_premium=True, user_id=str(current_user.id))
        voice = next((v for v in voices if v['id'] == request.voice_id), None)
        
        if not voice:
            return {
                "success": False,
                "available": False,
                "error": "Voice not found"
            }
        
        # For browser voices, they're always available
        if request.voice_id.startswith('browser-'):
            return {
                "success": True,
                "available": True,
                "voice_type": "browser",
                "message": "Browser voice available"
            }
        
        # For premium voices, try to generate a small preview
        try:
            preview = await voice_service.generate_voice_preview(
                voice_id=request.voice_id,
                text="Test",
                user_id=str(current_user.id)
            )
            
            return {
                "success": True,
                "available": True,
                "voice_type": "premium",
                "message": "Premium voice available",
                "estimated_cost": preview.get('cost', 0)
            }
        except Exception as voice_error:
            logger.warning(f"Voice test failed for {request.voice_id}: {voice_error}")
            return {
                "success": False,
                "available": False,
                "voice_type": "premium",
                "error": str(voice_error)
            }
            
    except Exception as e:
        logger.error(f"Error testing voice: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to test voice"
        )

@router.get("/{voice_id}/details")
async def get_voice_details(
    voice_id: str,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get detailed information about a specific voice"""
    try:
        voices = await voice_service.get_available_voices(include_premium=True, user_id=str(current_user.id))
        
        voice = next((v for v in voices if v['id'] == voice_id), None)
        if not voice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Voice not found"
            )
        
        return {
            "success": True,
            "voice": voice
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching voice details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch voice details"
        )

@router.post("/synthesize")
async def synthesize_speech(
    request: VoicePreviewRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Synthesize speech for actual use (e.g., in phone calls)"""
    try:
        # Generate speech
        synthesis_result = await voice_service.synthesize_speech(
            voice_id=request.voice_id,
            text=request.text or "Hello from Callivate!"
        )
        
        # Log usage for billing/analytics
        background_tasks.add_task(
            log_voice_usage,
            user_id=str(current_user.id),
            voice_id=request.voice_id,
            text_length=len(request.text or "Hello from Callivate!"),
            synthesis_result=synthesis_result
        )
        
        return {
            "success": True,
            "synthesis": synthesis_result
        }
    except Exception as e:
        logger.error(f"Error synthesizing speech: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to synthesize speech"
        )

async def log_voice_usage(user_id: str, voice_id: str, text_length: int, synthesis_result: dict):
    """Log voice usage for analytics and billing"""
    try:
        supabase = get_supabase()
        
        supabase.table('voice_usage_logs').insert({
            'user_id': user_id,
            'voice_id': voice_id,
            'text_length': text_length,
            'synthesis_type': synthesis_result.get('type', 'unknown'),
            'cost': synthesis_result.get('cost', 0),
            'created_at': 'now()'
        }).execute()
        
    except Exception as e:
        logger.error(f"Failed to log voice usage: {e}")
        # Don't raise error as this is background logging

# Legacy endpoints (maintaining backward compatibility)
@router.get("/analytics", response_model=dict)
async def get_voice_analytics(
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get voice usage analytics for the user"""
    try:
        # Get usage statistics
        usage_response = supabase.table("voice_usage_logs").select("*").eq("user_id", str(current_user.id)).execute()
        
        total_usage = len(usage_response.data)
        total_cost = sum(log.get('cost', 0) for log in usage_response.data)
        
        # Get most used voice
        voice_counts = {}
        for log in usage_response.data:
            voice_id = log.get('voice_id', 'unknown')
            voice_counts[voice_id] = voice_counts.get(voice_id, 0) + 1
        
        most_used_voice = max(voice_counts, key=voice_counts.get) if voice_counts else 'browser-default-female'
        
        return {
            "success": True,
            "analytics": {
                "total_usage": total_usage,
                "total_cost": total_cost,
                "most_used_voice": most_used_voice,
                "voice_usage_breakdown": voice_counts
            }
        }
    except Exception as e:
        logger.error(f"Error getting voice analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get voice analytics"
        ) 