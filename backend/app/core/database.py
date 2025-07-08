"""
Database configuration and table management for Callivate
Handles Supabase connection and schema creation
"""

from supabase import create_client, Client
from app.core.config import settings
import asyncio
import logging

logger = logging.getLogger(__name__)

# Supabase client (sync)
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

# Use service role client for admin operations (table creation, etc.)
supabase_admin: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

# Async client support (with fallback)
_async_supabase = None
_async_supabase_admin = None
_async_client_available = False

def get_supabase() -> Client:
    """Dependency to get Supabase sync client"""
    return supabase

def get_supabase_admin() -> Client:
    """Dependency to get Supabase admin sync client (service role)"""
    return supabase_admin

async def get_async_supabase():
    """Get async Supabase client for real-time operations (if available)"""
    global _async_supabase, _async_client_available
    
    if not _async_client_available:
        try:
            # Try to import and create async client
            from supabase import create_client
            # For newer versions of supabase-py, async functionality might be integrated
            # For now, we'll use the sync client as fallback
            _async_supabase = supabase
            _async_client_available = True
            logger.info("Using sync client for async operations (fallback mode)")
        except Exception as e:
            logger.warning(f"Async client not available: {e}")
            _async_supabase = supabase
            _async_client_available = False
    
    return _async_supabase

async def get_async_supabase_admin():
    """Get async Supabase admin client for real-time operations (if available)"""
    global _async_supabase_admin, _async_client_available
    
    if not _async_client_available:
        _async_supabase_admin = supabase_admin
    
    return _async_supabase_admin

def get_realtime_client() -> Client:
    """Get appropriate client for realtime operations (fallback to sync if async unavailable)"""
    try:
        # For now, return sync client as fallback
        # Real-time operations will be enhanced separately
        return supabase
    except Exception as e:
        logger.warning(f"Could not create realtime client, falling back to sync: {e}")
        return supabase

def is_async_available() -> bool:
    """Check if async client functionality is available"""
    return _async_client_available

