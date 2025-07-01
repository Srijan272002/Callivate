"""
Database configuration and table management for Callivate
Handles Supabase connection and schema creation
"""

from supabase import create_client, Client
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import asyncio
import logging

logger = logging.getLogger(__name__)

# Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

# SQLAlchemy async engine for direct database operations
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_recycle=300,
)

async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_database():
    """Dependency to get database session"""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()

async def create_tables():
    """Create all necessary tables in Supabase"""
    
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
            recurrence_pattern JSONB, -- For custom patterns
            voice_id TEXT REFERENCES public.voices(id),
            silent_mode BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_completed_at TIMESTAMP WITH TIME ZONE,
            next_scheduled_at TIMESTAMP WITH TIME ZONE
        );
        """,
        
        # Task Executions table (for tracking each call/completion)
        """
        CREATE TABLE IF NOT EXISTS public.task_executions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
            executed_at TIMESTAMP WITH TIME ZONE,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed', 'failed', 'skipped')),
            completion_method TEXT CHECK (completion_method IN ('call', 'notification', 'manual')),
            call_duration INTEGER, -- in seconds
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
        
        # Analytics table (monthly aggregations)
        """
        CREATE TABLE IF NOT EXISTS public.analytics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
            tasks_completed INTEGER DEFAULT 0,
            tasks_missed INTEGER DEFAULT 0,
            completion_rate DECIMAL(5,2) DEFAULT 0,
            longest_streak INTEGER DEFAULT 0,
            most_used_voice_id TEXT,
            total_call_duration INTEGER DEFAULT 0, -- in seconds
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, month_year)
        );
        """,
        
        # Sync Queue table (for offline synchronization)
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
        
        # Notification Log table
        """
        CREATE TABLE IF NOT EXISTS public.notification_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            task_execution_id UUID REFERENCES public.task_executions(id) ON DELETE CASCADE,
            notification_type TEXT NOT NULL CHECK (notification_type IN ('push', 'local', 'call_fallback', 'streak_break')),
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
            platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
            device_token TEXT,
            error_message TEXT
        );
        """
    ]
    
    # Create indexes for performance
    indexes_sql = [
        "CREATE INDEX IF NOT EXISTS idx_tasks_user_id_active ON public.tasks(user_id, is_active);",
        "CREATE INDEX IF NOT EXISTS idx_tasks_next_scheduled_at ON public.tasks(next_scheduled_at);",
        "CREATE INDEX IF NOT EXISTS idx_task_executions_user_id_status ON public.task_executions(user_id, status);",
        "CREATE INDEX IF NOT EXISTS idx_task_executions_scheduled_at ON public.task_executions(scheduled_at);",
        "CREATE INDEX IF NOT EXISTS idx_sync_queue_user_id_status ON public.sync_queue(user_id, status);",
        "CREATE INDEX IF NOT EXISTS idx_notification_log_user_id_sent_at ON public.notification_log(user_id, sent_at);",
        "CREATE INDEX IF NOT EXISTS idx_analytics_user_id_month_year ON public.analytics(user_id, month_year);"
    ]
    
    # RLS (Row Level Security) policies
    rls_policies = [
        # Users table policies
        "ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;",
        """
        CREATE POLICY IF NOT EXISTS "Users can view own profile" ON public.users
        FOR SELECT USING (auth.uid() = id);
        """,
        """
        CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.users
        FOR UPDATE USING (auth.uid() = id);
        """,
        
        # Tasks table policies
        "ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;",
        """
        CREATE POLICY IF NOT EXISTS "Users can manage own tasks" ON public.tasks
        FOR ALL USING (auth.uid() = user_id);
        """,
        
        # User Settings policies
        "ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;",
        """
        CREATE POLICY IF NOT EXISTS "Users can manage own settings" ON public.user_settings
        FOR ALL USING (auth.uid() = user_id);
        """,
        
        # Add similar policies for other tables
        "ALTER TABLE public.task_executions ENABLE ROW LEVEL SECURITY;",
        """
        CREATE POLICY IF NOT EXISTS "Users can view own task executions" ON public.task_executions
        FOR ALL USING (auth.uid() = user_id);
        """,
        
        "ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;",
        """
        CREATE POLICY IF NOT EXISTS "Users can manage own streaks" ON public.streaks
        FOR ALL USING (auth.uid() = user_id);
        """,
        
        "ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;",
        """
        CREATE POLICY IF NOT EXISTS "Users can manage own notes" ON public.notes
        FOR ALL USING (auth.uid() = user_id);
        """,
        
        "ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;",
        """
        CREATE POLICY IF NOT EXISTS "Users can view own analytics" ON public.analytics
        FOR ALL USING (auth.uid() = user_id);
        """,
        
        "ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;",
        """
        CREATE POLICY IF NOT EXISTS "Users can manage own sync queue" ON public.sync_queue
        FOR ALL USING (auth.uid() = user_id);
        """,
        
        "ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;",
        """
        CREATE POLICY IF NOT EXISTS "Users can view own notifications" ON public.notification_log
        FOR ALL USING (auth.uid() = user_id);
        """
    ]
    
    try:
        async with engine.begin() as conn:
            # Create tables
            for sql in tables_sql:
                await conn.execute(text(sql))
                logger.info("Created table successfully")
            
            # Create indexes
            for sql in indexes_sql:
                await conn.execute(text(sql))
                logger.info("Created index successfully")
            
            # Apply RLS policies
            for sql in rls_policies:
                await conn.execute(text(sql))
                logger.info("Applied RLS policy successfully")
            
            logger.info("✅ All database tables, indexes, and policies created successfully")
            
    except Exception as e:
        logger.error(f"❌ Error creating database tables: {e}")
        raise

