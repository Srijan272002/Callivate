"""
Analytics endpoints for Callivate API
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Dict, Any
from app.core.database import get_supabase
from supabase import Client
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/monthly/{month_year}")
async def get_monthly_analytics(
    month_year: str,
    supabase: Client = Depends(get_supabase)
) -> Dict[str, Any]:
    """Get monthly analytics for user"""
    try:
        # Get current user from auth (this would be implemented with auth middleware)
        user = supabase.auth.get_user()
        if not user.user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        user_id = user.user.id
        
        # Get analytics data for the specified month
        result = supabase.table('analytics').select('*').eq('user_id', user_id).eq('month_year', month_year).execute()
        
        if not result.data:
            # Return default analytics if no data exists
            return {
                "month_year": month_year,
                "tasks_completed": 0,
                "tasks_missed": 0,
                "completion_rate": 0.0,
                "longest_streak": 0,
                "most_used_voice_id": None,
                "total_call_duration": 0
            }
        
        return result.data[0]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving analytics: {str(e)}"
        )

@router.get("/streak")
async def get_streak_analytics(
    supabase: Client = Depends(get_supabase)
) -> Dict[str, Any]:
    """Get current streak analytics for user"""
    try:
        # Get current user from auth
        user = supabase.auth.get_user()
        if not user.user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        user_id = user.user.id
        
        # Get streak data
        result = supabase.table('streaks').select('*').eq('user_id', user_id).execute()
        
        if not result.data:
            # Return default streak if no data exists
            return {
                "current_streak": 0,
                "longest_streak": 0,
                "last_completion_date": None,
                "streak_start_date": None,
                "total_completions": 0,
                "total_tasks": 0
            }
        
        return result.data[0]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving streak analytics: {str(e)}"
        )

@router.get("/overview")
async def get_analytics_overview(
    supabase: Client = Depends(get_supabase)
) -> Dict[str, Any]:
    """Get overall analytics overview for user"""
    try:
        # Get current user from auth
        user = supabase.auth.get_user()
        if not user.user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        user_id = user.user.id
        
        # Get recent task executions (last 30 days)
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
        
        task_executions = supabase.table('task_executions').select('*').eq('user_id', user_id).gte('executed_at', thirty_days_ago).execute()
        
        # Calculate stats
        total_executions = len(task_executions.data)
        completed_executions = len([ex for ex in task_executions.data if ex['status'] == 'completed'])
        completion_rate = (completed_executions / total_executions * 100) if total_executions > 0 else 0
        
        # Get streak data
        streak_result = supabase.table('streaks').select('*').eq('user_id', user_id).execute()
        current_streak = streak_result.data[0]['current_streak'] if streak_result.data else 0
        
        # Get total call duration
        total_duration = sum([ex.get('call_duration', 0) or 0 for ex in task_executions.data])
        
        return {
            "total_tasks_30_days": total_executions,
            "completed_tasks_30_days": completed_executions,
            "completion_rate_30_days": round(completion_rate, 2),
            "current_streak": current_streak,
            "total_call_duration_30_days": total_duration,
            "avg_call_duration": round(total_duration / completed_executions, 2) if completed_executions > 0 else 0
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving analytics overview: {str(e)}"
        ) 