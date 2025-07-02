#!/usr/bin/env python3
"""
Database setup script for Callivate
Initializes Supabase database schema and data
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent / "app"))

from app.core.database import initialize_database, health_check
from app.core.config import settings
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

async def main():
    """Main setup function"""
    print("🚀 Starting Callivate Database Setup")
    print("=" * 50)
    
    # Check if required environment variables are set
    try:
        if not settings.SUPABASE_URL:
            print("❌ SUPABASE_URL environment variable is required")
            return False
            
        if not settings.SUPABASE_ANON_KEY:
            print("❌ SUPABASE_ANON_KEY (or SUPABASE_KEY) environment variable is required")
            return False
            
        if not settings.SUPABASE_SERVICE_ROLE_KEY:
            print("❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required")
            return False
            
        print("✅ Environment variables configured")
        
    except Exception as e:
        print(f"❌ Error checking environment variables: {e}")
        return False
    
    # Test database connection
    try:
        print("\n📡 Testing database connection...")
        is_healthy = await health_check()
        if not is_healthy:
            print("❌ Database connection failed")
            return False
        print("✅ Database connection successful")
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False
    
    # Initialize database schema
    try:
        print("\n🛠️  Initializing database schema...")
        await initialize_database()
        print("✅ Database schema initialized successfully")
        
    except Exception as e:
        print(f"❌ Database schema initialization failed: {e}")
        return False
    
    print("\n🎉 Database setup completed successfully!")
    print("\nNext steps:")
    print("1. Start your FastAPI server: uvicorn main:app --reload")
    print("2. Access the API documentation: http://localhost:8000/docs")
    print("3. Your Supabase project is ready for use!")
    
    return True

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1) 