async def populate_voices_table():
    """Populate the voices table with available voice options"""
    voices_data = [
        # Browser TTS Voices (FREE - DEFAULT)
        {"id": "browser-default-female", "name": "Device Default Female", "provider": "browser", "category": "standard", "language_code": "en-US", "gender": "female", "personality": ["friendly", "natural"], "is_premium": False},
        {"id": "browser-default-male", "name": "Device Default Male", "provider": "browser", "category": "standard", "language_code": "en-US", "gender": "male", "personality": ["calm", "natural"], "is_premium": False},
        {"id": "browser-samantha", "name": "Samantha (iOS)", "provider": "browser", "category": "standard", "language_code": "en-US", "gender": "female", "personality": ["friendly", "clear"], "is_premium": False},
        {"id": "browser-alex", "name": "Alex (macOS)", "provider": "browser", "category": "standard", "language_code": "en-US", "gender": "male", "personality": ["professional", "clear"], "is_premium": False},
        
        # Google Standard Voices (Optional)
        {"id": "google-standard-en-us-1", "name": "Google US English 1", "provider": "google", "category": "standard", "language_code": "en-US", "gender": "female", "personality": ["friendly", "professional"], "is_premium": False},
        {"id": "google-standard-en-us-2", "name": "Google US English 2", "provider": "google", "category": "standard", "language_code": "en-US", "gender": "male", "personality": ["calm", "professional"], "is_premium": False},
        
        # Google WaveNet (Premium)
        {"id": "google-wavenet-en-us-1", "name": "Google WaveNet US 1", "provider": "google", "category": "premium", "language_code": "en-US", "gender": "female", "personality": ["energetic", "friendly"], "is_premium": True},
        {"id": "google-wavenet-en-us-2", "name": "Google WaveNet US 2", "provider": "google", "category": "premium", "language_code": "en-US", "gender": "male", "personality": ["professional", "calm"], "is_premium": True},
        
        # OpenAI TTS Voices
        {"id": "openai-alloy", "name": "Alloy", "provider": "openai", "category": "neural", "language_code": "en-US", "gender": "neutral", "personality": ["balanced", "professional"], "is_premium": True},
        {"id": "openai-echo", "name": "Echo", "provider": "openai", "category": "neural", "language_code": "en-US", "gender": "male", "personality": ["warm", "friendly"], "is_premium": True},
        {"id": "openai-fable", "name": "Fable", "provider": "openai", "category": "neural", "language_code": "en-US", "gender": "female", "personality": ["energetic", "enthusiastic"], "is_premium": True},
        {"id": "openai-onyx", "name": "Onyx", "provider": "openai", "category": "neural", "language_code": "en-US", "gender": "male", "personality": ["deep", "authoritative"], "is_premium": True},
        {"id": "openai-nova", "name": "Nova", "provider": "openai", "category": "neural", "language_code": "en-US", "gender": "female", "personality": ["professional", "clear"], "is_premium": True},
        {"id": "openai-shimmer", "name": "Shimmer", "provider": "openai", "category": "neural", "language_code": "en-US", "gender": "female", "personality": ["gentle", "soothing"], "is_premium": True},
    ]
    
    try:
        async with engine.begin() as conn:
            for voice in voices_data:
                # Convert personality array to PostgreSQL array format
                personality_str = "{" + ",".join(voice["personality"]) + "}"
                
                sql = text("""
                    INSERT INTO public.voices (id, name, provider, category, language_code, gender, personality, is_premium, sample_text)
                    VALUES (:id, :name, :provider, :category, :language_code, :gender, :personality, :is_premium, :sample_text)
                    ON CONFLICT (id) DO NOTHING
                """)
                
                await conn.execute(sql, {
                    "id": voice["id"],
                    "name": voice["name"], 
                    "provider": voice["provider"],
                    "category": voice["category"],
                    "language_code": voice["language_code"],
                    "gender": voice["gender"],
                    "personality": personality_str,
                    "is_premium": voice.get("is_premium", False),
                    "sample_text": "This is an AI-generated call from Callivate. Have you completed your task today?"
                })
        
        logger.info("✅ Voices table populated successfully")
        
    except Exception as e:
        logger.error(f"❌ Error populating voices table: {e}")
        raise 