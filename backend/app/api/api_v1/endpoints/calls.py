"""
Call management endpoints for Callivate API
Handles AI voice calls via Twilio + Gemini AI - Core feature
Complete implementation with call scheduling, TwiML generation, and analytics
"""

from fastapi import APIRouter, HTTPException, status, Request, Depends, Query
from fastapi.responses import Response
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from app.models.call import (
    Call, CallCreate, CallUpdate, CallResponse, 
    CallScheduleRequest, CallTwiMLRequest, CallWebhookData
)
from app.models.user import User
from app.api.api_v1.endpoints.auth import get_current_user
from app.services.calling_service import CallingService
from app.core.database import get_supabase
from supabase import Client
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter()
calling_service = CallingService()

@router.post("/schedule", response_model=dict)
async def schedule_call(
    call_request: CallScheduleRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Schedule an AI voice call for task reminder
    
    - **FREE for users** - No charges to end users
    - Core feature of Callivate for task accountability
    - Uses Twilio + Gemini AI for intelligent conversations
    """
    try:
        # Validate phone number format
        if not call_request.user_phone.startswith('+'):
            call_request.user_phone = '+1' + call_request.user_phone.replace('-', '').replace('(', '').replace(')', '').replace(' ', '')
        
        # Schedule the AI call
        result = await calling_service.schedule_task_reminder_call(
            user_phone=call_request.user_phone,
            task_title=call_request.task_title,
            user_name=current_user.full_name or "User",
            call_time=call_request.preferred_time,
            task_id=str(call_request.task_id) if call_request.task_id else None,
            user_id=str(current_user.id)
        )
        
        if result["success"]:
            return {
                "success": True,
                "call_data": {
                    "call_id": result.get("call_id"),
                    "call_sid": result.get("call_sid"),
                    "scheduled_time": result.get("scheduled_time"),
                    "ai_script": result.get("ai_script", "AI-generated personalized script")
                },
                "cost_info": {
                    "estimated_cost": result.get("cost_estimate", 0.0085),
                    "user_cost": 0.0,
                    "cost_covered_by": "Callivate - completely free for users!"
                },
                "message": result["message"],
                "ai_powered": True,
                "provider": "Twilio + Gemini AI"
            }
        else:
            # Return error but with helpful information
            return {
                "success": False,
                "error": result.get("error", "Unknown error"),
                "fallback": {
                    "method": "push_notification",
                    "message": "Will send push notification instead",
                    "user_cost": 0.0
                },
                "estimated_cost": result.get("cost_estimate", 0.0085)
            }
            
    except Exception as e:
        logger.error(f"Error in schedule_call endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": f"Error scheduling call: {str(e)}",
                "fallback": "Push notification will be sent instead",
                "user_cost": 0.0
            }
        )

@router.get("/{call_id}/status")
async def get_call_status(
    call_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get the current status of a scheduled call with detailed information
    """
    try:
        # Get call from database first
        supabase = get_supabase()
        call_response = supabase.table("calls").select("*").eq("id", call_id).eq("user_id", current_user.id).execute()
        
        if not call_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found"
            )
        
        call_data = call_response.data[0]
        call_sid = call_data.get("call_sid")
        
        # Get detailed status from Twilio if available
        twilio_status = {}
        if call_sid:
            twilio_status = await calling_service.get_call_status(call_sid)
        
        return {
            "call_id": call_id,
            "call_sid": call_sid,
            "database_status": {
                "status": call_data.get("status"),
                "task_title": call_data.get("task_title"),
                "scheduled_time": call_data.get("scheduled_time"),
                "task_completed": call_data.get("task_completed"),
                "user_response": call_data.get("user_response"),
                "ai_confidence": call_data.get("ai_confidence"),
                "created_at": call_data.get("created_at")
            },
            "twilio_status": twilio_status,
            "ai_analysis": {
                "script_generated": bool(call_data.get("call_script")),
                "response_processed": bool(call_data.get("user_response")),
                "confidence_score": call_data.get("ai_confidence", 0)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting call status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving call status: {str(e)}"
        )

@router.post("/twiml")
async def generate_twiml(request: Request):
    """
    Generate TwiML for AI conversation during calls
    This endpoint is called by Twilio during the call
    Enhanced with Gemini AI for dynamic conversations
    """
    try:
        # Get form data from Twilio
        form_data = await request.form()
        
        call_data = {
            "task": form_data.get("task", "your task"),
            "user": form_data.get("user", "there"),
            "task_id": form_data.get("task_id"),
            "user_id": form_data.get("user_id"),
            "script": form_data.get("script", "")
        }
        
        # Determine call stage
        call_stage = "initial"
        if form_data.get("stage"):
            call_stage = form_data.get("stage")
        
        # Generate AI-powered TwiML
        twiml_content = await calling_service.generate_twiml_response(
            call_data=call_data,
            call_stage=call_stage
        )
        
        logger.info(f"Generated TwiML for call with task: {call_data['task']}")
        
        return Response(content=twiml_content, media_type="application/xml")
        
    except Exception as e:
        logger.error(f"Error generating TwiML: {str(e)}")
        
        # Fallback TwiML with error handling
        fallback_twiml = '''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" rate="0.9">
        Hi! This is your task reminder from Callivate. 
        I'm having trouble with my systems right now, but please check your app for task details. 
        Keep up the great work on your goals!
    </Say>
</Response>'''
        
        return Response(content=fallback_twiml, media_type="application/xml")

@router.post("/process-response")
async def process_call_response(request: Request):
    """
    Process user's speech response during the call
    Called by Twilio after gathering speech input
    Uses Gemini AI for intelligent response processing
    """
    try:
        # Get form data from Twilio
        form_data = await request.form()
        
        speech_result = form_data.get("SpeechResult", "")
        call_sid = form_data.get("CallSid", "")
        task_id = form_data.get("TaskId", "")
        
        logger.info(f"Processing speech: '{speech_result}' for call {call_sid}")
        
        # Process response with AI
        result = await calling_service.handle_call_response(
            call_sid=call_sid,
            user_response=speech_result,
            task_id=task_id,
            call_stage="response"
        )
        
        # Generate appropriate TwiML response based on AI analysis
        twiml_content = ""
        
        if result["success"]:
            if result.get("needs_clarification"):
                # Ask for clarification
                twiml_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" rate="0.9">{result["ai_response"]}</Say>
    <Gather input="speech" action="{request.url}" method="POST" speechTimeout="3" timeout="8">
        <Say voice="alice" rate="0.9">Please say yes or no.</Say>
    </Gather>
    <Say voice="alice" rate="0.9">Thank you. Keep working on your goals!</Say>
</Response>'''
            else:
                # Final response
                ai_response = result.get("ai_response", "Thank you for the update!")
                twiml_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" rate="0.9">{ai_response}</Say>
</Response>'''
        else:
            # Error fallback
            twiml_content = '''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" rate="0.9">
        Thank you for taking my call. Keep up the great work on your goals!
    </Say>
</Response>'''
        
        return Response(content=twiml_content, media_type="application/xml")
        
    except Exception as e:
        logger.error(f"Error processing call response: {str(e)}")
        
        # Fallback response
        fallback_twiml = '''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" rate="0.9">
        Thank you for the update. Keep working towards your goals!
    </Say>
</Response>'''
        
        return Response(content=fallback_twiml, media_type="application/xml")

@router.post("/webhook")
async def call_webhook(request: Request):
    """
    Handle Twilio webhook events for call status updates
    Processes call lifecycle events and updates database
    """
    try:
        # Get form data from Twilio webhook
        form_data = await request.form()
        
        webhook_data = {
            "CallSid": form_data.get("CallSid"),
            "CallStatus": form_data.get("CallStatus"),
            "CallDuration": form_data.get("CallDuration"),
            "CallPrice": form_data.get("CallPrice"),
            "CallStartTime": form_data.get("CallStartTime"),
            "CallEndTime": form_data.get("CallEndTime"),
            "AnsweredBy": form_data.get("AnsweredBy"),
            "From": form_data.get("From"),
            "To": form_data.get("To")
        }
        
        # Process webhook with calling service
        result = await calling_service.process_call_webhook(webhook_data)
        
        logger.info(f"Processed webhook for call {webhook_data['CallSid']}: {webhook_data['CallStatus']}")
        
        return {
            "success": result["success"],
            "message": "Webhook processed successfully",
            "call_sid": webhook_data["CallSid"],
            "status": webhook_data["CallStatus"],
            "processing_result": result
        }
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        # Return success to prevent Twilio retries for non-critical errors
        return {
            "success": False,
            "error": str(e),
            "message": "Webhook processing failed but call will continue"
        }

@router.get("/analytics/summary")
async def get_call_analytics(
    days: int = Query(30, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive call analytics for the user
    Includes AI performance, cost analysis, and success rates
    """
    try:
        analytics = await calling_service.get_call_analytics(
            user_id=str(current_user.id),
            days=days
        )
        
        return {
            "user_id": str(current_user.id),
            "analysis_period": f"Last {days} days",
            "analytics": analytics,
            "insights": {
                "most_effective_time": "Analysis coming soon",
                "voice_preference": "Browser voices save 100% on costs",
                "improvement_suggestions": [
                    "AI calls show high task completion rates",
                    "Free browser voices work great for most users",
                    "Consistent calling improves accountability"
                ]
            },
            "cost_savings": {
                "using_free_voices": "100% savings on voice synthesis",
                "ai_vs_human": "90% cost reduction vs human calls",
                "user_cost": "Always $0 - completely free for users"
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting call analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get call analytics"
        )

@router.get("/analytics/detailed")
async def get_detailed_call_analytics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Get detailed call analytics with breakdowns
    """
    try:
        # Build date filter
        query = supabase.table("calls").select("*").eq("user_id", current_user.id)
        
        if start_date:
            query = query.gte("created_at", f"{start_date}T00:00:00")
        if end_date:
            query = query.lte("created_at", f"{end_date}T23:59:59")
        
        response = query.execute()
        calls = response.data
        
        # Analyze call patterns
        call_outcomes = {}
        ai_performance = {}
        time_patterns = {}
        
        for call in calls:
            # Outcome analysis
            status = call.get("status", "unknown")
            call_outcomes[status] = call_outcomes.get(status, 0) + 1
            
            # AI performance
            if call.get("ai_confidence"):
                confidence = call["ai_confidence"]
                confidence_bucket = "high" if confidence > 0.8 else "medium" if confidence > 0.5 else "low"
                ai_performance[confidence_bucket] = ai_performance.get(confidence_bucket, 0) + 1
            
            # Time patterns
            if call.get("created_at"):
                hour = datetime.fromisoformat(call["created_at"]).hour
                time_bucket = f"{hour:02d}:00"
                time_patterns[time_bucket] = time_patterns.get(time_bucket, 0) + 1
        
        return {
            "total_calls": len(calls),
            "date_range": {
                "start": start_date or "All time",
                "end": end_date or "Present"
            },
            "call_outcomes": call_outcomes,
            "ai_performance": {
                "confidence_distribution": ai_performance,
                "avg_confidence": sum(c.get("ai_confidence", 0) for c in calls) / max(len(calls), 1)
            },
            "time_patterns": time_patterns,
            "task_completion": {
                "completed": len([c for c in calls if c.get("task_completed") is True]),
                "incomplete": len([c for c in calls if c.get("task_completed") is False]),
                "unclear": len([c for c in calls if c.get("task_completed") is None])
            },
            "cost_summary": {
                "total_cost": sum(float(c.get("price", 0) or 0) for c in calls),
                "user_cost": 0.0,
                "covered_by_callivate": "100% of call costs"
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting detailed analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get detailed analytics"
        )

@router.get("/test-ai-script")
async def test_ai_script(
    task_title: str = Query(..., description="Task title to generate script for"),
    user_name: str = Query("User", description="User's name"),
    current_user: User = Depends(get_current_user)
):
    """
    Test AI script generation for a task
    Useful for previewing what the AI will say during calls
    """
    try:
        from app.services.voice_service import AIService
        ai_service = AIService()
        
        # Get user context
        supabase = get_supabase()
        streak_response = supabase.table("streaks").select("current_streak").eq("user_id", current_user.id).execute()
        current_streak = streak_response.data[0]["current_streak"] if streak_response.data else 0
        
        call_context = {
            "current_streak": current_streak,
            "is_recurring": True,
            "missed_yesterday": False
        }
        
        # Generate AI script
        script = await ai_service.generate_call_script(
            task_title=task_title,
            user_name=user_name,
            call_context=call_context
        )
        
        return {
            "generated_script": script,
            "task_title": task_title,
            "user_name": user_name,
            "context_used": call_context,
            "estimated_call_duration": "15-30 seconds",
            "voice_options": [
                "Browser TTS (Free)",
                "Twilio Voice (Alice)",
                "Premium voices (if configured)"
            ],
            "ai_model": "Gemini 2.0 Flash",
            "personalization": {
                "streak_included": current_streak > 0,
                "name_personalized": user_name != "User",
                "task_specific": True
            }
        }
        
    except Exception as e:
        logger.error(f"Error testing AI script: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate AI script"
        )

@router.get("/system-status")
async def get_system_status():
    """
    Get status of the calling system components
    Useful for monitoring and troubleshooting
    """
    try:
        from app.core.config import settings
        
        # Check Twilio configuration
        twilio_configured = bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN)
        
        # Check Gemini AI configuration
        gemini_configured = bool(settings.GEMINI_API_KEY)
        
        # Check voice providers
        voice_providers = {
            "browser_tts": True,  # Always available
            "elevenlabs": bool(settings.ELEVENLABS_API_KEY),
            "openai_tts": bool(settings.OPENAI_API_KEY),
            "google_tts": bool(settings.GOOGLE_TTS_API_KEY)
        }
        
        system_status = "healthy" if (twilio_configured and gemini_configured) else "degraded"
        
        return {
            "system_status": system_status,
            "components": {
                "twilio_calling": {
                    "status": "configured" if twilio_configured else "not_configured",
                    "required_for": "Phone calls"
                },
                "gemini_ai": {
                    "status": "configured" if gemini_configured else "not_configured", 
                    "required_for": "AI conversation flow"
                },
                "voice_synthesis": {
                    "status": "available",
                    "providers": voice_providers,
                    "free_option": "Browser TTS always available"
                }
            },
            "features_available": {
                "ai_phone_calls": twilio_configured and gemini_configured,
                "ai_script_generation": gemini_configured,
                "voice_synthesis": True,  # Browser TTS always works
                "call_analytics": True,
                "webhook_processing": True
            },
            "cost_status": {
                "user_cost": "Always $0 - completely free",
                "service_costs_covered": "100% by Callivate"
            }
        }
        
    except Exception as e:
        logger.error(f"Error checking system status: {str(e)}")
        return {
            "system_status": "error",
            "error": str(e),
            "features_available": {
                "fallback_notifications": True
            }
        } 