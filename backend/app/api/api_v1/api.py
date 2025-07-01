"""
Main API Router for Callivate v1
Combines all endpoint routers
"""

from fastapi import APIRouter

from .endpoints import (
    auth,
    users,
    tasks,
    voices,
    notes,
    streaks,
    analytics,
    sync,
    notifications,
    calls
)

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(voices.router, prefix="/voices", tags=["voices"])
api_router.include_router(notes.router, prefix="/notes", tags=["notes"])
api_router.include_router(streaks.router, prefix="/streaks", tags=["streaks"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(sync.router, prefix="/sync", tags=["sync"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(calls.router, prefix="/calls", tags=["calls"]) 