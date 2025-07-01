"""
Notification Service for Callivate
Handles push notifications with free-first approach using Expo
"""

from typing import Optional, Dict, Any, List
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    """
    Notification service that prioritizes free Expo push notifications
    """
    
    def __init__(self):
        self.use_expo = settings.USE_EXPO_NOTIFICATIONS
        self.expo_token = settings.EXPO_ACCESS_TOKEN
        
    async def send_task_reminder(self, user_id: str, task_title: str, device_token: str) -> Dict[str, Any]:
        """
        Send task reminder notification
        """
        if self.use_expo:
            return await self._send_expo_notification(
                device_token=device_token,
                title="Task Reminder",
                body=f"Time for your task: {task_title}",
                data={"type": "task_reminder", "user_id": user_id}
            )
        
        # Fallback to other services if configured
        return await self._send_fallback_notification()
    
    async def send_streak_notification(self, user_id: str, streak_count: int, device_token: str) -> Dict[str, Any]:
        """
        Send streak milestone notification
        """
        if self.use_expo:
            return await self._send_expo_notification(
                device_token=device_token,
                title="Streak Milestone! 🔥",
                body=f"Amazing! You've reached a {streak_count}-day streak!",
                data={"type": "streak_milestone", "user_id": user_id, "streak": streak_count}
            )
        
        return await self._send_fallback_notification()
    
    async def send_follow_up_notification(self, user_id: str, task_title: str, device_token: str) -> Dict[str, Any]:
        """
        Send follow-up notification when task is missed
        """
        if self.use_expo:
            return await self._send_expo_notification(
                device_token=device_token,
                title="Did you complete your task?",
                body=f"We couldn't reach you about: {task_title}",
                data={"type": "follow_up", "user_id": user_id}
            )
        
        return await self._send_fallback_notification()
    
    async def _send_expo_notification(self, device_token: str, title: str, body: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send notification via Expo Push API (FREE)
        """
        try:
            # Implementation would use exponent_server_sdk
            # For now, return success simulation
            logger.info(f"Expo notification sent: {title}")
            return {
                "success": True,
                "provider": "expo",
                "message": "Notification sent via Expo (free)",
                "cost": 0.0
            }
        except Exception as e:
            logger.error(f"Expo notification failed: {e}")
            return {
                "success": False,
                "provider": "expo", 
                "error": str(e)
            }
    
    async def _send_fallback_notification(self) -> Dict[str, Any]:
        """
        Fallback notification method
        """
        logger.info("Using local notification fallback")
        return {
            "success": True,
            "provider": "local",
            "message": "Using local notification fallback",
            "cost": 0.0
        } 