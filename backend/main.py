"""
Callivate Backend Server
Main FastAPI application with integrated business logic and real-time services
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.api_v1.api import api_router
from app.core.config import settings
from app.core.database import initialize_database, health_check
from app.services.background_manager import start_background_services, stop_background_services, get_background_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager
    Handles startup and shutdown of background services
    """
    # Startup
    logger.info("🚀 Starting Callivate Backend Server...")
    
    try:
        # Initialize database
        logger.info("📊 Initializing database...")
        await initialize_database()
        
        # Check database health
        if await health_check():
            logger.info("✅ Database connection healthy")
        else:
            logger.error("❌ Database connection failed")
            raise Exception("Database connection failed")
        
        # Start background services
        logger.info("🔧 Starting background services...")
        await start_background_services()
        
        # Verify background services
        manager = get_background_manager()
        status = manager.get_service_status()
        
        running_services = sum(1 for s in status["services"].values() if s["status"] == "running")
        total_services = len(status["services"])
        
        logger.info(f"✅ Background services started: {running_services}/{total_services} running")
        
        if running_services < total_services:
            logger.warning("⚠️ Some background services failed to start")
        
        logger.info("🎉 Callivate Backend Server started successfully!")
        logger.info(f"🌐 Server running on: {settings.HOST}:{settings.PORT}")
        logger.info(f"📚 API Documentation: http://{settings.HOST}:{settings.PORT}/docs")
        
    except Exception as e:
        logger.error(f"❌ Failed to start server: {e}")
        raise
    
    yield  # Server is running
    
    # Shutdown
    logger.info("🛑 Shutting down Callivate Backend Server...")
    
    try:
        # Stop background services
        logger.info("🔧 Stopping background services...")
        await stop_background_services()
        logger.info("✅ Background services stopped")
        
    except Exception as e:
        logger.error(f"❌ Error during shutdown: {e}")
    
    logger.info("👋 Callivate Backend Server shut down complete")

# Create FastAPI application with lifespan
app = FastAPI(
    title="Callivate API",
    description="AI-Powered Task Accountability & Voice Calling System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")

# Health check endpoints
@app.get("/health")
async def health_endpoint():
    """Basic health check endpoint"""
    try:
        # Check database
        db_healthy = await health_check()
        
        # Check background services
        manager = get_background_manager()
        services_status = await manager.health_check()
        
        overall_healthy = db_healthy and services_status["overall_healthy"]
        
        return JSONResponse(
            status_code=200 if overall_healthy else 503,
            content={
                "status": "healthy" if overall_healthy else "unhealthy",
                "timestamp": services_status["timestamp"],
                "database": "healthy" if db_healthy else "unhealthy",
                "services": services_status["services"],
                "version": "1.0.0"
            }
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e),
                "version": "1.0.0"
            }
        )

@app.get("/status")
async def status_endpoint():
    """Detailed status endpoint for monitoring"""
    try:
        manager = get_background_manager()
        return manager.get_service_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Callivate API",
        "version": "1.0.0",
        "description": "AI-Powered Task Accountability & Voice Calling System",
        "documentation": "/docs",
        "health": "/health",
        "status": "/status"
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Global exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc) if settings.DEBUG else "An unexpected error occurred"
        }
    )

if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Starting Callivate server directly...")
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    ) 