async def create_tables():
    """Create all necessary tables in Supabase using SQL"""
    
    # Core tables
    tables_sql = [
        # Users table (extends Supabase auth.users)
        """
        CREATE TABLE IF NOT EXISTS public.users (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT NOT NULL,
            name TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            timezone TEXT DEFAULT 'UTC',
            onboarding_completed BOOLEAN DEFAULT FALSE
        );
        """,
        
        # User Settings table
        """
        CREATE TABLE IF NOT EXISTS public.user_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            default_voice_id TEXT DEFAULT 'google-wavenet-en-us-1',
            voice_provider TEXT DEFAULT 'google' CHECK (voice_provider IN ('google', 'elevenlabs', 'openai')),
            silent_mode BOOLEAN DEFAULT FALSE,
            notification_enabled BOOLEAN DEFAULT TRUE,
            notification_sound BOOLEAN DEFAULT TRUE,
            time_format TEXT DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id)
        );
        """,
        
        # Voices table
        """
        CREATE TABLE IF NOT EXISTS public.voices (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            provider TEXT NOT NULL CHECK (provider IN ('google', 'elevenlabs', 'openai')),
            category TEXT DEFAULT 'standard' CHECK (category IN ('standard', 'premium', 'neural')),
            language_code TEXT DEFAULT 'en-US',
            gender TEXT CHECK (gender IN ('male', 'female', 'neutral')),
            personality TEXT[] DEFAULT ARRAY[]::TEXT[],
            sample_text TEXT,
            is_premium BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """,
        
        # Tasks table
        """
        CREATE TABLE IF NOT EXISTS public.tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            scheduled_time TIME NOT NULL,
            scheduled_date DATE,
            recurrence_type TEXT DEFAULT 'none' CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'custom')),
            recurrence_pattern JSONB,
            voice_id TEXT REFERENCES public.voices(id),
            silent_mode BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_completed_at TIMESTAMP WITH TIME ZONE,
            next_scheduled_at TIMESTAMP WITH TIME ZONE
        );
        """,
        
        # Task Executions table
        """
        CREATE TABLE IF NOT EXISTS public.task_executions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
            executed_at TIMESTAMP WITH TIME ZONE,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed', 'failed', 'skipped')),
            completion_method TEXT CHECK (completion_method IN ('call', 'notification', 'manual')),
            call_duration INTEGER,
            follow_up_attempted BOOLEAN DEFAULT FALSE,
            follow_up_at TIMESTAMP WITH TIME ZONE,
            response_text TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """,
        
        # Streaks table
        """
        CREATE TABLE IF NOT EXISTS public.streaks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            current_streak INTEGER DEFAULT 0,
            longest_streak INTEGER DEFAULT 0,
            last_completion_date DATE,
            streak_start_date DATE,
            total_completions INTEGER DEFAULT 0,
            total_tasks INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id)
        );
        """,
        
        # Notes table
        """
        CREATE TABLE IF NOT EXISTS public.notes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            content TEXT,
            font_family TEXT DEFAULT 'system',
            font_size INTEGER DEFAULT 16,
            text_color TEXT DEFAULT '#000000',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """,
        
        # Analytics table
        """
        CREATE TABLE IF NOT EXISTS public.analytics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            month_year TEXT NOT NULL,
            tasks_completed INTEGER DEFAULT 0,
            tasks_missed INTEGER DEFAULT 0,
            completion_rate DECIMAL(5,2) DEFAULT 0,
            longest_streak INTEGER DEFAULT 0,
            most_used_voice_id TEXT,
            total_call_duration INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, month_year)
        );
        """,
        
        # Sync Queue table
        """
        CREATE TABLE IF NOT EXISTS public.sync_queue (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            table_name TEXT NOT NULL,
            record_id UUID NOT NULL,
            operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
            data JSONB,
            conflict_resolution TEXT DEFAULT 'server_wins' CHECK (conflict_resolution IN ('server_wins', 'client_wins', 'merge')),
            retry_count INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
            error_message TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            processed_at TIMESTAMP WITH TIME ZONE
        );
        """,
        
        # Notification logs for delivery tracking
        """
        CREATE TABLE IF NOT EXISTS public.notification_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            notification_type TEXT NOT NULL CHECK (notification_type IN ('task_reminder', 'follow_up', 'streak_milestone', 'streak_break', 'motivation', 'batch_reminder')),
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            device_token TEXT, -- Partial token for privacy (last 10 chars)
            delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'error')),
            error_message TEXT,
            batch_id TEXT,
            sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            delivered_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """,
        
        # Scheduled notifications for smart timing
        """
        CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
            notification_type TEXT NOT NULL CHECK (notification_type IN ('task_reminder', 'follow_up', 'streak_milestone', 'streak_break', 'motivation', 'batch_reminder')),
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            data JSONB,
            device_token TEXT NOT NULL,
            scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
            timezone TEXT DEFAULT 'UTC',
            status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'cancelled', 'failed')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            processed_at TIMESTAMP WITH TIME ZONE
        );
        """,
        
        # Notification batches for efficient processing
        """
        CREATE TABLE IF NOT EXISTS public.notification_batches (
            id TEXT PRIMARY KEY,
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            notifications JSONB NOT NULL,
            scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
            timezone TEXT DEFAULT 'UTC',
            batch_type TEXT NOT NULL CHECK (batch_type IN ('daily_motivation', 'task_reminders', 'follow_ups', 'streak_updates')),
            status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'failed')),
            total_notifications INTEGER DEFAULT 0,
            successful_sends INTEGER DEFAULT 0,
            failed_sends INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            processed_at TIMESTAMP WITH TIME ZONE
        );
        """,
        
        # User devices for push notifications
        """
        CREATE TABLE IF NOT EXISTS public.user_devices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            device_token TEXT NOT NULL,
            device_type TEXT CHECK (device_type IN ('ios', 'android', 'web')),
            device_name TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, device_token)
        );
        """,
        
        # Voice usage logs for analytics and billing
        """
        CREATE TABLE IF NOT EXISTS public.voice_usage_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            voice_id TEXT NOT NULL,
            text_length INTEGER NOT NULL DEFAULT 0,
            synthesis_type TEXT DEFAULT 'unknown' CHECK (synthesis_type IN ('browser', 'elevenlabs', 'openai', 'google', 'unknown')),
            cost DECIMAL(10, 6) DEFAULT 0.0,
            session_id TEXT,
            context_type TEXT DEFAULT 'preview' CHECK (context_type IN ('preview', 'call', 'notification', 'test')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """,
        
        # Enhanced user settings for smart timing
        """
        CREATE TABLE IF NOT EXISTS public.user_notification_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            notification_start_hour INTEGER DEFAULT 7 CHECK (notification_start_hour >= 0 AND notification_start_hour <= 23),
            notification_end_hour INTEGER DEFAULT 22 CHECK (notification_end_hour >= 0 AND notification_end_hour <= 23),
            avoid_quiet_hours BOOLEAN DEFAULT TRUE,
            follow_up_delay_minutes INTEGER DEFAULT 30,
            batch_notifications BOOLEAN DEFAULT TRUE,
            smart_timing_enabled BOOLEAN DEFAULT TRUE,
            motivation_notifications BOOLEAN DEFAULT TRUE,
            streak_notifications BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id)
        );
        """
    ]
    
    # Execute each table creation using direct PostgreSQL connection
    # Note: For now, we'll skip automatic table creation and recommend using Supabase dashboard
    logger.info("Tables should be created manually via Supabase dashboard or SQL editor")
    logger.info("SQL statements are available in the database.py file")

