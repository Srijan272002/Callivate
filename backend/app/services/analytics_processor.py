"""
Enhanced Analytics Processor for Callivate
Handles monthly analytics generation, completion rate calculations,
usage pattern analysis, and performance trend tracking
"""

import asyncio
import logging
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import statistics

from supabase import Client
from app.core.database import get_supabase

logger = logging.getLogger(__name__)

@dataclass
class UserAnalytics:
    user_id: str
    month_year: str
    tasks_completed: int
    tasks_missed: int
    completion_rate: float
    longest_streak: int
    most_used_voice_id: Optional[str]
    total_call_duration: int

class AnalyticsProcessor:
    """Enhanced analytics processor for generating insights and trends"""
    
    def __init__(self):
        self.supabase = get_supabase()
        self.is_running = False
    
    async def start_processor(self):
        """Start the analytics processor"""
        if self.is_running:
            return
            
        self.is_running = True
        logger.info("Starting analytics processor...")
        
        # Start concurrent tasks without blocking
        self._tasks = [
            asyncio.create_task(self._monthly_analytics_generator()),
            asyncio.create_task(self._performance_tracker()),
        ]
        
        logger.info("✅ Analytics processor started successfully")
    
    async def stop_processor(self):
        """Stop the analytics processor"""
        self.is_running = False
        
        # Cancel all background tasks
        if hasattr(self, '_tasks'):
            for task in self._tasks:
                if not task.done():
                    task.cancel()
            
            # Wait for tasks to complete cancellation
            if self._tasks:
                await asyncio.gather(*self._tasks, return_exceptions=True)
        
        logger.info("Analytics processor stopped")
    
    async def _monthly_analytics_generator(self):
        """Generate monthly analytics for all users"""
        while self.is_running:
            try:
                await self._generate_monthly_analytics()
                await self._wait_until_next_day()
            except Exception as e:
                logger.error(f"Error in monthly analytics generator: {e}")
                await asyncio.sleep(3600)
    
    async def _generate_monthly_analytics(self):
        """Generate analytics for the current month"""
        current_date = date.today()
        month_year = current_date.strftime("%Y-%m")
        
        users_response = self.supabase.table("users").select("id").execute()
        
        if not users_response.data:
            return
        
        logger.info(f"Generating monthly analytics for {len(users_response.data)} users")
        
        for user in users_response.data:
            try:
                await self._generate_user_monthly_analytics(user["id"], month_year)
            except Exception as e:
                logger.error(f"Error generating analytics for user {user['id']}: {e}")
    
    async def _generate_user_monthly_analytics(self, user_id: str, month_year: str):
        """Generate monthly analytics for a specific user"""
        try:
            year, month = map(int, month_year.split("-"))
            start_date = date(year, month, 1)
            end_date = date(year, month + 1, 1) - timedelta(days=1) if month < 12 else date(year, 12, 31)
            
            # Get executions for the month
            executions_response = self.supabase.table("task_executions").select("*").eq(
                "user_id", user_id
            ).gte("scheduled_at", start_date.isoformat()).lte(
                "scheduled_at", end_date.isoformat()
            ).execute()
            
            executions = executions_response.data or []
            
            # Get streak data
            streaks_response = self.supabase.table("streaks").select("*").eq(
                "user_id", user_id
            ).execute()
            
            streaks_data = streaks_response.data[0] if streaks_response.data else {}
            
            # Calculate analytics
            completed_executions = [e for e in executions if e.get("status") == "completed"]
            missed_executions = [e for e in executions if e.get("status") == "missed"]
            
            tasks_completed = len(completed_executions)
            tasks_missed = len(missed_executions)
            total_tasks = tasks_completed + tasks_missed
            completion_rate = (tasks_completed / total_tasks * 100) if total_tasks > 0 else 0
            
            # Voice usage analysis
            voice_usage = {}
            total_call_duration = 0
            
            for execution in completed_executions:
                voice_id = execution.get("voice_id", "default")
                voice_usage[voice_id] = voice_usage.get(voice_id, 0) + 1
                
                call_duration = execution.get("call_duration", 0)
                if call_duration:
                    total_call_duration += call_duration
            
            most_used_voice_id = max(voice_usage, key=voice_usage.get) if voice_usage else None
            
            analytics = UserAnalytics(
                user_id=user_id,
                month_year=month_year,
                tasks_completed=tasks_completed,
                tasks_missed=tasks_missed,
                completion_rate=round(completion_rate, 2),
                longest_streak=streaks_data.get("longest_streak", 0),
                most_used_voice_id=most_used_voice_id,
                total_call_duration=total_call_duration
            )
            
            await self._save_user_analytics(analytics)
            
        except Exception as e:
            logger.error(f"Error generating user analytics: {e}")
    
    async def _save_user_analytics(self, analytics: UserAnalytics):
        """Save user analytics to database"""
        try:
            data = {
                "user_id": analytics.user_id,
                "month_year": analytics.month_year,
                "tasks_completed": analytics.tasks_completed,
                "tasks_missed": analytics.tasks_missed,
                "completion_rate": analytics.completion_rate,
                "longest_streak": analytics.longest_streak,
                "most_used_voice_id": analytics.most_used_voice_id,
                "total_call_duration": analytics.total_call_duration,
                "updated_at": datetime.now().isoformat()
            }
            
            self.supabase.table("analytics").upsert(data).execute()
            
        except Exception as e:
            logger.error(f"Error saving user analytics: {e}")
    
    async def _performance_tracker(self):
        """Track system performance metrics"""
        while self.is_running:
            try:
                await self._track_system_performance()
                await asyncio.sleep(3600)  # Run hourly
            except Exception as e:
                logger.error(f"Error in performance tracker: {e}")
                await asyncio.sleep(1800)
    
    async def _track_system_performance(self):
        """Track system-wide performance"""
        try:
            current_time = datetime.now()
            start_time = current_time - timedelta(hours=24)
            
            # Get executions in last 24 hours
            executions_response = self.supabase.table("task_executions").select("*").gte(
                "scheduled_at", start_time.isoformat()
            ).lte("scheduled_at", current_time.isoformat()).execute()
            
            executions = executions_response.data or []
            
            total_executions = len(executions)
            completed_executions = len([e for e in executions if e.get("status") == "completed"])
            system_completion_rate = (completed_executions / total_executions * 100) if total_executions > 0 else 0
            
            logger.info(f"System performance: {total_executions} executions, "
                       f"{system_completion_rate:.2f}% completion rate")
            
        except Exception as e:
            logger.error(f"Error tracking system performance: {e}")
    
    async def _wait_until_next_day(self):
        """Wait until next day to run analytics"""
        now = datetime.now()
        next_run = now.replace(hour=2, minute=0, second=0, microsecond=0) + timedelta(days=1)
        sleep_seconds = (next_run - now).total_seconds()
        await asyncio.sleep(sleep_seconds)

    # Public methods for background manager compatibility
    async def process_daily_analytics(self):
        """Public method to trigger daily analytics processing"""
        try:
            await self._generate_monthly_analytics()
            logger.info("✅ Daily analytics processing completed")
        except Exception as e:
            logger.error(f"❌ Error in daily analytics processing: {e}")
            raise

    async def process_system_metrics(self):
        """Public method to trigger system metrics processing"""
        try:
            await self._track_system_performance()
            logger.info("✅ System metrics processing completed")
        except Exception as e:
            logger.error(f"❌ Error in system metrics processing: {e}")
            raise

# Global instance
analytics_processor = AnalyticsProcessor()

async def start_analytics_processor():
    """Start the global analytics processor"""
    await analytics_processor.start_processor()

async def stop_analytics_processor():
    """Stop the global analytics processor"""
    await analytics_processor.stop_processor() 