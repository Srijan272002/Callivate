"""
Task Execution Engine for Callivate
Handles scheduled task processing, call timing, follow-ups, and notifications
Integrates with Supabase for real-time data processing
"""

import asyncio
import logging
from datetime import datetime, timedelta, time, date
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from enum import Enum
import json
import pytz

from supabase import Client
from app.core.database import get_supabase
from app.services.calling_service import CallingService
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    MISSED = "missed"
    FAILED = "failed"
    SKIPPED = "skipped"

class ExecutionMethod(Enum):
    CALL = "call"
    NOTIFICATION = "notification"
    MANUAL = "manual"

@dataclass
class TaskExecution:
    id: str
    task_id: str
    user_id: str
    scheduled_at: datetime
    status: TaskStatus
    executed_at: Optional[datetime] = None
    completion_method: Optional[ExecutionMethod] = None
    call_duration: Optional[int] = None
    follow_up_attempted: bool = False
    follow_up_at: Optional[datetime] = None
    response_text: Optional[str] = None

class TaskExecutionEngine:
    """
    Core engine for processing scheduled tasks and managing executions
    """
    
    def __init__(self):
        self.supabase = get_supabase()
        self.calling_service = CallingService()
        self.notification_service = NotificationService()
        self.is_running = False
        self._execution_cache = {}
        
    async def start_engine(self):
        """Start the task execution engine"""
        if self.is_running:
            logger.warning("Task execution engine is already running")
            return
            
        self.is_running = True
        logger.info("Starting task execution engine...")
        
        # Start concurrent tasks without blocking
        self._tasks = [
            asyncio.create_task(self._scheduled_task_processor()),
            asyncio.create_task(self._follow_up_processor()),
            asyncio.create_task(self._missed_task_processor()),
            asyncio.create_task(self._cleanup_processor()),
        ]
        
        logger.info("✅ Task execution engine started successfully")
    
    async def stop_engine(self):
        """Stop the task execution engine"""
        self.is_running = False
        
        # Cancel all background tasks
        if hasattr(self, '_tasks'):
            for task in self._tasks:
                if not task.done():
                    task.cancel()
            
            # Wait for tasks to complete cancellation
            if self._tasks:
                await asyncio.gather(*self._tasks, return_exceptions=True)
        
        logger.info("Task execution engine stopped")
    
    async def _scheduled_task_processor(self):
        """Main loop for processing scheduled tasks"""
        while self.is_running:
            try:
                await self._process_pending_tasks()
                await asyncio.sleep(30)  # Check every 30 seconds
            except Exception as e:
                logger.error(f"Error in scheduled task processor: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    async def _process_pending_tasks(self):
        """Process all pending tasks that are due"""
        current_time = datetime.now(pytz.UTC)
        
        # Get tasks scheduled for execution within the next minute
        end_time = current_time + timedelta(minutes=1)
        
        try:
            # Query pending task executions
            response = self.supabase.table("task_executions").select(
                "*, tasks!inner(*, users!inner(*))"
            ).eq("status", "pending").lte(
                "scheduled_at", end_time.isoformat()
            ).gte(
                "scheduled_at", current_time.isoformat()
            ).execute()
            
            if response.data:
                for execution_data in response.data:
                    await self._execute_task(execution_data)
                    
        except Exception as e:
            logger.error(f"Error fetching pending tasks: {e}")
    
    async def _execute_task(self, execution_data: Dict[str, Any]):
        """Execute a single task"""
        try:
            task_execution = self._parse_task_execution(execution_data)
            task = execution_data.get("tasks", {})
            user = task.get("users", {})
            
            logger.info(f"Executing task {task_execution.task_id} for user {task_execution.user_id}")
            
            # Update status to processing
            await self._update_execution_status(task_execution.id, "processing")
            
            # Determine execution method based on task settings
            if task.get("silent_mode", False):
                success = await self._execute_notification(task_execution, task, user)
            else:
                success = await self._execute_call(task_execution, task, user)
            
            if success:
                await self._mark_task_completed(task_execution, task)
            else:
                await self._schedule_follow_up(task_execution, task)
                
        except Exception as e:
            logger.error(f"Error executing task: {e}")
            await self._mark_task_failed(execution_data.get("id"), str(e))
    
    async def _execute_call(self, execution: TaskExecution, task: Dict, user: Dict) -> bool:
        """Execute task via AI voice call"""
        try:
            phone_number = user.get("phone_number")
            if not phone_number:
                logger.warning(f"No phone number for user {execution.user_id}")
                return await self._execute_notification(execution, task, user)
            
            # Get user timezone
            timezone = user.get("timezone", "UTC")
            local_time = datetime.now(pytz.timezone(timezone))
            
            # Check if it's appropriate calling time (7 AM - 10 PM local time)
            if not self._is_appropriate_calling_time(local_time):
                logger.info(f"Inappropriate calling time for user {execution.user_id}")
                return await self._execute_notification(execution, task, user)
            
            # Initiate AI call
            call_result = await self.calling_service.initiate_ai_call(
                user_id=execution.user_id,
                task_id=execution.task_id,
                phone_number=phone_number,
                task_title=task.get("title", "Your scheduled task"),
                task_description=task.get("description", ""),
                voice_id=task.get("voice_id")
            )
            
            if call_result.get("success"):
                # Update execution with call details
                await self._update_execution_call_details(
                    execution.id,
                    call_result.get("call_duration", 0),
                    call_result.get("response_text", "")
                )
                return True
            else:
                logger.warning(f"Call failed for task {execution.task_id}: {call_result.get('error')}")
                return False
                
        except Exception as e:
            logger.error(f"Error executing call: {e}")
            return False
    
    async def _execute_notification(self, execution: TaskExecution, task: Dict, user: Dict) -> bool:
        """Execute task via notification"""
        try:
            success = await self.notification_service.send_task_notification(
                user_id=execution.user_id,
                task_id=execution.task_id,
                title=task.get("title", "Task Reminder"),
                message=task.get("description", "It's time for your scheduled task!"),
                scheduled_time=execution.scheduled_at
            )
            
            if success:
                await self._update_execution_method(execution.id, ExecutionMethod.NOTIFICATION)
                return True
            else:
                return False
                
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            return False
    
    async def _follow_up_processor(self):
        """Process follow-up actions for incomplete tasks"""
        while self.is_running:
            try:
                await self._process_follow_ups()
                await asyncio.sleep(300)  # Check every 5 minutes
            except Exception as e:
                logger.error(f"Error in follow-up processor: {e}")
                await asyncio.sleep(600)
    
    async def _process_follow_ups(self):
        """Process follow-up reminders"""
        current_time = datetime.now(pytz.UTC)
        
        try:
            # Get executions that need follow-up
            response = self.supabase.table("task_executions").select(
                "*, tasks!inner(*, users!inner(*))"
            ).eq("status", "pending").eq(
                "follow_up_attempted", False
            ).lte(
                "follow_up_at", current_time.isoformat()
            ).not_.is_("follow_up_at", "null").execute()
            
            if response.data:
                for execution_data in response.data:
                    await self._send_follow_up(execution_data)
                    
        except Exception as e:
            logger.error(f"Error processing follow-ups: {e}")
    
    async def _send_follow_up(self, execution_data: Dict[str, Any]):
        """Send follow-up reminder"""
        try:
            execution_id = execution_data.get("id")
            task = execution_data.get("tasks", {})
            user = task.get("users", {})
            
            # Send follow-up notification
            success = await self.notification_service.send_follow_up_notification(
                user_id=user.get("id"),
                task_id=task.get("id"),
                title=f"Follow-up: {task.get('title', 'Task Reminder')}",
                message="Don't forget about your scheduled task!"
            )
            
            if success:
                # Mark follow-up as attempted
                self.supabase.table("task_executions").update({
                    "follow_up_attempted": True
                }).eq("id", execution_id).execute()
                
        except Exception as e:
            logger.error(f"Error sending follow-up: {e}")
    
    async def _missed_task_processor(self):
        """Process and mark missed tasks"""
        while self.is_running:
            try:
                await self._mark_missed_tasks()
                await asyncio.sleep(600)  # Check every 10 minutes
            except Exception as e:
                logger.error(f"Error in missed task processor: {e}")
                await asyncio.sleep(1200)
    
    async def _mark_missed_tasks(self):
        """Mark tasks as missed if not completed within grace period"""
        grace_period = timedelta(hours=2)  # 2-hour grace period
        cutoff_time = datetime.now(pytz.UTC) - grace_period
        
        try:
            # Mark pending tasks as missed
            response = self.supabase.table("task_executions").update({
                "status": "missed"
            }).eq("status", "pending").lte(
                "scheduled_at", cutoff_time.isoformat()
            ).execute()
            
            if response.data:
                logger.info(f"Marked {len(response.data)} tasks as missed")
                
                # Update streak information for affected users
                for execution in response.data:
                    await self._update_user_streak_on_miss(execution.get("user_id"))
                    
        except Exception as e:
            logger.error(f"Error marking missed tasks: {e}")
    
    async def _cleanup_processor(self):
        """Clean up old data and optimize performance"""
        while self.is_running:
            try:
                await self._cleanup_old_executions()
                await asyncio.sleep(86400)  # Run daily
            except Exception as e:
                logger.error(f"Error in cleanup processor: {e}")
                await asyncio.sleep(43200)  # Retry in 12 hours
    
    async def _cleanup_old_executions(self):
        """Clean up old task executions (older than 90 days)"""
        cutoff_date = datetime.now(pytz.UTC) - timedelta(days=90)
        
        try:
            response = self.supabase.table("task_executions").delete().lte(
                "created_at", cutoff_date.isoformat()
            ).execute()
            
            if response.data:
                logger.info(f"Cleaned up {len(response.data)} old task executions")
                
        except Exception as e:
            logger.error(f"Error cleaning up old executions: {e}")
    
    # Utility methods
    
    def _parse_task_execution(self, data: Dict[str, Any]) -> TaskExecution:
        """Parse task execution data"""
        return TaskExecution(
            id=data.get("id"),
            task_id=data.get("task_id"),
            user_id=data.get("user_id"),
            scheduled_at=datetime.fromisoformat(data.get("scheduled_at").replace("Z", "+00:00")),
            status=TaskStatus(data.get("status", "pending")),
            executed_at=datetime.fromisoformat(data.get("executed_at").replace("Z", "+00:00")) if data.get("executed_at") else None,
            completion_method=ExecutionMethod(data.get("completion_method")) if data.get("completion_method") else None,
            call_duration=data.get("call_duration"),
            follow_up_attempted=data.get("follow_up_attempted", False),
            follow_up_at=datetime.fromisoformat(data.get("follow_up_at").replace("Z", "+00:00")) if data.get("follow_up_at") else None,
            response_text=data.get("response_text")
        )
    
    def _is_appropriate_calling_time(self, local_time: datetime) -> bool:
        """Check if it's appropriate time for calling (7 AM - 10 PM local time)"""
        hour = local_time.hour
        return 7 <= hour <= 22
    
    async def _update_execution_status(self, execution_id: str, status: str):
        """Update execution status"""
        try:
            self.supabase.table("task_executions").update({
                "status": status
            }).eq("id", execution_id).execute()
        except Exception as e:
            logger.error(f"Error updating execution status: {e}")
    
    async def _update_execution_method(self, execution_id: str, method: ExecutionMethod):
        """Update execution method"""
        try:
            self.supabase.table("task_executions").update({
                "completion_method": method.value,
                "executed_at": datetime.now(pytz.UTC).isoformat()
            }).eq("id", execution_id).execute()
        except Exception as e:
            logger.error(f"Error updating execution method: {e}")
    
    async def _update_execution_call_details(self, execution_id: str, duration: int, response_text: str):
        """Update execution with call details"""
        try:
            self.supabase.table("task_executions").update({
                "call_duration": duration,
                "response_text": response_text,
                "executed_at": datetime.now(pytz.UTC).isoformat()
            }).eq("id", execution_id).execute()
        except Exception as e:
            logger.error(f"Error updating call details: {e}")
    
    async def _mark_task_completed(self, execution: TaskExecution, task: Dict):
        """Mark task as completed and update streaks"""
        try:
            self.supabase.table("task_executions").update({
                "status": "completed",
                "executed_at": datetime.now(pytz.UTC).isoformat()
            }).eq("id", execution.id).execute()
            
            # Update task's last completion time
            self.supabase.table("tasks").update({
                "last_completed_at": datetime.now(pytz.UTC).isoformat()
            }).eq("id", execution.task_id).execute()
            
            # Update user streak
            await self._update_user_streak_on_completion(execution.user_id)
            
        except Exception as e:
            logger.error(f"Error marking task completed: {e}")
    
    async def _mark_task_failed(self, execution_id: str, error_message: str):
        """Mark task as failed"""
        try:
            self.supabase.table("task_executions").update({
                "status": "failed",
                "response_text": error_message
            }).eq("id", execution_id).execute()
        except Exception as e:
            logger.error(f"Error marking task failed: {e}")
    
    async def _schedule_follow_up(self, execution: TaskExecution, task: Dict):
        """Schedule follow-up reminder"""
        try:
            follow_up_time = datetime.now(pytz.UTC) + timedelta(minutes=30)
            
            self.supabase.table("task_executions").update({
                "follow_up_at": follow_up_time.isoformat()
            }).eq("id", execution.id).execute()
            
        except Exception as e:
            logger.error(f"Error scheduling follow-up: {e}")
    
    async def _update_user_streak_on_completion(self, user_id: str):
        """Update user streak on task completion"""
        try:
            today = date.today()
            
            # Get current streak data
            streak_response = self.supabase.table("streaks").select("*").eq(
                "user_id", user_id
            ).execute()
            
            if streak_response.data:
                streak_data = streak_response.data[0]
                current_streak = streak_data.get("current_streak", 0)
                longest_streak = streak_data.get("longest_streak", 0)
                last_completion = streak_data.get("last_completion_date")
                total_completions = streak_data.get("total_completions", 0)
                
                # Check if this is a consecutive day
                if last_completion:
                    last_date = date.fromisoformat(last_completion)
                    if today == last_date:
                        # Same day, don't update streak count but increment completions
                        pass
                    elif today == last_date + timedelta(days=1):
                        # Consecutive day, increment streak
                        current_streak += 1
                        longest_streak = max(longest_streak, current_streak)
                    else:
                        # Streak broken, reset
                        current_streak = 1
                else:
                    # First completion
                    current_streak = 1
                    longest_streak = 1
                
                # Update streak data
                self.supabase.table("streaks").update({
                    "current_streak": current_streak,
                    "longest_streak": longest_streak,
                    "last_completion_date": today.isoformat(),
                    "total_completions": total_completions + 1,
                    "updated_at": datetime.now(pytz.UTC).isoformat()
                }).eq("user_id", user_id).execute()
                
        except Exception as e:
            logger.error(f"Error updating user streak: {e}")
    
    async def _update_user_streak_on_miss(self, user_id: str):
        """Update user streak on task miss (reset current streak)"""
        try:
            # Reset current streak to 0
            self.supabase.table("streaks").update({
                "current_streak": 0,
                "updated_at": datetime.now(pytz.UTC).isoformat()
            }).eq("user_id", user_id).execute()
            
        except Exception as e:
            logger.error(f"Error updating streak on miss: {e}")

    # Public methods for background manager compatibility
    async def process_pending_executions(self):
        """Public method to process pending task executions"""
        try:
            await self._process_pending_tasks()
            logger.debug("✅ Pending executions processing completed")
        except Exception as e:
            logger.error(f"❌ Error processing pending executions: {e}")
            raise

# Global instance
task_engine = TaskExecutionEngine()

async def start_task_engine():
    """Start the global task execution engine"""
    await task_engine.start_engine()

async def stop_task_engine():
    """Stop the global task execution engine"""
    await task_engine.stop_engine() 