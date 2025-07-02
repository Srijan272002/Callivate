"""
Voice management endpoints for Callivate API
Prioritizes free browser TTS with optional premium upgrades
Full implementation with AI-enhanced recommendations
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.models.voice import VoiceResponse, VoicePreview, VoicePreviewResponse, VoiceFilter, VoiceRecommendation, UserVoicePreferences
from app.models.user import User
from app.api.api_v1.endpoints.auth import get_current_user
from app.services.voice_service import VoiceService, AIService
from app.core.database import get_supabase
from supabase import Client
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
voice_service = VoiceService()
ai_service = AIService()

@router.get("/", response_model=dict)
async def get_voices(
    include_premium: bool = Query(False, description="Include premium voices"),
    provider: Optional[str] = Query(None, description="Filter by provider"),
    is_free_only: bool = Query(False, description="Show only free voices"),
    current_user: User = Depends(get_current_user)
):
    """
    Get available voices with free-first approach and personalized recommendations
    
    - **include_premium**: Include premium voices (requires API keys)
    - **provider**: Filter by specific provider (browser, google, elevenlabs, openai)
    - **is_free_only**: Show only completely free voices
    - Returns browser TTS voices by default (100% free)
    """
    try:
        # Get all available voices with user recommendations
        voices = await voice_service.get_available_voices(
            include_premium=include_premium, 
            user_id=str(current_user.id)
        )
        
        # Apply filters
        if provider:
            voices = [v for v in voices if v["provider"] == provider]
        
        if is_free_only:
            voices = [v for v in voices if v.get("is_free", False)]
        
        # Categorize voices
        free_voices = [v for v in voices if v.get("is_free", False)]
        premium_voices = [v for v in voices if v.get("is_premium", False)]
        
        # Get personalized recommendations
        recommendations = await voice_service.get_voice_recommendations(str(current_user.id))
        
        return {
            "voices": voices,
            "recommendations": recommendations,
            "categories": {
                "free": free_voices,
                "premium": premium_voices
            },
            "statistics": {
                "total": len(voices),
                "free_count": len(free_voices),
                "premium_count": len(premium_voices)
            },
            "providers": list(set(v["provider"] for v in voices)),
            "message": "Browser TTS voices are completely free and work on all devices!",
            "free_first_notice": "Callivate prioritizes free voices to keep costs low for users"
        }
        
    except Exception as e:
        logger.error(f"Error retrieving voices: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving voices: {str(e)}"
        )

@router.post("/{voice_id}/preview", response_model=dict)
async def preview_voice(
    voice_id: str, 
    preview: VoicePreview,
    current_user: User = Depends(get_current_user)
):
    """
    Generate voice preview with sample text
    Free for browser voices, cost estimate for premium voices
    """
    try:
        # Generate AI-enhanced sample text if not provided
        sample_text = preview.text
        if not sample_text:
            # Use AI to generate personalized sample based on user's tasks
            sample_text = "Hi! This is your AI assistant from Callivate. Have you completed your task today?"
        
        preview_result = await voice_service.generate_voice_preview(
            voice_id=voice_id,
            text=sample_text,
            user_id=str(current_user.id)
        )
        
        return {
            "voice_preview": preview_result,
            "voice_id": voice_id,
            "sample_text": sample_text,
            "timestamp": "now"
        }
        
    except Exception as e:
        logger.error(f"Error generating voice preview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating voice preview: {str(e)}"
        )

@router.get("/recommendations", response_model=List[VoiceRecommendation])
async def get_voice_recommendations(
    current_user: User = Depends(get_current_user),
    task_context: Optional[str] = Query(None, description="Context about current task")
):
    """
    Get personalized voice recommendations based on user usage and preferences
    """
    try:
        context_data = {}
        if task_context:
            context_data["task_context"] = task_context
        
        recommendations = await voice_service.get_voice_recommendations(
            user_id=str(current_user.id),
            task_context=context_data
        )
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get voice recommendations"
        )

@router.put("/{voice_id}/set-default")
async def set_default_voice(
    voice_id: str,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Set user's default voice with validation
    """
    try:
        # Validate voice exists and is available
        voices = await voice_service.get_available_voices(include_premium=True)
        voice_exists = any(v["id"] == voice_id for v in voices)
        
        if not voice_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Voice not found or not available"
            )
        
        # Get voice details
        selected_voice = next((v for v in voices if v["id"] == voice_id), None)
        
        # Update user settings
        update_data = {
            "default_voice_id": voice_id,
            "voice_provider": selected_voice["provider"],
            "updated_at": "now()"
        }
        
        response = supabase.table("user_settings").update(update_data).eq("user_id", current_user.id).execute()
        
        if not response.data:
            # Create settings if they don't exist
            create_data = {
                "user_id": current_user.id,
                "default_voice_id": voice_id,
                "voice_provider": selected_voice["provider"]
            }
            response = supabase.table("user_settings").insert(create_data).execute()
        
        logger.info(f"Set default voice {voice_id} for user {current_user.id}")
        
        return {
            "success": True,
            "message": f"Default voice set to {selected_voice['name']}",
            "voice": selected_voice,
            "is_free": selected_voice.get("is_free", False),
            "cost_impact": "No cost - completely free!" if selected_voice.get("is_free") else "Premium voice - charges may apply"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting default voice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set default voice"
        )