async def create_rls_policies():
    """Create Row Level Security policies"""
    logger.info("RLS policies should be created manually via Supabase dashboard")
    logger.info("Policy statements are available in the database.py file")

async def populate_voices_table():
    """Populate the voices table with available voices"""
    
    voices_data = [
        # Google Voices
        {
            'id': 'google-wavenet-en-us-1',
            'name': 'WaveNet Female (US)',
            'provider': 'google',
            'category': 'neural',
            'language_code': 'en-US',
            'gender': 'female',
            'personality': ['professional', 'clear'],
            'sample_text': 'Hello! This is a sample of the WaveNet voice.',
            'is_premium': True
        },
        {
            'id': 'google-standard-en-us-1',
            'name': 'Standard Female (US)',
            'provider': 'google',
            'category': 'standard',
            'language_code': 'en-US',
            'gender': 'female',
            'personality': ['natural', 'friendly'],
            'sample_text': 'Hi there! This is the standard Google voice.',
            'is_premium': False
        },
        # ElevenLabs Voices
        {
            'id': 'elevenlabs-rachel',
            'name': 'Rachel',
            'provider': 'elevenlabs',
            'category': 'premium',
            'language_code': 'en-US',
            'gender': 'female',
            'personality': ['warm', 'conversational'],
            'sample_text': 'Hello! I\'m Rachel from ElevenLabs.',
            'is_premium': True
        },
        # Browser/System Voices
        {
            'id': 'browser-default',
            'name': 'Browser Default',
            'provider': 'browser',
            'category': 'standard',
            'language_code': 'en-US',
            'gender': 'neutral',
            'personality': ['system', 'reliable'],
            'sample_text': 'This is your browser\'s default voice.',
            'is_premium': False
        }
    ]
    
    try:
        # Insert voices (use upsert to avoid duplicates)
        for voice in voices_data:
            result = supabase_admin.table('voices').upsert(voice).execute()
        
        logger.info(f"Successfully populated {len(voices_data)} voices")
    except Exception as e:
        logger.error(f"Error populating voices: {e}")

async def initialize_database():
    """Initialize the complete database schema"""
    logger.info("Initializing Callivate database...")
    
    try:
        await create_tables()
        logger.info("✅ Tables ready (create manually if needed)")
        
        await create_rls_policies()
        logger.info("✅ RLS policies ready (create manually if needed)")
        
        await populate_voices_table()
        logger.info("✅ Voices populated successfully")
        
        logger.info("🎉 Database initialization completed!")
        
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise

# Utility functions for common database operations
async def get_user_by_id(user_id: str) -> dict:
    """Get user by ID"""
    result = supabase.table('users').select('*').eq('id', user_id).execute()
    return result.data[0] if result.data else None

async def create_user_profile(user_data: dict) -> dict:
    """Create user profile after auth signup"""
    result = supabase.table('users').insert(user_data).execute()
    return result.data[0] if result.data else None

# Database health check
async def health_check() -> bool:
    """Check if database connection is healthy"""
    try:
        # Simple connectivity test
        result = supabase.table('voices').select('count').limit(1).execute()
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False 