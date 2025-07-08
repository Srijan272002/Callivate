"""
AI & Voice Service for Callivate
Integrates Gemini 2.0 Flash AI with free-first voice approach
"""

from typing import Optional, Dict, Any, List, Tuple
from app.core.config import settings
from app.core.database import get_supabase
import google.generativeai as genai
import logging
import json
import re
from datetime import datetime, timedelta
import requests
import base64

logger = logging.getLogger(__name__)

class AIService:
    """
    AI service using Gemini 2.0 Flash for conversation and task processing
    """
    
    def __init__(self):
        # Configure Gemini AI
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        else:
            self.model = None
            logger.warning("Gemini API key not configured")
    
    async def process_task_completion_response(self, user_response: str, task_title: str, user_name: str = "User") -> Dict[str, Any]:
        """
        Process user's response about task completion using Gemini AI
        """
        if not self.model:
            return {
                "success": False,
                "error": "AI service not configured",
                "fallback_response": "Thank you for the update!"
            }
        
        try:
            prompt = f"""
            You are an AI assistant for Callivate, a productivity app. A user just responded to a call about completing their task.

            TASK: {task_title}
            USER'S RESPONSE: "{user_response}"
            USER'S NAME: {user_name}

            Analyze the user's response and determine:
            1. Did they complete the task? (yes/no/unclear)
            2. Generate an appropriate, encouraging response (max 30 words)
            3. Any follow-up action needed?

            Respond in JSON format:
            {{
                "task_completed": true/false/null,
                "confidence": 0.0-1.0,
                "response_message": "your encouraging message",
                "follow_up_needed": true/false,
                "sentiment": "positive/neutral/negative"
            }}

            Be encouraging regardless of completion status. If unclear, ask for clarification politely.
            """
            
            response = self.model.generate_content(prompt)
            result = json.loads(response.text)
            
            # Validate and sanitize response
            return {
                "success": True,
                "task_completed": result.get("task_completed"),
                "confidence": min(max(result.get("confidence", 0.5), 0.0), 1.0),
                "ai_response": result.get("response_message", "Thank you for the update!"),
                "follow_up_needed": result.get("follow_up_needed", False),
                "sentiment": result.get("sentiment", "neutral"),
                "processed_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing AI response: {str(e)}")
            
            # Fallback logic for when AI fails
            response_lower = user_response.lower()
            task_completed = None
            
            if any(word in response_lower for word in ["yes", "yeah", "done", "completed", "finished", "yep"]):
                task_completed = True
                ai_response = f"Great job completing {task_title}! Keep up the excellent work!"
            elif any(word in response_lower for word in ["no", "not", "didn't", "haven't", "nope"]):
                task_completed = False
                ai_response = f"No worries! You still have time to work on {task_title}. You've got this!"
            else:
                ai_response = "Thanks for the update! Keep working towards your goals!"
            
            return {
                "success": True,
                "task_completed": task_completed,
                "confidence": 0.7 if task_completed is not None else 0.3,
                "ai_response": ai_response,
                "follow_up_needed": task_completed is None,
                "sentiment": "positive",
                "fallback_used": True
            }
    
    async def generate_call_script(self, task_title: str, user_name: str, call_context: Dict[str, Any] = None) -> str:
        """
        Generate personalized call script using Gemini AI
        """
        if not self.model:
            return f"Hi {user_name}! This is your AI assistant from Callivate. Have you completed your task: {task_title}?"
        
        try:
            context_info = ""
            if call_context:
                if call_context.get("is_recurring"):
                    context_info += "This is a recurring task. "
                if call_context.get("missed_yesterday"):
                    context_info += "You missed this task yesterday. "
                if call_context.get("current_streak"):
                    context_info += f"Your current streak is {call_context['current_streak']} days. "
            
            prompt = f"""
            Generate a friendly, encouraging phone call script for a productivity app called Callivate.
            
            USER: {user_name}
            TASK: {task_title}
            CONTEXT: {context_info}
            
            Requirements:
            - Keep it under 25 words
            - Be warm and encouraging
            - Ask clearly about task completion
            - Sound natural for voice synthesis
            
            Return only the script text, no quotes or formatting.
            """
            
            response = self.model.generate_content(prompt)
            return response.text.strip().strip('"')
            
        except Exception as e:
            logger.error(f"Error generating call script: {str(e)}")
            return f"Hi {user_name}! This is your AI assistant from Callivate. Have you completed your task: {task_title}?"
    
    async def validate_user_response(self, response_text: str) -> Dict[str, Any]:
        """
        Validate and clean user response using AI
        """
        if not response_text or len(response_text.strip()) == 0:
            return {
                "is_valid": False,
                "cleaned_text": "",
                "confidence": 0.0,
                "validation_reason": "empty_response"
            }
        
        # Basic validation without AI if needed
        cleaned = re.sub(r'[^\w\s]', '', response_text).strip()
        
        if len(cleaned) < 2:
            return {
                "is_valid": False,
                "cleaned_text": cleaned,
                "confidence": 0.0,
                "validation_reason": "too_short"
            }
        
        return {
            "is_valid": True,
            "cleaned_text": cleaned,
            "confidence": 0.8,
            "validation_reason": "valid"
        }

