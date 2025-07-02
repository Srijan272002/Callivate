"""
Async Database Handler for Callivate
Properly implements async patterns for better performance
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager
import asyncpg
from datetime import datetime

from app.core.config import settings
from app.utils.error_handler import error_handler, ErrorCategory, ErrorSeverity

logger = logging.getLogger(__name__)

class AsyncSupabaseConnection:
    """Async connection handler for Supabase/PostgreSQL"""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.is_connected = False
        
    async def connect(self) -> None:
        """Establish connection pool"""
        try:
            # Parse Supabase URL to get connection parameters
            import urllib.parse
            parsed = urllib.parse.urlparse(settings.SUPABASE_URL)
            
            # Connection string for direct PostgreSQL access
            # Note: In production, you'd want to use connection pooling
            self.pool = await asyncpg.create_pool(
                host=parsed.hostname,
                port=parsed.port or 5432,
                database="postgres",  # Supabase default
                user="postgres",
                password=settings.SUPABASE_SERVICE_ROLE_KEY,  # Use service role for server
                min_size=5,
                max_size=20,
                command_timeout=60
            )
            
            self.is_connected = True
            logger.info("✅ Async database pool created successfully")
            
        except Exception as e:
            await error_handler.log_error(
                category=ErrorCategory.DATABASE,
                severity=ErrorSeverity.CRITICAL,
                message=f"Failed to create async database pool: {str(e)}"
            )
            raise

    async def disconnect(self) -> None:
        """Close connection pool"""
        if self.pool:
            await self.pool.close()
            self.is_connected = False
            logger.info("✅ Async database pool closed")

    @asynccontextmanager
    async def get_connection(self):
        """Get connection from pool"""
        if not self.pool:
            raise Exception("Database pool not initialized")
            
        async with self.pool.acquire() as connection:
            yield connection

    async def execute_query(
        self, 
        query: str, 
        *args, 
        fetch_mode: str = "all"
    ) -> Optional[List[Dict[str, Any]]]:
        """Execute query with error handling"""
        try:
            async with self.get_connection() as conn:
                if fetch_mode == "one":
                    result = await conn.fetchrow(query, *args)
                    return dict(result) if result else None
                elif fetch_mode == "all":
                    results = await conn.fetch(query, *args)
                    return [dict(row) for row in results]
                else:  # execute only
                    await conn.execute(query, *args)
                    return None
                    
        except Exception as e:
            await error_handler.log_error(
                category=ErrorCategory.DATABASE,
                severity=ErrorSeverity.HIGH,
                message=f"Database query failed: {query[:100]}..."
            )
            raise

    async def health_check(self) -> bool:
        """Check database health"""
        try:
            await self.execute_query("SELECT 1")
            return True
        except Exception:
            return False

class AsyncTaskRepository:
    """Async repository for task operations"""
    
    def __init__(self, db: AsyncSupabaseConnection):
        self.db = db

    async def get_user_tasks(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all tasks for a user"""
        query = """
        SELECT t.*, v.name as voice_name
        FROM tasks t
        LEFT JOIN voices v ON t.voice_id = v.id
        WHERE t.user_id = $1 AND t.is_active = true
        ORDER BY t.created_at DESC
        """
        return await self.db.execute_query(query, user_id)

    async def create_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new task"""
        query = """
        INSERT INTO tasks (user_id, title, description, scheduled_time, scheduled_date, voice_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        """
        return await self.db.execute_query(
            query,
            task_data["user_id"],
            task_data["title"],
            task_data["description"],
            task_data["scheduled_time"],
            task_data["scheduled_date"],
            task_data.get("voice_id"),
            fetch_mode="one"
        )

    async def update_task_completion(self, task_id: str, completed: bool) -> None:
        """Update task completion status"""
        query = """
        UPDATE tasks 
        SET last_completed_at = $2
        WHERE id = $1
        """
        completion_time = datetime.utcnow() if completed else None
        await self.db.execute_query(query, task_id, completion_time, fetch_mode="execute")

class AsyncUserRepository:
    """Async repository for user operations"""
    
    def __init__(self, db: AsyncSupabaseConnection):
        self.db = db

    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile"""
        query = "SELECT * FROM users WHERE id = $1"
        return await self.db.execute_query(query, user_id, fetch_mode="one")

    async def update_user_settings(self, user_id: str, settings_data: Dict[str, Any]) -> None:
        """Update user settings"""
        query = """
        UPDATE user_settings 
        SET default_voice_id = $2, notification_enabled = $3, updated_at = NOW()
        WHERE user_id = $1
        """
        await self.db.execute_query(
            query,
            user_id,
            settings_data.get("default_voice_id"),
            settings_data.get("notification_enabled", True),
            fetch_mode="execute"
        )

# Global async database instance
async_db = AsyncSupabaseConnection()

async def init_async_database():
    """Initialize async database connection"""
    await async_db.connect()

async def close_async_database():
    """Close async database connection"""
    await async_db.disconnect()

def get_async_task_repository() -> AsyncTaskRepository:
    """Get async task repository"""
    return AsyncTaskRepository(async_db)

def get_async_user_repository() -> AsyncUserRepository:
    """Get async user repository"""
    return AsyncUserRepository(async_db) 