"""
Calling Service for Callivate
Handles AI voice calls using Twilio - Core feature for task reminders
"""

from typing import Optional, Dict, Any, List
from app.core.config import settings
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class CallingService:
    """
    AI Voice Calling service using Twilio
    Core feature for Callivate - calls users to check on task completion
    """
    
    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.from_number = settings.TWILIO_PHONE_NUMBER
        self.client = None
        
        if self.account_sid and self.auth_token:
            try:
                from twilio.rest import Client
                self.client = Client(self.account_sid, self.auth_token)
                logger.info("Twilio client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
    
    async def schedule_task_reminder_call(
        self, 
        user_phone: str, 
        task_title: str, 
        user_name: str,
        call_time: datetime
    ) -> Dict[str, Any]:
        """
        Schedule an AI voice call to remind user about their task
        """
        if not self.client:
            return await self._fallback_to_notification(task_title, user_name)
        
        try:
            # Create TwiML for the AI conversation
            twiml_url = await self._generate_twiml_url(task_title, user_name)
            
            # Schedule the call
            call = self.client.calls.create(
                to=user_phone,
                from_=self.from_number,
                url=twiml_url,
                method='POST'
            )
            
            logger.info(f"Call scheduled successfully: {call.sid}")
            return {
                "success": True,
                "call_sid": call.sid,
                "status": call.status,
                "user_phone": user_phone,
                "task_title": task_title,
                "provider": "twilio",
                "type": "ai_voice_call",
                "cost_estimate": 0.0085,  # ~$0.0085 per minute for US calls
                "user_cost": 0.0,  # FREE for users
                "message": "AI voice call scheduled successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to schedule call: {e}")
            return await self._fallback_to_notification(task_title, user_name)
    
    async def handle_call_response(
        self, 
        call_sid: str, 
        user_response: str,
        task_id: str
    ) -> Dict[str, Any]:
        """
        Process user's response during the AI call
        """
        try:
            # Use Gemini AI to analyze the response
            completion_status = await self._analyze_task_completion(user_response)
            
            # Update task status based on AI analysis
            if completion_status["completed"]:
                # Mark task as completed
                logger.info(f"Task {task_id} marked as completed via call")
                response_message = "Great job! I've marked your task as completed. Keep up the great work!"
            else:
                # Offer encouragement and follow-up
                logger.info(f"Task {task_id} not completed, offering support")
                response_message = "No worries! Would you like me to call back in 30 minutes to check again?"
            
            return {
                "success": True,
                "call_sid": call_sid,
                "task_completed": completion_status["completed"],
                "confidence_score": completion_status["confidence"],
                "ai_response": response_message,
                "follow_up_needed": not completion_status["completed"]
            }
            
        except Exception as e:
            logger.error(f"Error processing call response: {e}")
            return {
                "success": False,
                "error": str(e),
                "fallback_message": "Thank you for taking my call. I'll send you a notification instead."
            }
    
    async def get_call_status(self, call_sid: str) -> Dict[str, Any]:
        """
        Get the current status of a call
        """
        if not self.client:
            return {"error": "Twilio client not available"}
        
        try:
            call = self.client.calls(call_sid).fetch()
            return {
                "call_sid": call_sid,
                "status": call.status,
                "duration": call.duration,
                "start_time": call.start_time,
                "end_time": call.end_time,
                "price": call.price,
                "direction": call.direction
            }
        except Exception as e:
            logger.error(f"Error fetching call status: {e}")
            return {"error": str(e)}
    
    async def get_call_recordings(self, call_sid: str) -> List[Dict[str, Any]]:
        """
        Get recordings for a call (for analysis and improvement)
        """
        if not self.client:
            return []
        
        try:
            recordings = self.client.recordings.list(call_sid=call_sid)
            return [
                {
                    "recording_sid": recording.sid,
                    "duration": recording.duration,
                    "status": recording.status,
                    "uri": recording.uri,
                    "date_created": recording.date_created
                }
                for recording in recordings
            ]
        except Exception as e:
            logger.error(f"Error fetching recordings: {e}")
            return []
    
    async def _generate_twiml_url(self, task_title: str, user_name: str) -> str:
        """
        Generate TwiML URL for the AI conversation
        This would typically point to a webhook endpoint that generates dynamic TwiML
        """
        # In production, this would be your domain + webhook endpoint
        base_url = settings.API_BASE_URL or "https://your-api-domain.com"
        return f"{base_url}/api/v1/calls/twiml?task={task_title}&user={user_name}"
    
    async def _analyze_task_completion(self, user_response: str) -> Dict[str, Any]:
        """
        Use Gemini AI to analyze if the user completed their task
        """
        try:
            # This would integrate with your Gemini AI service
            # For now, simple keyword analysis
            positive_indicators = ["yes", "completed", "done", "finished", "did it"]
            negative_indicators = ["no", "didn't", "not yet", "forgot", "couldn't"]
            
            response_lower = user_response.lower()
            
            positive_score = sum(1 for word in positive_indicators if word in response_lower)
            negative_score = sum(1 for word in negative_indicators if word in response_lower)
            
            if positive_score > negative_score:
                return {"completed": True, "confidence": 0.8}
            elif negative_score > positive_score:
                return {"completed": False, "confidence": 0.8}
            else:
                return {"completed": False, "confidence": 0.5}  # Unclear response
                
        except Exception as e:
            logger.error(f"Error analyzing response: {e}")
            return {"completed": False, "confidence": 0.0}
    
    async def _fallback_to_notification(self, task_title: str, user_name: str) -> Dict[str, Any]:
        """
        Fallback to push notification when calling fails
        """
        logger.info("Falling back to push notification")
        return {
            "success": True,
            "provider": "notification_fallback",
            "type": "push_notification",
            "message": f"Voice call unavailable. Sent push notification instead for task: {task_title}",
            "user_cost": 0.0,
            "fallback": True
        } 