class VoiceService:
    """
    Voice service that prioritizes free browser TTS with premium upgrades
    """
    
    def __init__(self):
        self.use_browser_tts = settings.USE_BROWSER_TTS
        self.ai_service = AIService()
        self.elevenlabs_client = None
        if settings.ELEVENLABS_API_KEY:
            self.elevenlabs_client = self._init_elevenlabs()
        
    def _init_elevenlabs(self):
        """Initialize ElevenLabs client"""
        return {
            "api_key": settings.ELEVENLABS_API_KEY,
            "base_url": "https://api.elevenlabs.io/v1",
            "headers": {
                "Accept": "application/json",
                "xi-api-key": settings.ELEVENLABS_API_KEY
            }
        }
    
    async def get_available_voices(self, include_premium: bool = False, user_id: str = None) -> List[Dict[str, Any]]:
        """
        Get list of available voices with personalized recommendations
        """
        voices = []
        
        # Always include browser voices (FREE) - prioritized
        browser_voices = [
            {
                "id": "browser-default-female",
                "name": "Browser Female Voice",
                "provider": "browser",
                "category": "standard",
                "language_code": "en-US",
                "gender": "female",
                "personality": ["friendly", "professional"],
                "is_premium": False,
                "is_recommended": True,
                "is_free": True,
                "description": "Uses your device's built-in female voice (completely free)",
                "features": ["Cross-platform", "No API costs", "Instant playback"],
                "quality_score": 7.5
            },
            {
                "id": "browser-default-male", 
                "name": "Browser Male Voice",
                "provider": "browser",
                "category": "standard",
                "language_code": "en-US", 
                "gender": "male",
                "personality": ["friendly", "professional"],
                "is_premium": False,
                "is_recommended": True,
                "is_free": True,
                "description": "Uses your device's built-in male voice (completely free)",
                "features": ["Cross-platform", "No API costs", "Instant playback"],
                "quality_score": 7.5
            },
            {
                "id": "browser-default-neutral",
                "name": "Browser Neutral Voice", 
                "provider": "browser",
                "category": "standard",
                "language_code": "en-US",
                "gender": "neutral",
                "personality": ["calm", "professional"],
                "is_premium": False,
                "is_recommended": True,
                "is_free": True,
                "description": "Uses your device's built-in neutral voice (completely free)",
                "features": ["Cross-platform", "No API costs", "Instant playback"],
                "quality_score": 7.5
            }
        ]
        voices.extend(browser_voices)
        
        # Add premium voices if requested and API keys available
        if include_premium:
            if settings.ELEVENLABS_API_KEY:
                voices.extend(await self._get_elevenlabs_voices())
            if settings.OPENAI_API_KEY:
                voices.extend(await self._get_openai_voices())
            if settings.GOOGLE_TTS_API_KEY:
                voices.extend(await self._get_google_voices())
        
        # Add user-specific recommendations if user_id provided
        if user_id:
            voices = await self._add_user_recommendations(voices, user_id)
                
        return voices
    
    async def generate_voice_preview(self, voice_id: str, text: str = None, user_id: str = None) -> Dict[str, Any]:
        """
        Generate voice preview with AI-enhanced sample text
        """
        if not text:
            text = "Hi! This is your AI assistant from Callivate. Have you completed your task today?"
        
        if voice_id.startswith("browser-"):
            return {
                "voice_id": voice_id,
                "preview_type": "browser",
                "text": text,
                "instructions": "This will use your device's built-in voice synthesis",
                "cost": 0.0,
                "is_free": True,
                "browser_config": {
                    "rate": 0.9,
                    "pitch": 1.0,
                    "volume": 1.0
                }
            }
        elif voice_id.startswith("elevenlabs-"):
            return await self._generate_elevenlabs_preview(voice_id, text)
        
        # For other premium voices, return configuration for API calls
        return await self._generate_premium_preview(voice_id, text)
    
    async def get_voice_recommendations(self, user_id: str, task_context: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Get personalized voice recommendations based on user preferences and usage
        """
        try:
            supabase = get_supabase()
            
            # Get user's voice usage history
            usage_response = supabase.table("task_executions").select("""
                task_id,
                tasks!inner(voice_id)
            """).eq("user_id", user_id).eq("completion_method", "call").limit(50).execute()
            
            # Get user settings
            settings_response = supabase.table("user_settings").select("*").eq("user_id", user_id).execute()
            user_settings = settings_response.data[0] if settings_response.data else {}
            
            # Analyze usage patterns
            voice_usage = {}
            if usage_response.data:
                for execution in usage_response.data:
                    voice_id = execution.get("tasks", {}).get("voice_id")
                    if voice_id:
                        voice_usage[voice_id] = voice_usage.get(voice_id, 0) + 1
            
            # Get all available voices
            all_voices = await self.get_available_voices(include_premium=True, user_id=user_id)
            
            recommendations = []
            
            # Prioritize free browser voices
            for voice in all_voices:
                if voice["provider"] == "browser":
                    match_score = 0.9  # High score for free voices
                    reasons = ["Completely free", "Works on all devices"]
                    
                    if voice["id"] == user_settings.get("default_voice_id"):
                        match_score = 0.95
                        reasons.append("Your current default")
                    
                    if voice["id"] in voice_usage:
                        match_score += 0.1
                        reasons.append(f"You've used this {voice_usage[voice['id']]} times")
                    
                    recommendations.append({
                        "voice": voice,
                        "match_score": min(match_score, 1.0),
                        "reasons": reasons,
                        "is_suggested": True
                    })
            
            # Add premium recommendations if user has used premium voices before
            if any(not v["is_free"] for v in all_voices if v["id"] in voice_usage):
                for voice in all_voices:
                    if voice["is_premium"] and voice["id"] in voice_usage:
                        recommendations.append({
                            "voice": voice,
                            "match_score": 0.7,
                            "reasons": [f"Used {voice_usage[voice['id']]} times", "Premium quality"],
                            "is_suggested": False
                        })
            
            # Sort by match score
            recommendations.sort(key=lambda x: x["match_score"], reverse=True)
            
            return recommendations[:5]  # Top 5 recommendations
            
        except Exception as e:
            logger.error(f"Error getting voice recommendations: {str(e)}")
            
            # Fallback recommendations (browser voices)
            return [
                {
                    "voice": {
                        "id": "browser-default-female",
                        "name": "Browser Female Voice",
                        "provider": "browser",
                        "is_free": True
                    },
                    "match_score": 0.9,
                    "reasons": ["Completely free", "Works everywhere"],
                    "is_suggested": True
                }
            ]
    
    async def _get_elevenlabs_voices(self) -> List[Dict[str, Any]]:
        """Get ElevenLabs voices from their API"""
        if not self.elevenlabs_client:
            return []
        
        try:
            # Fetch voices from ElevenLabs API
            response = requests.get(
                f"{self.elevenlabs_client['base_url']}/voices",
                headers=self.elevenlabs_client["headers"]
            )
            
            if response.status_code == 200:
                api_voices = response.json().get("voices", [])
                voices = []
                
                for voice in api_voices:
                    voices.append({
                        "id": f"elevenlabs-{voice['voice_id']}",
                        "name": f"{voice['name']} (ElevenLabs)",
                        "provider": "elevenlabs",
                        "category": "premium",
                        "language_code": "en-US",
                        "gender": self._determine_gender(voice['name']),
                        "personality": voice.get('labels', {}).get('descriptive', []),
                        "is_premium": True,
                        "is_free": False,
                        "description": f"ElevenLabs AI voice: {voice['name']}",
                        "features": ["Natural speech", "Emotion control", "Custom training"],
                        "quality_score": 9.2,
                        "cost_per_character": 0.0001,
                        "elevenlabs_voice_id": voice['voice_id'],
                        "preview_url": voice.get('preview_url')
                    })
                
                return voices
            else:
                logger.warning(f"ElevenLabs API error: {response.status_code}")
                return self._get_fallback_elevenlabs_voices()
                
        except Exception as e:
            logger.error(f"Error fetching ElevenLabs voices: {e}")
            return self._get_fallback_elevenlabs_voices()
    
    def _get_fallback_elevenlabs_voices(self) -> List[Dict[str, Any]]:
        """Fallback ElevenLabs voices if API is unavailable"""
        return [
            {
                "id": "elevenlabs-rachel",
                "name": "Rachel (ElevenLabs)",
                "provider": "elevenlabs", 
                "category": "premium",
                "language_code": "en-US",
                "gender": "female",
                "personality": ["professional", "clear", "articulate"],
                "is_premium": True,
                "is_free": False,
                "description": "High-quality AI voice with natural intonation",
                "features": ["Natural speech", "Emotion control", "Custom training"],
                "quality_score": 9.2,
                "cost_per_character": 0.0001,
                "elevenlabs_voice_id": "21m00Tcm4TlvDq8ikWAM"
            },
            {
                "id": "elevenlabs-adam",
                "name": "Adam (ElevenLabs)",
                "provider": "elevenlabs",
                "category": "premium", 
                "language_code": "en-US",
                "gender": "male",
                "personality": ["deep", "authoritative", "professional"],
                "is_premium": True,
                "is_free": False,
                "description": "Professional male voice with authority",
                "features": ["Natural speech", "Emotion control", "Custom training"],
                "quality_score": 9.1,
                "cost_per_character": 0.0001,
                "elevenlabs_voice_id": "pNInz6obpgDQGcFmaJgB"
            }
        ]
    
    def _determine_gender(self, voice_name: str) -> str:
        """Determine gender from voice name"""
        female_names = ['rachel', 'bella', 'elli', 'natasha', 'dorothy', 'sarah']
        male_names = ['adam', 'antoni', 'arnold', 'clyde', 'dave', 'ethan', 'fin', 'giovanni', 'josh', 'sam']
        
        name_lower = voice_name.lower()
        if any(name in name_lower for name in female_names):
            return "female"
        elif any(name in name_lower for name in male_names):
            return "male"
        else:
            return "neutral"
    
    async def _generate_elevenlabs_preview(self, voice_id: str, text: str) -> Dict[str, Any]:
        """Generate ElevenLabs voice preview"""
        if not self.elevenlabs_client:
            return {"error": "ElevenLabs not configured"}
        
        # Extract actual ElevenLabs voice ID
        elevenlabs_voice_id = voice_id.replace("elevenlabs-", "")
        
        try:
            # Generate audio using ElevenLabs API
            url = f"{self.elevenlabs_client['base_url']}/text-to-speech/{elevenlabs_voice_id}"
            
            data = {
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.5
                }
            }
            
            response = requests.post(
                url,
                json=data,
                headers={**self.elevenlabs_client["headers"], "Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                # Convert audio to base64 for frontend playback
                audio_base64 = base64.b64encode(response.content).decode('utf-8')
                
                return {
                    "voice_id": voice_id,
                    "preview_type": "elevenlabs",
                    "text": text,
                    "audio_data": audio_base64,
                    "audio_format": "mp3",
                    "cost": len(text) * 0.0001,
                    "is_free": False,
                    "quality": "premium",
                    "duration_estimate": len(text) * 0.05  # Rough estimate
                }
            else:
                logger.error(f"ElevenLabs TTS error: {response.status_code}")
                return {"error": "Failed to generate preview"}
                
        except Exception as e:
            logger.error(f"Error generating ElevenLabs preview: {e}")
            return {"error": str(e)}

    async def synthesize_speech(self, voice_id: str, text: str) -> Dict[str, Any]:
        """Synthesize speech for actual use (calls, etc.)"""
        if voice_id.startswith("browser-"):
            return {
                "type": "browser",
                "text": text,
                "config": {
                    "rate": 0.9,
                    "pitch": 1.0,
                    "volume": 1.0
                }
            }
        elif voice_id.startswith("elevenlabs-"):
            return await self._synthesize_elevenlabs(voice_id, text)
        else:
            return await self._synthesize_other_premium(voice_id, text)
    
    async def _synthesize_elevenlabs(self, voice_id: str, text: str) -> Dict[str, Any]:
        """Synthesize speech using ElevenLabs"""
        if not self.elevenlabs_client:
            return {"error": "ElevenLabs not configured"}
        
        elevenlabs_voice_id = voice_id.replace("elevenlabs-", "")
        
        try:
            url = f"{self.elevenlabs_client['base_url']}/text-to-speech/{elevenlabs_voice_id}"
            
            data = {
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": 0.6,
                    "similarity_boost": 0.8,
                    "style": 0.0,
                    "use_speaker_boost": True
                }
            }
            
            response = requests.post(
                url,
                json=data,
                headers={**self.elevenlabs_client["headers"], "Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                audio_base64 = base64.b64encode(response.content).decode('utf-8')
                
                return {
                    "type": "elevenlabs",
                    "audio_data": audio_base64,
                    "audio_format": "mp3",
                    "cost": len(text) * 0.0001,
                    "character_count": len(text)
                }
            else:
                logger.error(f"ElevenLabs synthesis error: {response.status_code}")
                return {"error": "Synthesis failed"}
                
        except Exception as e:
            logger.error(f"Error in ElevenLabs synthesis: {e}")
            return {"error": str(e)}

    async def _synthesize_other_premium(self, voice_id: str, text: str) -> Dict[str, Any]:
        """Synthesize speech using other premium providers (OpenAI, Google)"""
        if voice_id.startswith("openai-"):
            return {
                "type": "openai",
                "text": text,
                "voice_id": voice_id.replace("openai-", ""),
                "cost": len(text) * 0.000015
            }
        elif voice_id.startswith("google-"):
            return {
                "type": "google",
                "text": text,
                "voice_id": voice_id,
                "cost": len(text) * 0.000016
            }
        else:
            return {"error": "Unknown voice provider"}

    async def _get_openai_voices(self) -> List[Dict[str, Any]]:
        """Get OpenAI TTS voices (premium)"""
        if not settings.OPENAI_API_KEY:
            return []
        
        openai_voices = [
            {"id": "alloy", "gender": "neutral", "personality": ["professional", "clear"]},
            {"id": "echo", "gender": "male", "personality": ["deep", "authoritative"]},
            {"id": "fable", "gender": "neutral", "personality": ["warm", "storytelling"]},
            {"id": "onyx", "gender": "male", "personality": ["deep", "professional"]},
            {"id": "nova", "gender": "female", "personality": ["energetic", "bright"]},
            {"id": "shimmer", "gender": "female", "personality": ["soft", "gentle"]}
        ]
        
        return [
            {
                "id": f"openai-{voice['id']}",
                "name": f"{voice['id'].title()} (OpenAI)",
                "provider": "openai",
                "category": "neural", 
                "language_code": "en-US",
                "gender": voice["gender"],
                "personality": voice["personality"],
                "is_premium": True,
                "is_free": False,
                "description": f"OpenAI TTS voice: {voice['id']}",
                "features": ["High quality", "Fast generation", "Consistent output"],
                "quality_score": 8.8,
                "cost_per_character": 0.000015
            }
            for voice in openai_voices
        ]
    
    async def _get_google_voices(self) -> List[Dict[str, Any]]:
        """Get Google Cloud TTS voices (premium)"""
        if not settings.GOOGLE_TTS_API_KEY:
            return []
        
        return [
            {
                "id": "google-wavenet-us-female-1",
                "name": "Google WaveNet US Female",
                "provider": "google",
                "category": "premium",
                "language_code": "en-US",
                "gender": "female",
                "personality": ["clear", "professional"],
                "is_premium": True,
                "is_free": False,
                "description": "Google Cloud premium neural voice",
                "features": ["WaveNet technology", "Natural prosody", "Multiple emotions"],
                "quality_score": 8.5,
                "cost_per_character": 0.000016
            },
            {
                "id": "google-wavenet-us-male-1", 
                "name": "Google WaveNet US Male",
                "provider": "google",
                "category": "premium",
                "language_code": "en-US",
                "gender": "male",
                "personality": ["authoritative", "professional"],
                "is_premium": True,
                "is_free": False,
                "description": "Google Cloud premium neural voice",
                "features": ["WaveNet technology", "Natural prosody", "Multiple emotions"],
                "quality_score": 8.5,
                "cost_per_character": 0.000016
            }
        ]
    
    async def _generate_premium_preview(self, voice_id: str, text: str) -> Dict[str, Any]:
        """Generate preview for premium voices"""
        provider = voice_id.split('-')[0]
        
        base_response = {
            "voice_id": voice_id,
            "preview_type": "api",
            "text": text,
            "is_free": False
        }
        
        if provider == "elevenlabs":
            base_response.update({
                "cost": len(text) * 0.0001,
                "estimated_quality": 9.2,
                "api_endpoint": "/api/v1/voice/elevenlabs/generate",
                "features": ["High quality", "Natural intonation"]
            })
        elif provider == "openai":
            base_response.update({
                "cost": len(text) * 0.000015,
                "estimated_quality": 8.8,
                "api_endpoint": "/api/v1/voice/openai/generate",
                "features": ["Fast generation", "Consistent quality"]
            })
        elif provider == "google":
            base_response.update({
                "cost": len(text) * 0.000016,
                "estimated_quality": 8.5,
                "api_endpoint": "/api/v1/voice/google/generate",
                "features": ["WaveNet technology", "Natural prosody"]
            })
        
        return base_response
    
    async def _add_user_recommendations(self, voices: List[Dict[str, Any]], user_id: str) -> List[Dict[str, Any]]:
        """Add user-specific recommendations to voice list"""
        try:
            supabase = get_supabase()
            
            # Get user's default voice
            settings_response = supabase.table("user_settings").select("default_voice_id").eq("user_id", user_id).execute()
            default_voice_id = settings_response.data[0]["default_voice_id"] if settings_response.data else None
            
            # Mark user's default voice
            for voice in voices:
                if voice["id"] == default_voice_id:
                    voice["is_user_default"] = True
                    voice["is_recommended"] = True
                
                # Add recommendation flags for free voices
                if voice["provider"] == "browser":
                    voice["recommendation_reason"] = "Free and works on all devices"
            
            return voices
            
        except Exception as e:
            logger.error(f"Error adding user recommendations: {str(e)}")
            return voices 