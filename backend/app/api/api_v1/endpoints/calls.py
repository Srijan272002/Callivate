"""
Call management endpoints for Callivate API
Handles AI voice calls via Twilio - Core feature
"""

from fastapi import APIRouter, HTTPException, logger, status, Request
from fastapi.responses import Response
from typing import List
from app.models.call import (
    Call, CallCreate, CallUpdate, CallResponse, 
    CallScheduleRequest, CallTwiMLRequest, CallWebhookData
)
from app.services.calling_service import CallingService

router = APIRouter()
calling_service = CallingService()

@router.post("/schedule", response_model=CallResponse)
async def schedule_call(call_request: CallScheduleRequest):
    """
    Schedule an AI voice call for task reminder
    
    - **FREE for users** - No charges to end users
    - Core feature of Callivate for task accountability
    - Uses Twilio for reliable voice calling
    """
    try:
        result = await calling_service.schedule_task_reminder_call(
            user_phone=call_request.user_phone,
            task_title=call_request.task_title,
            user_name="User",  # Will be enhanced with actual user names
            call_time=call_request.preferred_time or datetime.now()
        )
        
        if result["success"]:
            # Create mock Call object for response
            from datetime import datetime
            import uuid
            
            call_data = {
                "id": uuid.uuid4(),
                "user_id": call_request.user_id,
                "task_id": call_request.task_id,
                "user_phone": call_request.user_phone,
                "task_title": call_request.task_title,
                "call_type": call_request.call_type,
                "scheduled_time": call_request.preferred_time or datetime.now(),
                "call_sid": result.get("call_sid"),
                "status": "scheduled",
                "created_at": datetime.now()
            }
            
            return {
                "call": call_data,
                "message": result["message"],
                "estimated_cost": result.get("cost_estimate", 0.0085),
                "user_cost": 0.0
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to schedule call: {result.get('error', 'Unknown error')}"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error scheduling call: {str(e)}"
        )

@router.get("/{call_id}/status")
async def get_call_status(call_id: str):
    """
    Get the current status of a scheduled call
    """
    try:
        status_data = await calling_service.get_call_status(call_id)
        return {
            "call_id": call_id,
            "status": status_data,
            "message": "Call status retrieved successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving call status: {str(e)}"
        )

@router.post("/twiml")
async def generate_twiml(request: Request):
    """
    Generate TwiML for AI conversation during calls
    This endpoint is called by Twilio during the call
    """
    try:
        form_data = await request.form()
        task_title = form_data.get("task", "your task")
        user_name = form_data.get("user", "there")
        
        # Generate dynamic TwiML for AI conversation
        twiml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">
        Hi {user_name}! This is your AI assistant from Callivate. 
        I'm calling to check if you've completed your task: {task_title}. 
        Please say yes if you've completed it, or no if you haven't.
    </Say>
    <Gather input="speech" action="/api/v1/calls/process-response" method="POST" speechTimeout="3">
        <Say voice="alice">Please tell me, have you completed your task?</Say>
    </Gather>
    <Say voice="alice">I didn't hear a response. I'll send you a notification instead. Have a great day!</Say>
</Response>"""
        
        return Response(content=twiml_content, media_type="application/xml")
        
    except Exception as e:
        # Fallback TwiML
        fallback_twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Hi! This is your task reminder from Callivate. Please check your app for details. Have a great day!</Say>
</Response>"""
        return Response(content=fallback_twiml, media_type="application/xml")

@router.post("/process-response")
async def process_call_response(request: Request):
    """
    Process user's speech response during the call
    Called by Twilio after gathering speech input
    """
    try:
        form_data = await request.form()
        speech_result = form_data.get("SpeechResult", "")
        call_sid = form_data.get("CallSid", "")
        
        # Process the response with AI
        result = await calling_service.handle_call_response(
            call_sid=call_sid,
            user_response=speech_result,
            task_id="mock-task-id"  # This should come from call context
        )
        
        # Generate appropriate TwiML response
        if result["success"] and result.get("task_completed"):
            response_twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">{result['ai_response']}</Say>
</Response>"""
        else:
            response_twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">{result.get('ai_response', 'Thank you for the update. Keep working on your goals!')}</Say>
</Response>"""
        
        return Response(content=response_twiml, media_type="application/xml")
        
    except Exception as e:
        # Fallback response
        fallback_twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Thank you for taking my call. Keep up the great work on your goals!</Say>
</Response>"""
        return Response(content=fallback_twiml, media_type="application/xml")

@router.post("/webhook")
async def call_webhook(webhook_data: CallWebhookData):
    """
    Handle Twilio webhook events for call status updates
    """
    try:
        # Process webhook data and update call status
        logger.info(f"Received webhook for call {webhook_data.call_sid}: {webhook_data.call_status}")
        
        # Update call status in database
        # This would typically update the call record in Supabase
        
        return {
            "success": True,
            "message": "Webhook processed successfully",
            "call_sid": webhook_data.call_sid,
            "status": webhook_data.call_status
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing webhook: {str(e)}"
        )

@router.get("/analytics/summary")
async def get_call_analytics():
    """
    Get analytics summary for AI voice calls
    Useful for monitoring cost and effectiveness
    """
    try:
        # Mock analytics data - would be real data from database
        analytics = {
            "total_calls_this_month": 245,
            "successful_calls": 198,
            "success_rate": 80.8,
            "average_call_duration": 32.5,  # seconds
            "task_completion_rate": 76.3,  # percentage
            "estimated_monthly_cost": 15.67,  # USD
            "user_cost": 0.0,  # Always free for users
            "cost_per_completed_task": 0.08,
            "user_satisfaction_score": 4.2  # out of 5
        }
        
        return {
            "analytics": analytics,
            "message": "Call analytics retrieved successfully",
            "note": "Calls are always FREE for users - costs are operational backend expenses"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving analytics: {str(e)}"
        ) 