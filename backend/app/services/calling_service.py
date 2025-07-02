"""
AI Voice Calling Service for Callivate
Integrates Twilio for phone calls with Gemini AI for conversation flow
Core feature for task accountability and motivation
"""

from typing import Optional, Dict, Any, List
from app.core.config import settings
from app.core.database import get_supabase
from app.services.voice_service import AIService
import asyncio
import logging
from datetime import datetime, timedelta
import json
from twilio.rest import Client as TwilioClient
from twilio.twiml.voice_response import VoiceResponse, Gather, Say
import uuid

logger = logging.getLogger(__name__)

class CallingService:
    """
    AI-powered calling service using Twilio + Gemini AI
    """
    
    def __init__(self):
        # Initialize Twilio client
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            self.twilio_client = TwilioClient(
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN
            )
        else:
            self.twilio_client = None
            logger.warning("Twilio credentials not configured")
        
        # Initialize AI service
        self.ai_service = AIService()
        
        # Call configuration
        self.from_phone = settings.TWILIO_FROM_PHONE
        self.max_call_duration = 180  # 3 minutes max
        self.speech_timeout = 5  # seconds
        
    async def schedule_task_reminder_call(
        self,
        user_phone: str,
        task_title: str,
        user_name: str = "User",
        call_time: datetime = None,
        task_id: str = None,
        user_id: str = None
    ) -> Dict[str, Any]:
        """
        Schedule an AI voice call for task reminder
        """
        if not self.twilio_client:
            return {
                "success": False,
                "error": "Twilio not configured",
                "cost_estimate": 0.0085,
                "message": "Call service unavailable - using fallback notifications"
            }
        
        try:
            # Generate AI-powered call script
            call_context = await self._get_call_context(user_id, task_id)
            script = await self.ai_service.generate_call_script(
                task_title=task_title,
                user_name=user_name,
                call_context=call_context
            )
            
            # Create TwiML URL with call parameters
            twiml_url = f"{settings.BASE_URL}/api/v1/calls/twiml"
            twiml_params = {
                "task": task_title,
                "user": user_name,
                "task_id": task_id,
                "user_id": user_id,
                "script": script
            }
            
            # Schedule immediate call or for later
            if call_time and call_time > datetime.now():
                # For future calls, store in database and schedule
                call_record = await self._create_call_record(
                    user_id=user_id,
                    task_id=task_id,
                    user_phone=user_phone,
                    task_title=task_title,
                    scheduled_time=call_time,
                    call_script=script,
                    status="scheduled"
                )
                
                return {
                    "success": True,
                    "call_id": call_record["id"],
                    "message": f"Call scheduled for {call_time.strftime('%I:%M %p')}",
                    "scheduled_time": call_time.isoformat(),
                    "cost_estimate": 0.0085,
                    "user_cost": 0.0,
                    "ai_script": script
                }
            else:
                # Immediate call
                call = self.twilio_client.calls.create(
                    to=user_phone,
                    from_=self.from_phone,
                    url=twiml_url,
                    method="POST",
                    timeout=30,
                    record=True,  # Record for analysis
                    status_callback=f"{settings.BASE_URL}/api/v1/calls/webhook",
                    status_callback_event=["initiated", "answered", "completed"]
                )
                
                # Create call record
                call_record = await self._create_call_record(
                    user_id=user_id,
                    task_id=task_id,
                    user_phone=user_phone,
                    task_title=task_title,
                    call_sid=call.sid,
                    call_script=script,
                    status="initiated"
                )
                
                logger.info(f"Initiated call {call.sid} for task: {task_title}")
                
                return {
                    "success": True,
                    "call_sid": call.sid,
                    "call_id": call_record["id"],
                    "message": "Call initiated successfully",
                    "cost_estimate": 0.0085,
                    "user_cost": 0.0,
                    "ai_script": script
                }
                
        except Exception as e:
            logger.error(f"Error scheduling call: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "cost_estimate": 0.0085,
                "fallback": "Will send push notification instead"
            }
    
    async def generate_twiml_response(
        self,
        call_data: Dict[str, Any],
        call_stage: str = "initial"
    ) -> str:
        """
        Generate TwiML for different stages of the AI conversation
        """
        try:
            task_title = call_data.get("task", "your task")
            user_name = call_data.get("user", "there")
            script = call_data.get("script", "")
            
            response = VoiceResponse()
            
            if call_stage == "initial":
                # Initial greeting with AI-generated script
                if script:
                    response.say(script, voice="alice", rate="0.9")
                else:
                    response.say(
                        f"Hi {user_name}! This is your AI assistant from Callivate. "
                        f"I'm calling to check if you've completed your task: {task_title}.",
                        voice="alice",
                        rate="0.9"
                    )
                
                # Gather speech response
                gather = Gather(
                    input="speech",
                    action=f"{settings.BASE_URL}/api/v1/calls/process-response",
                    method="POST",
                    speech_timeout=self.speech_timeout,
                    timeout=10
                )
                gather.say(
                    "Please say yes if you've completed it, or no if you haven't.",
                    voice="alice",
                    rate="0.9"
                )
                response.append(gather)
                
                # Fallback if no response
                response.say(
                    "I didn't hear a response. I'll send you a notification instead. Keep up the great work!",
                    voice="alice",
                    rate="0.9"
                )
            
            elif call_stage == "clarification":
                # Ask for clarification
                response.say(
                    "I didn't quite understand. Could you please say 'yes' if you completed the task, or 'no' if you haven't?",
                    voice="alice",
                    rate="0.9"
                )
                
                gather = Gather(
                    input="speech",
                    action=f"{settings.BASE_URL}/api/v1/calls/process-response",
                    method="POST",
                    speech_timeout=self.speech_timeout,
                    timeout=8
                )
                gather.say("Yes or no?", voice="alice", rate="0.9")
                response.append(gather)
                
                response.say("Thank you. Keep working on your goals!", voice="alice", rate="0.9")
            
            return str(response)
            
        except Exception as e:
            logger.error(f"Error generating TwiML: {str(e)}")
            
            # Fallback TwiML
            response = VoiceResponse()
            response.say(
                "Hi! This is your task reminder from Callivate. Please check your app for details. Have a great day!",
                voice="alice",
                rate="0.9"
            )
            return str(response)
    
    async def handle_call_response(
        self,
        call_sid: str,
        user_response: str,
        task_id: str = None,
        call_stage: str = "initial"
    ) -> Dict[str, Any]:
        """
        Process user's speech response using AI and generate appropriate TwiML
        """
        try:
            # Validate user response
            validation = await self.ai_service.validate_user_response(user_response)
            
            if not validation["is_valid"]:
                # Invalid response - ask for clarification
                return {
                    "success": True,
                    "needs_clarification": True,
                    "ai_response": "I didn't quite understand that. Could you please say yes or no?",
                    "call_stage": "clarification",
                    "task_completed": None
                }
            
            # Get task details for context
            task_title = "your task"
            user_name = "User"
            
            if task_id:
                task_data = await self._get_task_details(task_id)
                task_title = task_data.get("title", task_title)
                user_name = task_data.get("user_name", user_name)
            
            # Process response with AI
            ai_result = await self.ai_service.process_task_completion_response(
                user_response=validation["cleaned_text"],
                task_title=task_title,
                user_name=user_name
            )
            
            if ai_result["success"]:
                # Update task completion if determined
                if ai_result["task_completed"] is not None and task_id:
                    await self._update_task_completion(
                        task_id=task_id,
                        completed=ai_result["task_completed"],
                        call_sid=call_sid,
                        user_response=user_response,
                        ai_confidence=ai_result["confidence"]
                    )
                
                # Log call result
                await self._log_call_result(
                    call_sid=call_sid,
                    task_id=task_id,
                    user_response=user_response,
                    task_completed=ai_result["task_completed"],
                    ai_confidence=ai_result["confidence"],
                    ai_response=ai_result["ai_response"]
                )
                
                return {
                    "success": True,
                    "task_completed": ai_result["task_completed"],
                    "ai_response": ai_result["ai_response"],
                    "confidence": ai_result["confidence"],
                    "sentiment": ai_result.get("sentiment", "neutral"),
                    "call_stage": "complete"
                }
            else:
                # AI processing failed - use fallback
                return {
                    "success": True,
                    "task_completed": None,
                    "ai_response": "Thank you for the update! Keep working on your goals!",
                    "confidence": 0.5,
                    "fallback_used": True,
                    "call_stage": "complete"
                }
                
        except Exception as e:
            logger.error(f"Error handling call response: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "ai_response": "Thank you for taking my call. Keep up the great work!",
                "call_stage": "complete"
            }
    
    async def get_call_status(self, call_sid: str) -> Dict[str, Any]:
        """
        Get detailed call status from Twilio and database
        """
        try:
            if not self.twilio_client:
                return {"status": "service_unavailable"}
            
            # Get status from Twilio
            call = self.twilio_client.calls(call_sid).fetch()
            
            # Get additional data from database
            supabase = get_supabase()
            call_response = supabase.table("calls").select("*").eq("call_sid", call_sid).execute()
            call_data = call_response.data[0] if call_response.data else {}
            
            return {
                "call_sid": call_sid,
                "status": call.status,
                "direction": call.direction,
                "start_time": call.start_time.isoformat() if call.start_time else None,
                "end_time": call.end_time.isoformat() if call.end_time else None,
                "duration": call.duration,
                "price": call.price,
                "price_unit": call.price_unit,
                "answered_by": call.answered_by,
                "task_completed": call_data.get("task_completed"),
                "user_response": call_data.get("user_response"),
                "ai_confidence": call_data.get("ai_confidence")
            }
            
        except Exception as e:
            logger.error(f"Error getting call status: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def process_call_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process Twilio webhook for call status updates
        """
        try:
            call_sid = webhook_data.get("CallSid")
            call_status = webhook_data.get("CallStatus")
            
            if not call_sid:
                return {"success": False, "error": "Missing CallSid"}
            
            # Update call record in database
            supabase = get_supabase()
            update_data = {
                "status": call_status,
                "updated_at": "now()"
            }
            
            # Add additional data based on status
            if call_status == "completed":
                update_data.update({
                    "end_time": webhook_data.get("CallEndTime"),
                    "duration": webhook_data.get("CallDuration"),
                    "price": webhook_data.get("CallPrice"),
                    "answered_by": webhook_data.get("AnsweredBy")
                })
            elif call_status == "answered":
                update_data["start_time"] = webhook_data.get("CallStartTime")
            
            response = supabase.table("calls").update(update_data).eq("call_sid", call_sid).execute()
            
            # Trigger post-call processing for completed calls
            if call_status == "completed":
                await self._post_call_processing(call_sid, webhook_data)
            
            logger.info(f"Updated call {call_sid} status to {call_status}")
            
            return {
                "success": True,
                "call_sid": call_sid,
                "status": call_status,
                "updated": True
            }
            
        except Exception as e:
            logger.error(f"Error processing webhook: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_call_analytics(self, user_id: str = None, days: int = 30) -> Dict[str, Any]:
        """
        Get call analytics and cost summary
        """
        try:
            supabase = get_supabase()
            
            # Build query
            query = supabase.table("calls").select("*")
            if user_id:
                query = query.eq("user_id", user_id)
            
            # Get calls from last N days
            from_date = (datetime.now() - timedelta(days=days)).isoformat()
            query = query.gte("created_at", from_date)
            
            response = query.execute()
            calls = response.data
            
            # Calculate analytics
            total_calls = len(calls)
            successful_calls = len([c for c in calls if c.get("status") == "completed"])
            answered_calls = len([c for c in calls if c.get("answered_by") in ["human", "machine"]])
            
            # Task completion analytics
            completed_tasks = len([c for c in calls if c.get("task_completed") is True])
            incomplete_tasks = len([c for c in calls if c.get("task_completed") is False])
            
            # Cost analytics
            total_cost = sum(float(c.get("price", 0) or 0) for c in calls)
            avg_call_duration = sum(int(c.get("duration", 0) or 0) for c in calls) / max(total_calls, 1)
            
            # Success rates
            answer_rate = (answered_calls / max(total_calls, 1)) * 100
            completion_rate = (successful_calls / max(total_calls, 1)) * 100
            task_completion_rate = (completed_tasks / max(answered_calls, 1)) * 100
            
            return {
                "period_days": days,
                "total_calls": total_calls,
                "answered_calls": answered_calls,
                "successful_calls": successful_calls,
                "rates": {
                    "answer_rate": round(answer_rate, 1),
                    "completion_rate": round(completion_rate, 1),
                    "task_completion_rate": round(task_completion_rate, 1)
                },
                "task_outcomes": {
                    "completed": completed_tasks,
                    "incomplete": incomplete_tasks,
                    "unclear": answered_calls - completed_tasks - incomplete_tasks
                },
                "cost_analysis": {
                    "total_cost": round(total_cost, 4),
                    "avg_cost_per_call": round(total_cost / max(total_calls, 1), 4),
                    "avg_call_duration": round(avg_call_duration, 1),
                    "estimated_monthly_cost": round(total_cost * (30 / days), 4)
                },
                "ai_performance": {
                    "avg_confidence": self._calculate_avg_confidence(calls),
                    "fallback_usage": len([c for c in calls if c.get("fallback_used")])
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting call analytics: {str(e)}")
            return {
                "error": str(e),
                "total_calls": 0,
                "success_rate": 0,
                "cost_analysis": {"total_cost": 0}
            }
    
    # Private helper methods
    
    async def _get_call_context(self, user_id: str, task_id: str) -> Dict[str, Any]:
        """Get context information for personalizing the call"""
        try:
            supabase = get_supabase()
            
            context = {}
            
            # Get user's current streak
            if user_id:
                streak_response = supabase.table("streaks").select("current_streak").eq("user_id", user_id).execute()
                context["current_streak"] = streak_response.data[0]["current_streak"] if streak_response.data else 0
            
            # Check if task is recurring
            if task_id:
                task_response = supabase.table("tasks").select("recurrence_pattern").eq("id", task_id).execute()
                context["is_recurring"] = bool(task_response.data[0].get("recurrence_pattern")) if task_response.data else False
            
            # Check if user missed yesterday
            yesterday = (datetime.now() - timedelta(days=1)).date()
            missed_response = supabase.table("task_executions").select("id").eq("user_id", user_id).eq("date", yesterday.isoformat()).eq("completed", False).execute()
            context["missed_yesterday"] = len(missed_response.data) > 0
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting call context: {str(e)}")
            return {}
    
    async def _create_call_record(self, **kwargs) -> Dict[str, Any]:
        """Create a call record in the database"""
        try:
            supabase = get_supabase()
            
            call_data = {
                "id": str(uuid.uuid4()),
                "created_at": "now()",
                **kwargs
            }
            
            response = supabase.table("calls").insert(call_data).execute()
            return response.data[0] if response.data else call_data
            
        except Exception as e:
            logger.error(f"Error creating call record: {str(e)}")
            return {"id": str(uuid.uuid4()), **kwargs}
    
    async def _get_task_details(self, task_id: str) -> Dict[str, Any]:
        """Get task details for call context"""
        try:
            supabase = get_supabase()
            response = supabase.table("tasks").select("title, users!inner(full_name)").eq("id", task_id).execute()
            
            if response.data:
                task = response.data[0]
                return {
                    "title": task.get("title", "your task"),
                    "user_name": task.get("users", {}).get("full_name", "User")
                }
            
            return {"title": "your task", "user_name": "User"}
            
        except Exception as e:
            logger.error(f"Error getting task details: {str(e)}")
            return {"title": "your task", "user_name": "User"}
    
    async def _update_task_completion(self, task_id: str, completed: bool, **kwargs):
        """Update task completion based on call result"""
        try:
            supabase = get_supabase()
            
            # Create or update task execution
            execution_data = {
                "task_id": task_id,
                "completed": completed,
                "completion_method": "call",
                "date": datetime.now().date().isoformat(),
                "metadata": {
                    "call_sid": kwargs.get("call_sid"),
                    "user_response": kwargs.get("user_response"),
                    "ai_confidence": kwargs.get("ai_confidence")
                },
                "created_at": "now()"
            }
            
            response = supabase.table("task_executions").insert(execution_data).execute()
            logger.info(f"Updated task {task_id} completion: {completed}")
            
        except Exception as e:
            logger.error(f"Error updating task completion: {str(e)}")
    
    async def _log_call_result(self, call_sid: str, **kwargs):
        """Log detailed call results"""
        try:
            supabase = get_supabase()
            
            update_data = {
                "task_completed": kwargs.get("task_completed"),
                "user_response": kwargs.get("user_response"),
                "ai_response": kwargs.get("ai_response"),
                "ai_confidence": kwargs.get("ai_confidence"),
                "updated_at": "now()"
            }
            
            response = supabase.table("calls").update(update_data).eq("call_sid", call_sid).execute()
            
        except Exception as e:
            logger.error(f"Error logging call result: {str(e)}")
    
    async def _post_call_processing(self, call_sid: str, webhook_data: Dict[str, Any]):
        """Process call completion tasks"""
        try:
            # Update streak if task was completed
            # Send follow-up notifications if needed
            # Update user analytics
            pass
            
        except Exception as e:
            logger.error(f"Error in post-call processing: {str(e)}")
    
    def _calculate_avg_confidence(self, calls: List[Dict[str, Any]]) -> float:
        """Calculate average AI confidence from calls"""
        confidences = [c.get("ai_confidence", 0) for c in calls if c.get("ai_confidence")]
        return round(sum(confidences) / max(len(confidences), 1), 2) 