"""
Enhanced Background Services Manager for Callivate
Includes 6.6 Advanced Notification System processing
"""

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import pytz

from app.core.database import get_supabase
from app.services.notification_service import AdvancedNotificationService, NotificationBatch
from app.services.analytics_processor import AnalyticsProcessor
from app.services.task_execution_engine import TaskExecutionEngine
from app.services.realtime_service import RealtimeService
from app.core.config import settings

logger = logging.getLogger(__name__)

class ServiceStatus(Enum):
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    ERROR = "error"

@dataclass
class ServiceHealth:
    name: str
    status: ServiceStatus
    last_run: Optional[datetime]
    error_count: int
    last_error: Optional[str]
    uptime_seconds: float

class EnhancedBackgroundManager:
    """
    Enhanced background services manager with notification processing
    """
    
    def __init__(self):
        self.supabase = get_supabase()
        self.notification_service = AdvancedNotificationService()
        self.analytics_processor = AnalyticsProcessor()
        self.task_engine = TaskExecutionEngine()
        self.realtime_service = RealtimeService()
        
        self.services = {}
        self.is_running = False
        self.start_time = None
        self._background_tasks = []
        
        # Service intervals (in seconds)
        self.intervals = {
            'notification_processor': 60,        # Process scheduled notifications every minute
            'batch_processor': 300,              # Process notification batches every 5 minutes
            'analytics_processor': 3600,         # Process analytics every hour
            'task_execution': 30,                # Check task executions every 30 seconds
            'realtime_monitor': 120,             # Monitor real-time connections every 2 minutes
            'cleanup_processor': 86400,          # Daily cleanup at midnight
        }

    async def start(self) -> None:
        """Start all background services"""
        try:
            if self.is_running:
                logger.warning("Background services already running")
                return

            self.is_running = True
            self.start_time = datetime.now(pytz.UTC)
            
            logger.info("🚀 Starting enhanced background services...")

            # Start individual services
            services_to_start = [
                ('notification_processor', self._notification_processor),
                ('batch_processor', self._batch_processor),
                ('analytics_processor', self._analytics_processor),
                ('task_execution', self._task_execution_processor),
                ('realtime_monitor', self._realtime_monitor),
                ('cleanup_processor', self._cleanup_processor),
            ]

            tasks = []
            for service_name, service_func in services_to_start:
                if settings.BACKGROUND_SERVICES_ENABLED:
                    task = asyncio.create_task(self._run_service(service_name, service_func))
                    tasks.append(task)
                    self.services[service_name] = {
                        'task': task,
                        'status': ServiceStatus.STARTING,
                        'last_run': None,
                        'error_count': 0,
                        'last_error': None,
                        'start_time': datetime.now(pytz.UTC)
                    }

            logger.info(f"✅ Started {len(tasks)} background services")

            # Store tasks for later management (don't await - they run indefinitely)
            # Background services will run in the background while the FastAPI server operates
            self._background_tasks = tasks

        except Exception as e:
            logger.error(f"❌ Failed to start background services: {e}")
            self.is_running = False

    async def stop(self) -> None:
        """Stop all background services gracefully"""
        try:
            logger.info("🛑 Stopping background services...")
            
            self.is_running = False

            # Cancel all service tasks
            for service_name, service_info in self.services.items():
                task = service_info.get('task')
                if task and not task.done():
                    task.cancel()
                    service_info['status'] = ServiceStatus.STOPPING

            # Also cancel tasks stored in _background_tasks
            for task in self._background_tasks:
                if not task.done():
                    task.cancel()

            # Wait for services to stop
            await asyncio.sleep(2)

            # Force cleanup
            for service_name, service_info in self.services.items():
                service_info['status'] = ServiceStatus.STOPPED

            logger.info("✅ Background services stopped")

        except Exception as e:
            logger.error(f"❌ Error stopping background services: {e}")

    async def get_health_status(self) -> Dict[str, Any]:
        """Get health status of all services"""
        try:
            current_time = datetime.now(pytz.UTC)
            uptime = (current_time - self.start_time).total_seconds() if self.start_time else 0

            health_data = {
                'manager_status': 'running' if self.is_running else 'stopped',
                'uptime_seconds': uptime,
                'start_time': self.start_time.isoformat() if self.start_time else None,
                'services': {}
            }

            for service_name, service_info in self.services.items():
                service_uptime = (current_time - service_info['start_time']).total_seconds()
                
                health_data['services'][service_name] = {
                    'status': service_info['status'].value,
                    'last_run': service_info['last_run'].isoformat() if service_info['last_run'] else None,
                    'error_count': service_info['error_count'],
                    'last_error': service_info['last_error'],
                    'uptime_seconds': service_uptime
                }

            return health_data

        except Exception as e:
            logger.error(f"❌ Error getting health status: {e}")
            return {'error': str(e)}

    def get_service_status(self) -> Dict[str, Any]:
        """Get service status (synchronous wrapper for get_health_status)"""
        try:
            # For synchronous access, return basic status info
            current_time = datetime.now(pytz.UTC)
            uptime = (current_time - self.start_time).total_seconds() if self.start_time else 0

            status_data = {
                'manager_status': 'running' if self.is_running else 'stopped',
                'uptime_seconds': uptime,
                'start_time': self.start_time.isoformat() if self.start_time else None,
                'services': {}
            }

            for service_name, service_info in self.services.items():
                service_uptime = (current_time - service_info['start_time']).total_seconds()
                
                status_data['services'][service_name] = {
                    'status': service_info['status'].value,
                    'last_run': service_info['last_run'].isoformat() if service_info['last_run'] else None,
                    'error_count': service_info['error_count'],
                    'last_error': service_info['last_error'],
                    'uptime_seconds': service_uptime
                }

            return status_data

        except Exception as e:
            logger.error(f"❌ Error getting service status: {e}")
            return {'error': str(e), 'manager_status': 'error'}

    async def _run_service(self, service_name: str, service_func) -> None:
        """Run a background service with error handling and monitoring"""
        try:
            self.services[service_name]['status'] = ServiceStatus.RUNNING
            interval = self.intervals.get(service_name, 300)

            while self.is_running:
                try:
                    await service_func()
                    self.services[service_name]['last_run'] = datetime.now(pytz.UTC)
                    
                except Exception as e:
                    error_msg = f"Service {service_name} error: {e}"
                    logger.error(error_msg)
                    
                    self.services[service_name]['error_count'] += 1
                    self.services[service_name]['last_error'] = error_msg
                    self.services[service_name]['status'] = ServiceStatus.ERROR

                    # Brief pause before retrying
                    await asyncio.sleep(30)

                # Wait for next interval
                await asyncio.sleep(interval)

        except asyncio.CancelledError:
            logger.info(f"Service {service_name} cancelled")
            self.services[service_name]['status'] = ServiceStatus.STOPPED
        except Exception as e:
            logger.error(f"Fatal error in service {service_name}: {e}")
            self.services[service_name]['status'] = ServiceStatus.ERROR

    async def _notification_processor(self) -> None:
        """Process scheduled notifications"""
        try:
            current_time = datetime.now(pytz.UTC)
            
            # Get notifications that should be sent now
            result = self.supabase.table("scheduled_notifications").select(
                "*"
            ).eq("status", "scheduled").lte(
                "scheduled_for", current_time.isoformat()
            ).execute()

            if not result.data:
                return

            logger.info(f"🔔 Processing {len(result.data)} scheduled notifications")

            for notification_data in result.data:
                try:
                    # Mark as processing
                    self.supabase.table("scheduled_notifications").update({
                        "status": "processing"
                    }).eq("id", notification_data["id"]).execute()

                    # Send notification
                    notification_payload = {
                        "user_id": notification_data["user_id"],
                        "type": notification_data["notification_type"],
                        "title": notification_data["title"],
                        "body": notification_data["body"],
                        "data": json.loads(notification_data["data"]) if notification_data["data"] else {},
                        "device_token": notification_data["device_token"],
                        "scheduled_for": current_time,
                        "timezone": notification_data["timezone"]
                    }

                    result = await self.notification_service._send_expo_notification(notification_payload)

                    # Update status based on result
                    status = "sent" if result.get("success") else "failed"
                    self.supabase.table("scheduled_notifications").update({
                        "status": status,
                        "processed_at": current_time.isoformat()
                    }).eq("id", notification_data["id"]).execute()

                    logger.info(f"✅ Processed scheduled notification: {notification_data['id']}")

                except Exception as e:
                    logger.error(f"❌ Failed to process notification {notification_data['id']}: {e}")
                    
                    # Mark as failed
                    self.supabase.table("scheduled_notifications").update({
                        "status": "failed",
                        "processed_at": current_time.isoformat()
                    }).eq("id", notification_data["id"]).execute()

        except Exception as e:
            logger.error(f"❌ Error in notification processor: {e}")

    async def _batch_processor(self) -> None:
        """Process notification batches"""
        try:
            current_time = datetime.now(pytz.UTC)
            
            # Get batches that should be processed now
            result = self.supabase.table("notification_batches").select(
                "*"
            ).eq("status", "scheduled").lte(
                "scheduled_for", current_time.isoformat()
            ).execute()

            if not result.data:
                return

            logger.info(f"📦 Processing {len(result.data)} notification batches")

            for batch_data in result.data:
                try:
                    # Mark as processing
                    self.supabase.table("notification_batches").update({
                        "status": "processing"
                    }).eq("id", batch_data["id"]).execute()

                    # Create batch object
                    notifications = json.loads(batch_data["notifications"])
                    batch = NotificationBatch(
                        id=batch_data["id"],
                        user_id=batch_data["user_id"],
                        notifications=notifications,
                        scheduled_for=datetime.fromisoformat(batch_data["scheduled_for"].replace('Z', '+00:00')),
                        timezone=batch_data["timezone"],
                        batch_type=batch_data["batch_type"]
                    )

                    # Process batch
                    result = await self.notification_service.send_batch_notifications(batch)

                    # Update batch status
                    update_data = {
                        "status": "completed" if result.get("success") else "failed",
                        "successful_sends": result.get("total_sent", 0),
                        "failed_sends": result.get("total_failed", 0),
                        "processed_at": current_time.isoformat()
                    }

                    self.supabase.table("notification_batches").update(update_data).eq(
                        "id", batch_data["id"]
                    ).execute()

                    logger.info(f"✅ Processed batch: {batch_data['id']} - {result.get('total_sent', 0)} sent")

                except Exception as e:
                    logger.error(f"❌ Failed to process batch {batch_data['id']}: {e}")
                    
                    # Mark as failed
                    self.supabase.table("notification_batches").update({
                        "status": "failed",
                        "processed_at": current_time.isoformat()
                    }).eq("id", batch_data["id"]).execute()

        except Exception as e:
            logger.error(f"❌ Error in batch processor: {e}")

    async def _analytics_processor(self) -> None:
        """Process analytics and system metrics"""
        try:
            await self.analytics_processor.process_daily_analytics()
            await self.analytics_processor.process_system_metrics()
            logger.info("✅ Analytics processing completed")
        except Exception as e:
            logger.error(f"❌ Error in analytics processor: {e}")

    async def _task_execution_processor(self) -> None:
        """Process task executions"""
        try:
            await self.task_engine.process_pending_executions()
            logger.debug("✅ Task execution processing completed")
        except Exception as e:
            logger.error(f"❌ Error in task execution processor: {e}")

    async def _realtime_monitor(self) -> None:
        """Monitor real-time service health"""
        try:
            await self.realtime_service.health_check()
            await self.realtime_service.cleanup_stale_connections()
            logger.debug("✅ Real-time monitoring completed")
        except Exception as e:
            logger.error(f"❌ Error in real-time monitor: {e}")

    async def _cleanup_processor(self) -> None:
        """Daily cleanup of old data"""
        try:
            current_time = datetime.now(pytz.UTC)
            retention_days = settings.CLEANUP_RETENTION_DAYS

            # Cleanup old notification logs
            cutoff_date = current_time - timedelta(days=retention_days)
            
            self.supabase.table("notification_logs").delete().lt(
                "created_at", cutoff_date.isoformat()
            ).execute()

            # Cleanup old scheduled notifications
            self.supabase.table("scheduled_notifications").delete().eq(
                "status", "sent"
            ).lt(
                "processed_at", cutoff_date.isoformat()
            ).execute()

            # Cleanup old notification batches
            self.supabase.table("notification_batches").delete().eq(
                "status", "completed"
            ).lt(
                "processed_at", cutoff_date.isoformat()
            ).execute()

            logger.info(f"✅ Cleanup completed - removed data older than {retention_days} days")

        except Exception as e:
            logger.error(f"❌ Error in cleanup processor: {e}")

    async def trigger_daily_motivation_batch(self) -> Dict[str, Any]:
        """Manually trigger daily motivation batch creation"""
        try:
            # Get all users grouped by timezone
            result = self.supabase.table("users").select(
                "id, timezone"
            ).eq("onboarding_completed", True).execute()

            if not result.data:
                return {"success": False, "message": "No users found"}

            # Group users by timezone
            timezone_groups = {}
            for user in result.data:
                timezone = user.get("timezone", "UTC")
                if timezone not in timezone_groups:
                    timezone_groups[timezone] = []
                timezone_groups[timezone].append(user["id"])

            # Schedule motivation batches
            result = await self.notification_service.schedule_daily_motivation_batch(timezone_groups)

            logger.info(f"✅ Daily motivation batches triggered for {len(timezone_groups)} timezones")
            return result

        except Exception as e:
            logger.error(f"❌ Error triggering daily motivation batch: {e}")
            return {"success": False, "error": str(e)}

# Global instance
background_manager = EnhancedBackgroundManager()

# Backward compatibility wrapper functions for main.py
async def start_background_services() -> None:
    """Start all background services (wrapper function)"""
    await background_manager.start()

async def stop_background_services() -> None:
    """Stop all background services (wrapper function)"""
    await background_manager.stop()

def get_background_manager() -> EnhancedBackgroundManager:
    """Get the global background manager instance"""
    return background_manager

async def health_check() -> Dict[str, Any]:
    """Get health status (wrapper function)"""
    return await background_manager.get_health_status() 