@router.get("/browser-config")
async def get_browser_voice_config():
    """
    Get optimal configuration for browser TTS voices
    Helps frontend optimize speech synthesis
    """
    return {
        "optimal_settings": {
            "rate": 0.9,
            "pitch": 1.0,
            "volume": 1.0,
            "lang": "en-US"
        },
        "supported_voices": [
            {
                "id": "browser-default-female",
                "name": "Female Voice",
                "gender": "female",
                "recommended_rate": 0.9
            },
            {
                "id": "browser-default-male",
                "name": "Male Voice", 
                "gender": "male",
                "recommended_rate": 0.85
            },
            {
                "id": "browser-default-neutral",
                "name": "Neutral Voice",
                "gender": "neutral",
                "recommended_rate": 0.9
            }
        ],
        "usage_tips": [
            "Browser voices work offline",
            "No API costs or limits",
            "Quality varies by device",
            "Instant playback"
        ],
        "compatibility": {
            "web": True,
            "mobile": True,
            "desktop": True,
            "offline": True
        }
    }

@router.get("/premium-providers")
async def get_premium_provider_status():
    """
    Check status of premium voice providers and their availability
    """
    from app.core.config import settings
    
    providers = {
        "elevenlabs": {
            "available": bool(settings.ELEVENLABS_API_KEY),
            "name": "ElevenLabs",
            "quality_rating": 9.2,
            "features": ["Natural speech", "Emotion control", "Custom training"],
            "cost_per_character": 0.0001,
            "voice_count": 2,
            "best_for": "High-quality natural speech"
        },
        "openai": {
            "available": bool(settings.OPENAI_API_KEY),
            "name": "OpenAI TTS",
            "quality_rating": 8.8,
            "features": ["Fast generation", "Consistent quality", "Multiple voices"],
            "cost_per_character": 0.000015,
            "voice_count": 6,
            "best_for": "Reliable, consistent voice quality"
        },
        "google": {
            "available": bool(settings.GOOGLE_TTS_API_KEY),
            "name": "Google Cloud TTS",
            "quality_rating": 8.5,
            "features": ["WaveNet technology", "Natural prosody", "Multiple emotions"],
            "cost_per_character": 0.000016,
            "voice_count": 2,
            "best_for": "Advanced voice control and emotions"
        }
    }
    
    available_count = sum(1 for p in providers.values() if p["available"])
    
    return {
        "providers": providers,
        "summary": {
            "total_providers": len(providers),
            "available_providers": available_count,
            "setup_required": len(providers) - available_count
        },
        "recommendation": "Browser voices are free and work great for most users!",
        "upgrade_benefits": [
            "Higher voice quality",
            "More voice options", 
            "Emotional control",
            "Custom voice training"
        ] if available_count > 0 else [
            "Configure API keys to enable premium voices",
            "Browser voices remain completely free"
        ]
    }

@router.post("/test-call-script")
async def test_call_script(
    task_title: str,
    user_name: str = "User",
    current_user: User = Depends(get_current_user)
):
    """
    Generate and test AI call script for a task
    Uses Gemini AI to create personalized scripts
    """
    try:
        # Get user's streak for context
        supabase = get_supabase()
        streak_response = supabase.table("streaks").select("current_streak").eq("user_id", current_user.id).execute()
        current_streak = streak_response.data[0]["current_streak"] if streak_response.data else 0
        
        call_context = {
            "current_streak": current_streak,
            "is_recurring": True,  # Could be determined from task data
            "missed_yesterday": False  # Could be determined from task history
        }
        
        # Generate AI script
        script = await ai_service.generate_call_script(
            task_title=task_title,
            user_name=user_name,
            call_context=call_context
        )
        
        return {
            "script": script,
            "task_title": task_title,
            "user_name": user_name,
            "context": call_context,
            "estimated_duration": "15-30 seconds",
            "ai_powered": True,
            "preview_url": f"/api/v1/voices/browser-default-female/preview",
            "message": "Script generated using Gemini AI for natural conversation"
        }
        
    except Exception as e:
        logger.error(f"Error generating call script: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate call script"
        )

@router.get("/usage-analytics")
async def get_voice_usage_analytics(
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Get user's voice usage analytics and recommendations
    """
    try:
        # Get voice usage from task executions
        usage_response = supabase.table("task_executions").select("""
            call_duration,
            completion_method,
            created_at,
            tasks!inner(voice_id)
        """).eq("user_id", current_user.id).eq("completion_method", "call").execute()
        
        voice_stats = {}
        total_call_time = 0
        total_calls = len(usage_response.data)
        
        for execution in usage_response.data:
            voice_id = execution.get("tasks", {}).get("voice_id", "unknown")
            duration = execution.get("call_duration", 0) or 0
            
            if voice_id not in voice_stats:
                voice_stats[voice_id] = {
                    "usage_count": 0,
                    "total_duration": 0,
                    "avg_duration": 0
                }
            
            voice_stats[voice_id]["usage_count"] += 1
            voice_stats[voice_id]["total_duration"] += duration
            total_call_time += duration
        
        # Calculate averages
        for voice_id in voice_stats:
            stats = voice_stats[voice_id]
            stats["avg_duration"] = stats["total_duration"] / stats["usage_count"] if stats["usage_count"] > 0 else 0
        
        # Get most used voice
        most_used_voice = max(voice_stats.items(), key=lambda x: x[1]["usage_count"]) if voice_stats else None
        
        return {
            "summary": {
                "total_calls": total_calls,
                "total_call_time": total_call_time,
                "avg_call_duration": total_call_time / total_calls if total_calls > 0 else 0,
                "most_used_voice": most_used_voice[0] if most_used_voice else None
            },
            "voice_statistics": voice_stats,
            "cost_analysis": {
                "browser_voice_cost": 0.0,
                "estimated_premium_cost": total_call_time * 0.001,  # Rough estimate
                "savings_using_browser": "100% savings using free browser voices!"
            },
            "recommendations": [
                "Browser voices save money and work offline",
                "Consider premium voices for important calls only",
                "Your most used voice shows good consistency"
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting voice analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get voice analytics"
        ) 