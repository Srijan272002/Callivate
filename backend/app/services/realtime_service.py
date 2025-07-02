"""
Supabase Real-time Integration Service for Callivate
Handles real-time subscriptions, live data updates, and sync status monitoring
"""

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass
from enum import Enum

from supabase import Client
from app.core.database import get_supabase, get_realtime_client

logger = logging.getLogger(__name__)

class ChannelEvent(Enum):
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    SELECT = "SELECT"

@dataclass
class RealtimeEvent:
    table: str
    event_type: ChannelEvent
    old_record: Optional[Dict[str, Any]]
    new_record: Optional[Dict[str, Any]]
    timestamp: datetime

class RealtimeService:
    """
    Supabase real-time service for live data updates
    Enhanced with graceful degradation for sync client compatibility
    """
    
    def __init__(self):
        self.supabase = get_supabase()
        self.realtime_client = get_realtime_client()
        self.active_channels = {}
        self.event_handlers = {}
        self.is_running = False
        self.realtime_available = False
        self.fallback_mode = False
        
    async def start_service(self):
        """Start the real-time service with fallback support"""
        if self.is_running:
            logger.warning("Real-time service is already running")
            return
            
        self.is_running = True
        logger.info("Starting real-time service...")
        
        # Test real-time availability
        await self._test_realtime_availability()
        
        # Set up subscriptions (or fallback)
        await self._setup_default_subscriptions()
    
    async def _test_realtime_availability(self):
        """Test if real-time features are available"""
        try:
            # Try to create a test channel to see if realtime works
            test_channel = self.realtime_client.channel("test_realtime_availability")
            self.realtime_available = True
            logger.info("✅ Real-time features are available")
            
            # Clean up test channel
            if hasattr(test_channel, 'unsubscribe'):
                try:
                    test_channel.unsubscribe()
                except:
                    pass
                    
        except Exception as e:
            self.realtime_available = False
            self.fallback_mode = True
            logger.warning(f"⚠️ Real-time features unavailable, enabling fallback mode: {e}")
            logger.info("📊 Service will use polling for data updates instead")
    
    async def stop_service(self):
        """Stop the real-time service"""
        self.is_running = False
        
        # Unsubscribe from all channels
        for channel_name in list(self.active_channels.keys()):
            await self.unsubscribe_channel(channel_name)
        
        logger.info("Real-time service stopped")
    
    async def _setup_default_subscriptions(self):
        """Set up default real-time subscriptions with fallback"""
        try:
            if self.realtime_available:
                # Subscribe to critical tables
                await self.subscribe_to_table("task_executions", self._handle_task_execution_change)
                await self.subscribe_to_table("tasks", self._handle_task_change)
                await self.subscribe_to_table("sync_queue", self._handle_sync_queue_change)
                await self.subscribe_to_table("users", self._handle_user_change)
                logger.info("✅ Real-time subscriptions established")
            else:
                # Start polling fallback
                await self._start_polling_fallback()
                logger.info("✅ Polling fallback activated")
                
        except Exception as e:
            logger.error(f"Error setting up default subscriptions: {e}")
            # Enable fallback mode if subscriptions fail
            if not self.fallback_mode:
                self.fallback_mode = True
                await self._start_polling_fallback()
    
    async def _start_polling_fallback(self):
        """Start polling fallback when real-time isn't available"""
        if not self.is_running:
            return
            
        try:
            # Start background polling tasks
            asyncio.create_task(self._polling_task())
            logger.info("📊 Polling fallback started")
        except Exception as e:
            logger.error(f"Error starting polling fallback: {e}")
    
    async def _polling_task(self):
        """Background polling task for when real-time isn't available"""
        poll_interval = 30  # Poll every 30 seconds
        
        while self.is_running and self.fallback_mode:
            try:
                await asyncio.sleep(poll_interval)
                
                # Poll for changes (simplified version)
                await self._poll_for_changes()
                
            except Exception as e:
                logger.error(f"Error in polling task: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    async def _poll_for_changes(self):
        """Poll for data changes when real-time isn't available"""
        try:
            # This is a simplified polling implementation
            # In a production environment, you might want to implement
            # more sophisticated change detection
            current_time = datetime.now()
            
            # Check for recent changes in critical tables
            recent_threshold = current_time - timedelta(minutes=1)
            
            # Poll task executions
            try:
                response = self.supabase.table("task_executions").select("*").gte(
                    "created_at", recent_threshold.isoformat()
                ).execute()
                
                if response.data:
                    logger.debug(f"Polling detected {len(response.data)} recent task execution changes")
                    
            except Exception as e:
                logger.debug(f"Polling error for task_executions: {e}")
                
        except Exception as e:
            logger.error(f"Error polling for changes: {e}")
            
    async def subscribe_to_table(
        self, 
        table_name: str, 
        handler: Callable[[RealtimeEvent], None],
        filter_criteria: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Subscribe to real-time changes on a table with fallback support
        Returns channel name for management
        """
        try:
            if not self.realtime_available:
                logger.info(f"Real-time not available for {table_name}, using polling fallback")
                # Create a mock channel entry for consistency
                channel_name = f"polling_{table_name}_{int(datetime.now().timestamp())}"
                self.active_channels[channel_name] = {
                    "table": table_name,
                    "handler": handler,
                    "filter": filter_criteria,
                    "created_at": datetime.now(),
                    "type": "polling"
                }
                return channel_name
            
            channel_name = f"table_{table_name}_{int(datetime.now().timestamp())}"
            
            # Create channel
            channel = self.realtime_client.channel(channel_name)
            
            # Set up table listener
            if filter_criteria:
                # Apply filters if provided
                filter_str = "&".join([f"{k}=eq.{v}" for k, v in filter_criteria.items()])
                channel = channel.on_postgres_changes(
                    event="*",
                    schema="public",
                    table=table_name,
                    filter=filter_str,
                    callback=lambda payload: self._handle_realtime_event(table_name, payload, handler)
                )
            else:
                channel = channel.on_postgres_changes(
                    event="*",
                    schema="public", 
                    table=table_name,
                    callback=lambda payload: self._handle_realtime_event(table_name, payload, handler)
                )
            
            # Subscribe to channel
            channel.subscribe()
            
            # Store channel reference
            self.active_channels[channel_name] = {
                "channel": channel,
                "table": table_name,
                "handler": handler,
                "filter": filter_criteria,
                "created_at": datetime.now(),
                "type": "realtime"
            }
            
            logger.info(f"Subscribed to table '{table_name}' with channel '{channel_name}'")
            return channel_name
            
        except Exception as e:
            logger.error(f"Error subscribing to table {table_name}: {e}")
            # Fallback to polling mode for this specific subscription
            logger.info(f"Falling back to polling mode for {table_name}")
            channel_name = f"polling_{table_name}_{int(datetime.now().timestamp())}"
            self.active_channels[channel_name] = {
                "table": table_name,
                "handler": handler,
                "filter": filter_criteria,
                "created_at": datetime.now(),
                "type": "polling",
                "error": str(e)
            }
            return channel_name
    
    async def subscribe_user_data(self, user_id: str, handler: Callable[[RealtimeEvent], None]) -> str:
        """Subscribe to user-specific data changes"""
        try:
            channel_name = f"user_{user_id}_{int(datetime.now().timestamp())}"
            
            # Create user-specific channel
            channel = self.supabase.channel(channel_name)
            
            # Subscribe to user's tasks
            channel = channel.on_postgres_changes(
                event="*",
                schema="public",
                table="tasks",
                filter=f"user_id=eq.{user_id}",
                callback=lambda payload: self._handle_realtime_event("tasks", payload, handler)
            )
            
            # Subscribe to user's task executions
            channel = channel.on_postgres_changes(
                event="*",
                schema="public",
                table="task_executions", 
                filter=f"user_id=eq.{user_id}",
                callback=lambda payload: self._handle_realtime_event("task_executions", payload, handler)
            )
            
            # Subscribe to user's settings
            channel = channel.on_postgres_changes(
                event="*",
                schema="public",
                table="user_settings",
                filter=f"user_id=eq.{user_id}",
                callback=lambda payload: self._handle_realtime_event("user_settings", payload, handler)
            )
            
            channel.subscribe()
            
            self.active_channels[channel_name] = {
                "channel": channel,
                "type": "user_data",
                "user_id": user_id,
                "handler": handler,
                "created_at": datetime.now()
            }
            
            logger.info(f"Subscribed to user data for user {user_id}")
            return channel_name
            
        except Exception as e:
            logger.error(f"Error subscribing to user data: {e}")
            raise
    
    async def unsubscribe_channel(self, channel_name: str):
        """Unsubscribe from a channel"""
        try:
            if channel_name in self.active_channels:
                channel_info = self.active_channels[channel_name]
                
                # Handle real-time channels
                if channel_info.get("type") == "realtime" and "channel" in channel_info:
                    channel = channel_info["channel"]
                    try:
                        # Unsubscribe
                        channel.unsubscribe()
                    except Exception as e:
                        logger.warning(f"Error unsubscribing from real-time channel: {e}")
                
                # Remove from active channels (works for both realtime and polling)
                del self.active_channels[channel_name]
                
                logger.info(f"Unsubscribed from channel '{channel_name}'")
            else:
                logger.warning(f"Channel '{channel_name}' not found in active channels")
                
        except Exception as e:
            logger.error(f"Error unsubscribing from channel {channel_name}: {e}")
    
    def _handle_realtime_event(
        self, 
        table_name: str, 
        payload: Dict[str, Any], 
        handler: Callable[[RealtimeEvent], None]
    ):
        """Handle incoming real-time event"""
        try:
            event_type = ChannelEvent(payload.get("eventType", "UPDATE"))
            old_record = payload.get("old", {})
            new_record = payload.get("new", {})
            
            event = RealtimeEvent(
                table=table_name,
                event_type=event_type,
                old_record=old_record if old_record else None,
                new_record=new_record if new_record else None,
                timestamp=datetime.now()
            )
            
            # Call the handler
            handler(event)
            
        except Exception as e:
            logger.error(f"Error handling real-time event: {e}")
    
    # Event handlers (simplified for polling compatibility)
    
    def _handle_task_execution_change(self, event: RealtimeEvent):
        """Handle task execution changes"""
        try:
            if event.event_type == ChannelEvent.INSERT:
                # New task execution created
                execution_data = event.new_record
                task_id = execution_data.get("task_id") if execution_data else None
                user_id = execution_data.get("user_id") if execution_data else None
                
                if task_id and user_id:
                    logger.info(f"New task execution created: {task_id} for user {user_id}")
                    
            elif event.event_type == ChannelEvent.UPDATE:
                # Task execution status updated
                old_status = event.old_record.get("status") if event.old_record else None
                new_status = event.new_record.get("status") if event.new_record else None
                
                if old_status != new_status:
                    execution_id = event.new_record.get("id") if event.new_record else None
                    logger.info(f"Task execution {execution_id} status changed from {old_status} to {new_status}")
                    
        except Exception as e:
            logger.error(f"Error handling task execution change: {e}")
    
    def _handle_task_change(self, event: RealtimeEvent):
        """Handle task changes"""
        try:
            if event.event_type == ChannelEvent.INSERT:
                # New task created
                task_data = event.new_record
                title = task_data.get("title") if task_data else "Unknown"
                user_id = task_data.get("user_id") if task_data else None
                
                logger.info(f"New task created: '{title}' for user {user_id}")
                
            elif event.event_type == ChannelEvent.UPDATE:
                # Task updated
                task_id = event.new_record.get("id") if event.new_record else None
                logger.info(f"Task {task_id} updated")
                
            elif event.event_type == ChannelEvent.DELETE:
                # Task deleted
                task_id = event.old_record.get("id") if event.old_record else None
                logger.info(f"Task {task_id} deleted")
                
        except Exception as e:
            logger.error(f"Error handling task change: {e}")
    
    def _handle_sync_queue_change(self, event: RealtimeEvent):
        """Handle sync queue changes"""
        try:
            if event.event_type == ChannelEvent.INSERT:
                # New sync item added
                sync_data = event.new_record
                operation = sync_data.get("operation") if sync_data else None
                table_name = sync_data.get("table_name") if sync_data else None
                
                logger.info(f"New sync operation '{operation}' for table '{table_name}'")
                
            elif event.event_type == ChannelEvent.UPDATE:
                # Sync status updated
                old_status = event.old_record.get("status") if event.old_record else None
                new_status = event.new_record.get("status") if event.new_record else None
                
                if old_status != new_status:
                    sync_id = event.new_record.get("id") if event.new_record else None
                    logger.info(f"Sync {sync_id} status changed from {old_status} to {new_status}")
                    
        except Exception as e:
            logger.error(f"Error handling sync queue change: {e}")
    
    def _handle_user_change(self, event: RealtimeEvent):
        """Handle user changes"""
        try:
            if event.event_type == ChannelEvent.UPDATE:
                user_id = event.new_record.get("id") if event.new_record else None
                old_login = event.old_record.get("last_login") if event.old_record else None
                new_login = event.new_record.get("last_login") if event.new_record else None
                
                if old_login != new_login and user_id:
                    logger.info(f"User {user_id} logged in")
                    
        except Exception as e:
            logger.error(f"Error handling user change: {e}")
    
    # Enhanced monitoring and status
    
    async def monitor_sync_status(self) -> Dict[str, Any]:
        """Monitor real-time sync status"""
        try:
            # Get current sync queue status
            pending_response = self.supabase.table("sync_queue").select(
                "id", count="exact"
            ).eq("status", "pending").execute()
            
            processing_response = self.supabase.table("sync_queue").select(
                "id", count="exact"
            ).eq("status", "processing").execute()
            
            failed_response = self.supabase.table("sync_queue").select(
                "id", count="exact"
            ).eq("status", "failed").execute()
            
            return {
                "pending_syncs": pending_response.count or 0,
                "processing_syncs": processing_response.count or 0,
                "failed_syncs": failed_response.count or 0,
                "active_channels": len(self.active_channels),
                "realtime_available": self.realtime_available,
                "fallback_mode": self.fallback_mode,
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error monitoring sync status: {e}")
            return {"error": str(e)}
    
    def get_active_channels(self) -> List[Dict[str, Any]]:
        """Get list of active channels"""
        return [
            {
                "channel_name": name,
                "table": info.get("table"),
                "type": info.get("type", "unknown"),
                "user_id": info.get("user_id"),
                "created_at": info.get("created_at").isoformat() if info.get("created_at") else None,
                "error": info.get("error")  # Include any errors for debugging
            }
            for name, info in self.active_channels.items()
        ]
    
    async def cleanup_stale_channels(self, max_age_hours: int = 24):
        """Clean up stale channels older than specified hours"""
        try:
            cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
            stale_channels = []
            
            for channel_name, channel_info in self.active_channels.items():
                created_at = channel_info.get("created_at")
                if created_at and created_at < cutoff_time:
                    stale_channels.append(channel_name)
            
            # Unsubscribe from stale channels
            for channel_name in stale_channels:
                await self.unsubscribe_channel(channel_name)
            
            if stale_channels:
                logger.info(f"Cleaned up {len(stale_channels)} stale channels")
                
        except Exception as e:
            logger.error(f"Error cleaning up stale channels: {e}")
    
    def get_service_status(self) -> Dict[str, Any]:
        """Get comprehensive service status"""
        return {
            "is_running": self.is_running,
            "realtime_available": self.realtime_available,
            "fallback_mode": self.fallback_mode,
            "active_channels": len(self.active_channels),
            "channel_types": {
                "realtime": len([c for c in self.active_channels.values() if c.get("type") == "realtime"]),
                "polling": len([c for c in self.active_channels.values() if c.get("type") == "polling"])
            }
        }

    # Public methods for background manager compatibility
    async def health_check(self):
        """Public method to check real-time service health"""
        try:
            status = self.get_service_status()
            is_healthy = (
                status.get("is_running", False) and 
                (status.get("realtime_available", False) or status.get("fallback_mode", False))
            )
            
            logger.debug(f"✅ Real-time service health check: {'healthy' if is_healthy else 'unhealthy'}")
            return {"healthy": is_healthy, "status": status}
        except Exception as e:
            logger.error(f"❌ Error in real-time service health check: {e}")
            return {"healthy": False, "error": str(e)}

    async def cleanup_stale_connections(self):
        """Public method to cleanup stale connections (alias for cleanup_stale_channels)"""
        try:
            await self.cleanup_stale_channels()
            logger.debug("✅ Stale connections cleanup completed")
        except Exception as e:
            logger.error(f"❌ Error cleaning up stale connections: {e}")
            raise

# Global instance
realtime_service = RealtimeService()

async def start_realtime_service():
    """Start the global real-time service"""
    await realtime_service.start_service()

async def stop_realtime_service():
    """Stop the global real-time service"""
    await realtime_service.stop_service()

def get_realtime_service() -> RealtimeService:
    """Get real-time service instance"""
    return realtime_service 