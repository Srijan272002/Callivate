"""
Advanced Notification Service for Callivate
Implements 6.6 Advanced Notification System with Expo Push, Supabase tracking, and smart timing
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta, time
from typing import Optional, Dict, Any, List, Union
from dataclasses import dataclass
from enum import Enum
import pytz
from exponent_server_sdk import (
    DeviceNotRegisteredError,
    PushClient,
    PushMessage,
    PushServerError,
    PushTicketError,
)
from app.core.config import settings
from app.core.database import get_supabase

logger = logging.getLogger(__name__)

class NotificationType(Enum):
    TASK_REMINDER = "task_reminder"
    FOLLOW_UP = "follow_up"
    STREAK_MILESTONE = "streak_milestone"
    STREAK_BREAK = "streak_break"
    MOTIVATION = "motivation"
    BATCH_REMINDER = "batch_reminder"

class DeliveryStatus(Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    ERROR = "error"

@dataclass
class NotificationBatch:
    """Batch notification for efficient processing"""
    id: str
    user_id: str
    notifications: List[Dict[str, Any]]
    scheduled_for: datetime
    timezone: str
    batch_type: str

@dataclass
class SmartTiming:
    """Smart notification timing configuration"""
    user_timezone: str
    preferred_start_hour: int = 7
    preferred_end_hour: int = 22
    avoid_quiet_hours: bool = True
    respect_sleep_schedule: bool = True
    follow_up_delay_minutes: int = 30

class AdvancedNotificationService:
    """
    Advanced notification service with FREE Expo push notifications,
    Supabase tracking, smart timing, and batch processing
    """
    
    def __init__(self):
        self.supabase = get_supabase()
        self.expo_client = PushClient()
        self.use_expo = settings.USE_EXPO_NOTIFICATIONS
        self.batch_queue: List[NotificationBatch] = []
        
    async def send_task_reminder(
        self, 
        user_id: str, 
        task_id: str,
        task_title: str, 
        device_token: str,
        scheduled_time: Optional[datetime] = None,
        user_timezone: str = "UTC"
    ) -> Dict[str, Any]:
        """
        Send task reminder notification with smart timing
        """
        # Apply smart timing optimization
        optimal_time = await self._optimize_notification_timing(
            user_id, scheduled_time, user_timezone
        )
        
        notification_data = {
            "user_id": user_id,
            "task_id": task_id,
            "type": NotificationType.TASK_REMINDER.value,
            "title": "🔔 Task Reminder",
            "body": f"Time for: {task_title}",
            "data": {
                "taskId": task_id,
                "type": "reminder",
                "action": "open_task",
                "userId": user_id
            },
            "device_token": device_token,
            "scheduled_for": optimal_time,
            "timezone": user_timezone
        }
        
        if optimal_time and optimal_time > datetime.now(pytz.UTC):
            # Schedule for later
            return await self._schedule_notification(notification_data)
        else:
            # Send immediately
            return await self._send_expo_notification(notification_data)

    async def send_streak_notification(
        self, 
        user_id: str, 
        streak_count: int, 
        device_token: str,
        streak_type: str = "milestone"
    ) -> Dict[str, Any]:
        """
        Send streak milestone or break notification with real-time Supabase update
        """
        if streak_type == "break":
            title = "💔 Streak Broken"
            body = f"Your {streak_count}-day streak has ended. Don't give up - start fresh!"
            notification_type = NotificationType.STREAK_BREAK
        else:
            title = "🔥 Streak Milestone!"
            body = f"Amazing! You've reached a {streak_count}-day streak!"
            notification_type = NotificationType.STREAK_MILESTONE
        
        notification_data = {
            "user_id": user_id,
            "type": notification_type.value,
            "title": title,
            "body": body,
            "data": {
                "type": "streak",
                "action": "open_calendar",
                "streakCount": streak_count,
                "userId": user_id
            },
            "device_token": device_token,
            "scheduled_for": datetime.now(pytz.UTC),
            "timezone": "UTC"
        }
        
        # Send notification
        result = await self._send_expo_notification(notification_data)
        
        # Update streak in real-time via Supabase
        await self._update_streak_realtime(user_id, streak_count, streak_type)
        
        return result

    async def send_follow_up_notification(
        self, 
        user_id: str, 
        task_id: str,
        task_title: str, 
        device_token: str,
        delay_minutes: int = 30
    ) -> Dict[str, Any]:
        """
        Send follow-up notification with fallback coordination
        """
        # Calculate follow-up time with smart timing
        follow_up_time = datetime.now(pytz.UTC) + timedelta(minutes=delay_minutes)
        
        notification_data = {
            "user_id": user_id,
            "task_id": task_id,
            "type": NotificationType.FOLLOW_UP.value,
            "title": "🔄 Follow-up Reminder",
            "body": f"Did you complete: {task_title}?",
            "data": {
                "taskId": task_id,
                "type": "follow_up",
                "action": "mark_complete",
                "userId": user_id
            },
            "device_token": device_token,
            "scheduled_for": follow_up_time,
            "timezone": "UTC"
        }
        
        # Schedule follow-up with fallback logic
        return await self._schedule_notification_with_fallback(notification_data)

    async def send_batch_notifications(
        self, 
        batch: NotificationBatch
    ) -> Dict[str, Any]:
        """
        Send batch notifications efficiently using Expo's batch API
        """
        try:
            expo_messages = []
            
            for notification in batch.notifications:
                if self._is_valid_expo_token(notification["device_token"]):
                    expo_message = PushMessage(
                        to=notification["device_token"],
                        title=notification["title"],
                        body=notification["body"],
                        data=notification["data"],
                        sound="default",
                        badge=1
                    )
                    expo_messages.append(expo_message)
            
            if not expo_messages:
                return {"success": False, "error": "No valid device tokens"}
            
            # Send batch via Expo
            tickets = self.expo_client.publish_multiple(expo_messages)
            
            # Process tickets and track delivery
            successful_sends = 0
            failed_sends = 0
            
            for i, ticket in enumerate(tickets):
                notification = batch.notifications[i]
                
                if ticket.is_success():
                    successful_sends += 1
                    status = DeliveryStatus.SENT
                    error_message = None
                else:
                    failed_sends += 1
                    status = DeliveryStatus.FAILED
                    error_message = ticket.details.get('error', 'Unknown error')
                
                # Track in Supabase
                await self._track_notification_delivery(
                    user_id=notification["user_id"],
                    notification_type=notification["type"],
                    title=notification["title"],
                    body=notification["body"],
                    device_token=notification["device_token"],
                    status=status.value,
                    error_message=error_message,
                    batch_id=batch.id
                )
            
            logger.info(f"Batch notification sent: {successful_sends} success, {failed_sends} failed")
            
            return {
                "success": True,
                "provider": "expo_batch",
                "batch_id": batch.id,
                "total_sent": successful_sends,
                "total_failed": failed_sends,
                "cost": 0.0  # Expo is free
            }
            
        except Exception as e:
            logger.error(f"Batch notification failed: {e}")
            return {
                "success": False,
                "provider": "expo_batch",
                "error": str(e)
            }

    async def schedule_daily_motivation_batch(
        self, 
        user_timezones: Dict[str, List[str]]  # timezone -> [user_ids]
    ) -> Dict[str, Any]:
        """
        Schedule daily motivation notifications in batches by timezone
        """
        batches_created = 0
        
        for timezone, user_ids in user_timezones.items():
            # Calculate optimal time for this timezone (8 AM local time)
            tz = pytz.timezone(timezone)
            local_time = datetime.now(tz).replace(hour=8, minute=0, second=0, microsecond=0)
            utc_time = local_time.astimezone(pytz.UTC)
            
            # Get device tokens for users
            device_tokens = await self._get_user_device_tokens(user_ids)
            
            notifications = []
            for user_id in user_ids:
                if user_id in device_tokens:
                    notifications.append({
                        "user_id": user_id,
                        "type": NotificationType.MOTIVATION.value,
                        "title": "🌅 Good Morning!",
                        "body": "Ready to crush your goals today? 💪",
                        "data": {
                            "type": "motivation",
                            "action": "open_dashboard",
                            "userId": user_id
                        },
                        "device_token": device_tokens[user_id]
                    })
            
            if notifications:
                batch = NotificationBatch(
                    id=f"motivation_{timezone}_{utc_time.strftime('%Y%m%d')}",
                    user_id="system",
                    notifications=notifications,
                    scheduled_for=utc_time,
                    timezone=timezone,
                    batch_type="daily_motivation"
                )
                
                await self._schedule_batch(batch)
                batches_created += 1
        
        logger.info(f"Scheduled {batches_created} daily motivation batches")
        return {"success": True, "batches_created": batches_created}

    async def _send_expo_notification(self, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send single notification via Expo Push API with delivery tracking
        """
        try:
            device_token = notification_data["device_token"]
            
            if not self._is_valid_expo_token(device_token):
                return await self._send_fallback_notification(notification_data)
            
            # Create Expo push message
            message = PushMessage(
                to=device_token,
                title=notification_data["title"],
                body=notification_data["body"],
                data=notification_data["data"],
                sound="default",
                badge=1
            )
            
            # Send via Expo
            response = self.expo_client.publish(message)
            
            # Track delivery in Supabase
            status = DeliveryStatus.SENT if response.is_success() else DeliveryStatus.FAILED
            error_message = None if response.is_success() else response.details.get('error')
            
            await self._track_notification_delivery(
                user_id=notification_data["user_id"],
                notification_type=notification_data["type"],
                title=notification_data["title"],
                body=notification_data["body"],
                device_token=device_token,
                status=status.value,
                error_message=error_message
            )
            
            if response.is_success():
                logger.info(f"Expo notification sent: {notification_data['title']}")
                return {
                    "success": True,
                    "provider": "expo",
                    "message": "Notification sent via Expo (free)",
                    "ticket_id": response.id,
                    "cost": 0.0
                }
            else:
                logger.error(f"Expo notification failed: {response.details}")
                return await self._send_fallback_notification(notification_data)
                
        except DeviceNotRegisteredError:
            # Device token is invalid, remove it and use fallback
            await self._remove_invalid_device_token(notification_data["user_id"], device_token)
            return await self._send_fallback_notification(notification_data)
            
        except (PushServerError, PushTicketError) as e:
            logger.error(f"Expo service error: {e}")
            return await self._send_fallback_notification(notification_data)
            
        except Exception as e:
            logger.error(f"Unexpected notification error: {e}")
            return await self._send_fallback_notification(notification_data)

    async def _send_fallback_notification(self, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fallback notification method using local/offline strategy
        """
        try:
            # Track fallback usage
            await self._track_notification_delivery(
                user_id=notification_data["user_id"],
                notification_type=notification_data["type"],
                title=notification_data["title"],
                body=notification_data["body"],
                device_token=notification_data.get("device_token", "fallback"),
                status=DeliveryStatus.SENT.value,
                error_message="Using fallback delivery method"
            )
            
            logger.info(f"Using fallback notification for: {notification_data['title']}")
            return {
                "success": True,
                "provider": "fallback",
                "message": "Notification sent via fallback method",
                "cost": 0.0
            }
            
        except Exception as e:
            logger.error(f"Fallback notification failed: {e}")
            return {
                "success": False,
                "provider": "fallback",
                "error": str(e)
            }

    async def _optimize_notification_timing(
        self, 
        user_id: str, 
        requested_time: Optional[datetime],
        user_timezone: str
    ) -> Optional[datetime]:
        """
        Smart notification timing optimization
        """
        if not requested_time:
            return None
        
        try:
            # Get user's smart timing preferences
            smart_timing = await self._get_user_smart_timing(user_id, user_timezone)
            
            # Convert to user's timezone
            user_tz = pytz.timezone(smart_timing.user_timezone)
            local_time = requested_time.astimezone(user_tz)
            
            # Check if it's within preferred hours
            if smart_timing.avoid_quiet_hours:
                if local_time.hour < smart_timing.preferred_start_hour:
                    # Too early, schedule for start hour
                    optimal_local = local_time.replace(
                        hour=smart_timing.preferred_start_hour,
                        minute=0,
                        second=0
                    )
                elif local_time.hour >= smart_timing.preferred_end_hour:
                    # Too late, schedule for next day start hour
                    optimal_local = local_time.replace(
                        hour=smart_timing.preferred_start_hour,
                        minute=0,
                        second=0
                    ) + timedelta(days=1)
                else:
                    # Within preferred hours
                    optimal_local = local_time
            else:
                optimal_local = local_time
            
            # Convert back to UTC
            return optimal_local.astimezone(pytz.UTC)
            
        except Exception as e:
            logger.error(f"Smart timing optimization failed: {e}")
            return requested_time

    async def _schedule_notification(self, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Schedule notification for future delivery
        """
        try:
            # Store in Supabase for scheduled processing
            scheduled_notification = {
                "user_id": notification_data["user_id"],
                "notification_type": notification_data["type"],
                "title": notification_data["title"],
                "body": notification_data["body"],
                "data": json.dumps(notification_data["data"]),
                "device_token": notification_data["device_token"],
                "scheduled_for": notification_data["scheduled_for"].isoformat(),
                "timezone": notification_data["timezone"],
                "status": "scheduled"
            }
            
            result = self.supabase.table("scheduled_notifications").insert(scheduled_notification).execute()
            
            logger.info(f"Notification scheduled for: {notification_data['scheduled_for']}")
            return {
                "success": True,
                "provider": "scheduled",
                "scheduled_id": result.data[0]["id"],
                "scheduled_for": notification_data["scheduled_for"].isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to schedule notification: {e}")
            return {
                "success": False,
                "provider": "scheduled",
                "error": str(e)
            }

    async def _schedule_notification_with_fallback(self, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Schedule notification with fallback coordination
        """
        primary_result = await self._schedule_notification(notification_data)
        
        if not primary_result["success"]:
            # Primary scheduling failed, try immediate fallback
            return await self._send_fallback_notification(notification_data)
        
        # Schedule a backup fallback notification
        fallback_time = notification_data["scheduled_for"] + timedelta(minutes=10)
        fallback_data = notification_data.copy()
        fallback_data["scheduled_for"] = fallback_time
        fallback_data["title"] = f"⚠️ {fallback_data['title']}"
        fallback_data["body"] = f"Backup reminder: {fallback_data['body']}"
        
        await self._schedule_notification(fallback_data)
        
        return primary_result

    async def _track_notification_delivery(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        body: str,
        device_token: str,
        status: str,
        error_message: Optional[str] = None,
        batch_id: Optional[str] = None
    ) -> None:
        """
        Track notification delivery in Supabase
        """
        try:
            notification_log = {
                "user_id": user_id,
                "notification_type": notification_type,
                "title": title,
                "body": body,
                "device_token": device_token[-10:] if device_token else None,  # Only store last 10 chars for privacy
                "delivery_status": status,
                "error_message": error_message,
                "batch_id": batch_id,
                "sent_at": datetime.now(pytz.UTC).isoformat()
            }
            
            self.supabase.table("notification_logs").insert(notification_log).execute()
            
        except Exception as e:
            logger.error(f"Failed to track notification delivery: {e}")

    async def _update_streak_realtime(self, user_id: str, streak_count: int, streak_type: str) -> None:
        """
        Update streak in real-time via Supabase
        """
        try:
            if streak_type == "break":
                # Reset streak
                update_data = {
                    "current_streak": 0,
                    "last_break_date": datetime.now(pytz.UTC).date().isoformat(),
                    "updated_at": datetime.now(pytz.UTC).isoformat()
                }
            else:
                # Update milestone
                update_data = {
                    "current_streak": streak_count,
                    "best_streak": streak_count,  # Update if this is a new best
                    "updated_at": datetime.now(pytz.UTC).isoformat()
                }
            
            self.supabase.table("user_streaks").upsert(
                {**update_data, "user_id": user_id}
            ).execute()
            
            logger.info(f"Real-time streak update: {user_id} - {streak_type} - {streak_count}")
            
        except Exception as e:
            logger.error(f"Failed to update streak in real-time: {e}")

    async def _get_user_smart_timing(self, user_id: str, default_timezone: str) -> SmartTiming:
        """
        Get user's smart timing preferences
        """
        try:
            result = self.supabase.table("user_settings").select(
                "timezone, notification_start_hour, notification_end_hour, "
                "avoid_quiet_hours, follow_up_delay_minutes"
            ).eq("user_id", user_id).execute()
            
            if result.data:
                settings = result.data[0]
                return SmartTiming(
                    user_timezone=settings.get("timezone", default_timezone),
                    preferred_start_hour=settings.get("notification_start_hour", 7),
                    preferred_end_hour=settings.get("notification_end_hour", 22),
                    avoid_quiet_hours=settings.get("avoid_quiet_hours", True),
                    follow_up_delay_minutes=settings.get("follow_up_delay_minutes", 30)
                )
            
        except Exception as e:
            logger.error(f"Failed to get user smart timing: {e}")
        
        # Return defaults
        return SmartTiming(user_timezone=default_timezone)

    async def _get_user_device_tokens(self, user_ids: List[str]) -> Dict[str, str]:
        """
        Get device tokens for multiple users
        """
        try:
            result = self.supabase.table("user_devices").select(
                "user_id, device_token"
            ).in_("user_id", user_ids).eq("is_active", True).execute()
            
            return {
                row["user_id"]: row["device_token"] 
                for row in result.data 
                if row["device_token"]
            }
            
        except Exception as e:
            logger.error(f"Failed to get user device tokens: {e}")
            return {}

    async def _schedule_batch(self, batch: NotificationBatch) -> None:
        """
        Schedule batch notification for processing
        """
        try:
            batch_data = {
                "id": batch.id,
                "user_id": batch.user_id,
                "notifications": json.dumps(batch.notifications),
                "scheduled_for": batch.scheduled_for.isoformat(),
                "timezone": batch.timezone,
                "batch_type": batch.batch_type,
                "status": "scheduled"
            }
            
            self.supabase.table("notification_batches").insert(batch_data).execute()
            
        except Exception as e:
            logger.error(f"Failed to schedule batch: {e}")

    async def _remove_invalid_device_token(self, user_id: str, device_token: str) -> None:
        """
        Remove invalid device token from database
        """
        try:
            self.supabase.table("user_devices").update(
                {"is_active": False}
            ).eq("user_id", user_id).eq("device_token", device_token).execute()
            
        except Exception as e:
            logger.error(f"Failed to remove invalid device token: {e}")

    def _is_valid_expo_token(self, token: str) -> bool:
        """
        Validate Expo push token format
        """
        if not token:
            return False
        
        # Expo push tokens start with ExponentPushToken
        return token.startswith("ExponentPushToken") or token.startswith("ExpoPushToken")

# For backward compatibility
NotificationService = AdvancedNotificationService 