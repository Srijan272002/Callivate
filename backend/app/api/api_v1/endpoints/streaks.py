"""
Streak management endpoints for Callivate API
"""

from fastapi import APIRouter, HTTPException, status
from app.models.streak import StreakResponse, StreakCalendar

router = APIRouter()

@router.get("/{user_id}", response_model=StreakResponse)
async def get_user_streak(user_id: str):
    """Get user's streak data"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Streak endpoints to be implemented"
    )

@router.get("/{user_id}/calendar/{year}/{month}", response_model=StreakCalendar)
async def get_streak_calendar(user_id: str, year: int, month: int):
    """Get monthly streak calendar"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Streak calendar to be implemented"
    )

@router.post("/{user_id}/reset")
async def reset_streak(user_id: str):
    """Reset user's streak"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Streak reset to be implemented"
    ) 