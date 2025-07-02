"""
Callivate Services Package
Comprehensive suite of business logic, AI, real-time, and sync services
"""

from .calling_service import CallingService
from .voice_service import VoiceService, AIService
from .notification_service import AdvancedNotificationService, NotificationService
from .task_execution_engine import TaskExecutionEngine, start_task_engine, stop_task_engine
from .analytics_processor import AnalyticsProcessor, start_analytics_processor, stop_analytics_processor
from .privacy_security import PrivacySecurityService, get_privacy_security_service
from .realtime_service import RealtimeService, start_realtime_service, stop_realtime_service, get_realtime_service
from .advanced_sync_service import AdvancedSyncService, start_advanced_sync_service, stop_advanced_sync_service, get_advanced_sync_service
from .background_manager import (
    EnhancedBackgroundManager, 
    background_manager,
    start_background_services,
    stop_background_services,
    get_background_manager
)

__all__ = [
    # Core Services
    "CallingService",
    "VoiceService", 
    "AIService",
    "NotificationService",
    "AdvancedNotificationService",
    
    # Business Logic Services
    "TaskExecutionEngine",
    "start_task_engine",
    "stop_task_engine",
    
    # Analytics Services
    "AnalyticsProcessor",
    "start_analytics_processor", 
    "stop_analytics_processor",
    
    # Privacy & Security Services
    "PrivacySecurityService",
    "get_privacy_security_service",
    
    # Real-time Services
    "RealtimeService",
    "start_realtime_service",
    "stop_realtime_service", 
    "get_realtime_service",
    
    # Advanced Sync Services
    "AdvancedSyncService",
    "start_advanced_sync_service",
    "stop_advanced_sync_service",
    "get_advanced_sync_service",
    
    # Background Management
    "EnhancedBackgroundManager",
    "background_manager",
    "start_background_services",
    "stop_background_services", 
    "get_background_manager",
] 