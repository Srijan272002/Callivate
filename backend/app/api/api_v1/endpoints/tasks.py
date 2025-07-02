"""
Task management endpoints for Callivate API
Handles CRUD operations, scheduling, recurring tasks, and completion tracking
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime, date, time, timedelta
from app.models.task import (
    Task, TaskCreate, TaskUpdate, TaskResponse, TaskExecution, TaskExecutionCreate,
    TaskExecutionUpdate, TaskWithExecution, TaskStats, DailyTaskSummary
)
from app.models.user import User
from app.api.api_v1.endpoints.auth import get_current_user
from app.core.database import get_supabase
from supabase import Client
import logging
from uuid import UUID

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=List[TaskWithExecution])
async def get_tasks(
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    date_filter: Optional[date] = Query(None, description="Filter tasks by date"),
    active_only: bool = Query(True, description="Show only active tasks"),
    limit: int = Query(100, description="Maximum number of tasks to return")
):
    """Get user's tasks with latest execution"""
    try:
        query = supabase.table("tasks").select("""
            *,
            task_executions!inner(*)
        """).eq("user_id", current_user.id)
        
        if active_only:
            query = query.eq("is_active", True)
        
        if date_filter:
            query = query.eq("scheduled_date", date_filter.isoformat())
        
        query = query.order("scheduled_time").limit(limit)
        
        response = query.execute()
        
        tasks_with_executions = []
        for task_data in response.data:
            # Separate task and execution data
            task_dict = {k: v for k, v in task_data.items() if k != "task_executions"}
            task = Task(**task_dict)
            
            # Get latest execution
            latest_execution = None
            if task_data.get("task_executions"):
                latest_exec_data = max(task_data["task_executions"], key=lambda x: x["created_at"])
                latest_execution = TaskExecution(**latest_exec_data)
            
            tasks_with_executions.append(TaskWithExecution(
                **task.dict(),
                latest_execution=latest_execution
            ))
        
        return tasks_with_executions
        
    except Exception as e:
        logger.error(f"Error getting tasks: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tasks"
        )

@router.post("/", response_model=Task)
async def create_task(
    task: TaskCreate,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Create a new task with automatic scheduling logic"""
    try:
        # Calculate next scheduled datetime
        next_scheduled_at = _calculate_next_scheduled_time(task)
        
        task_data = {
            "user_id": current_user.id,
            "title": task.title,
            "description": task.description,
            "scheduled_time": task.scheduled_time.isoformat(),
            "scheduled_date": task.scheduled_date.isoformat() if task.scheduled_date else None,
            "recurrence_type": task.recurrence_type,
            "recurrence_pattern": task.recurrence_pattern,
            "voice_id": task.voice_id,
            "silent_mode": task.silent_mode,
            "is_active": True,
            "next_scheduled_at": next_scheduled_at.isoformat() if next_scheduled_at else None
        }
        
        response = supabase.table("tasks").insert(task_data).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create task"
            )
        
        created_task = Task(**response.data[0])
        
        # Create initial task execution if scheduled for future
        if next_scheduled_at and next_scheduled_at > datetime.now():
            execution_data = {
                "task_id": created_task.id,
                "user_id": current_user.id,
                "scheduled_at": next_scheduled_at.isoformat(),
                "status": "pending"
            }
            supabase.table("task_executions").insert(execution_data).execute()
        
        logger.info(f"Created task {created_task.id} for user {current_user.id}")
        return created_task
        
    except Exception as e:
        logger.error(f"Error creating task: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create task"
        )

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get specific task with all executions"""
    try:
        # Get task
        task_response = supabase.table("tasks").select("*").eq("id", task_id).eq("user_id", current_user.id).execute()
        
        if not task_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        task = Task(**task_response.data[0])
        
        # Get all executions for this task
        executions_response = supabase.table("task_executions").select("*").eq("task_id", task_id).order("scheduled_at", desc=True).execute()
        
        executions = [TaskExecution(**exec_data) for exec_data in executions_response.data]
        
        return TaskResponse(task=task, executions=executions)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task {task_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve task"
        )

@router.put("/{task_id}", response_model=Task)
async def update_task(
    task_id: UUID,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Update a task and recalculate scheduling"""
    try:
        # Get existing task
        existing_response = supabase.table("tasks").select("*").eq("id", task_id).eq("user_id", current_user.id).execute()
        
        if not existing_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        existing_task = Task(**existing_response.data[0])
        
        # Prepare update data (only non-None values)
        update_data = {}
        for field, value in task_update.dict(exclude_unset=True).items():
            if value is not None:
                if field in ["scheduled_time"]:
                    update_data[field] = value.isoformat()
                elif field in ["scheduled_date"]:
                    update_data[field] = value.isoformat() if value else None
                else:
                    update_data[field] = value
        
        # Recalculate next scheduled time if timing fields changed
        if any(field in task_update.dict(exclude_unset=True) for field in ["scheduled_time", "scheduled_date", "recurrence_type", "recurrence_pattern"]):
            # Create temporary task with updated values for calculation
            temp_task_data = existing_task.dict()
            temp_task_data.update(update_data)
            temp_task = TaskCreate(**{k: v for k, v in temp_task_data.items() if k in TaskCreate.__fields__})
            
            next_scheduled_at = _calculate_next_scheduled_time(temp_task)
            update_data["next_scheduled_at"] = next_scheduled_at.isoformat() if next_scheduled_at else None
        
        update_data["updated_at"] = datetime.now().isoformat()
        
        # Update task
        response = supabase.table("tasks").update(update_data).eq("id", task_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update task"
            )
        
        updated_task = Task(**response.data[0])
        logger.info(f"Updated task {task_id} for user {current_user.id}")
        return updated_task
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating task {task_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update task"
        )

@router.delete("/{task_id}")
async def delete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Delete a task and all its executions"""
    try:
        # Check if task exists and belongs to user
        task_response = supabase.table("tasks").select("id").eq("id", task_id).eq("user_id", current_user.id).execute()
        
        if not task_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Delete task executions first (cascade should handle this, but being explicit)
        supabase.table("task_executions").delete().eq("task_id", task_id).execute()
        
        # Delete task
        supabase.table("tasks").delete().eq("id", task_id).execute()
        
        logger.info(f"Deleted task {task_id} for user {current_user.id}")
        return {"message": "Task deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting task {task_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete task"
        )

@router.post("/{task_id}/complete", response_model=TaskExecution)
async def complete_task(
    task_id: UUID,
    completion_method: str = "manual",
    response_text: Optional[str] = None,
    call_duration: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Mark a task as completed and update streak"""
    try:
        # Get task
        task_response = supabase.table("tasks").select("*").eq("id", task_id).eq("user_id", current_user.id).execute()
        
        if not task_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        task = Task(**task_response.data[0])
        
        # Find or create pending execution for today
        today = date.today()
        execution_response = supabase.table("task_executions").select("*").eq("task_id", task_id).eq("status", "pending").gte("scheduled_at", today.isoformat()).lt("scheduled_at", (today + timedelta(days=1)).isoformat()).execute()
        
        execution_data = {
            "executed_at": datetime.now().isoformat(),
            "status": "completed",
            "completion_method": completion_method,
            "response_text": response_text,
            "call_duration": call_duration
        }
        
        if execution_response.data:
            # Update existing execution
            execution_id = execution_response.data[0]["id"]
            response = supabase.table("task_executions").update(execution_data).eq("id", execution_id).execute()
            completed_execution = TaskExecution(**response.data[0])
        else:
            # Create new execution
            execution_data.update({
                "task_id": task_id,
                "user_id": current_user.id,
                "scheduled_at": datetime.combine(today, task.scheduled_time).isoformat()
            })
            response = supabase.table("task_executions").insert(execution_data).execute()
            completed_execution = TaskExecution(**response.data[0])
        
        # Update task's last completed timestamp
        supabase.table("tasks").update({
            "last_completed_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }).eq("id", task_id).execute()
        
        # Update user streak (this would typically be done via a background job)
        await _update_user_streak(current_user.id, supabase)
        
        logger.info(f"Completed task {task_id} for user {current_user.id}")
        return completed_execution
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing task {task_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete task"
        )

@router.get("/stats/summary", response_model=TaskStats)
async def get_task_stats(
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get user's task statistics"""
    try:
        today = date.today()
        
        # Get total tasks
        total_response = supabase.table("tasks").select("id", count="exact").eq("user_id", current_user.id).eq("is_active", True).execute()
        total_tasks = total_response.count or 0
        
        # Get today's completed tasks
        completed_today_response = supabase.table("task_executions").select("id", count="exact").eq("user_id", current_user.id).eq("status", "completed").gte("executed_at", today.isoformat()).lt("executed_at", (today + timedelta(days=1)).isoformat()).execute()
        completed_today = completed_today_response.count or 0
        
        # Get today's pending tasks
        pending_today_response = supabase.table("task_executions").select("id", count="exact").eq("user_id", current_user.id).eq("status", "pending").gte("scheduled_at", today.isoformat()).lt("scheduled_at", (today + timedelta(days=1)).isoformat()).execute()
        pending_today = pending_today_response.count or 0
        
        # Get current streak
        streak_response = supabase.table("streaks").select("current_streak").eq("user_id", current_user.id).execute()
        current_streak = streak_response.data[0]["current_streak"] if streak_response.data else 0
        
        # Calculate completion rate (last 30 days)
        thirty_days_ago = today - timedelta(days=30)
        total_scheduled_response = supabase.table("task_executions").select("id", count="exact").eq("user_id", current_user.id).gte("scheduled_at", thirty_days_ago.isoformat()).execute()
        completed_response = supabase.table("task_executions").select("id", count="exact").eq("user_id", current_user.id).eq("status", "completed").gte("executed_at", thirty_days_ago.isoformat()).execute()
        
        total_scheduled = total_scheduled_response.count or 0
        total_completed = completed_response.count or 0
        completion_rate = (total_completed / total_scheduled * 100) if total_scheduled > 0 else 0
        
        return TaskStats(
            total_tasks=total_tasks,
            completed_today=completed_today,
            pending_today=pending_today,
            current_streak=current_streak,
            completion_rate=round(completion_rate, 2)
        )
        
    except Exception as e:
        logger.error(f"Error getting task stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get task statistics"
        )

def _calculate_next_scheduled_time(task: TaskCreate) -> Optional[datetime]:
    """Calculate the next scheduled datetime for a task"""
    if not task.scheduled_time:
        return None
    
    base_date = task.scheduled_date or date.today()
    scheduled_datetime = datetime.combine(base_date, task.scheduled_time)
    
    # If it's a one-time task and the time has passed today, schedule for the specified date or tomorrow
    if task.recurrence_type == "none":
        if task.scheduled_date:
            return scheduled_datetime
        elif scheduled_datetime <= datetime.now():
            return scheduled_datetime + timedelta(days=1)
        else:
            return scheduled_datetime
    
    # For recurring tasks, find the next occurrence
    current_time = datetime.now()
    next_time = scheduled_datetime
    
    if task.recurrence_type == "daily":
        while next_time <= current_time:
            next_time += timedelta(days=1)
    elif task.recurrence_type == "weekly":
        while next_time <= current_time:
            next_time += timedelta(weeks=1)
    elif task.recurrence_type == "custom" and task.recurrence_pattern:
        # Handle custom recurrence patterns (implementation depends on pattern structure)
        # For now, default to daily
        while next_time <= current_time:
            next_time += timedelta(days=1)
    
    return next_time

async def _update_user_streak(user_id: UUID, supabase: Client):
    """Update user's streak based on task completions"""
    try:
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        # Check if user completed any tasks today
        today_completions = supabase.table("task_executions").select("id", count="exact").eq("user_id", user_id).eq("status", "completed").gte("executed_at", today.isoformat()).lt("executed_at", (today + timedelta(days=1)).isoformat()).execute()
        
        # Check if user completed any tasks yesterday
        yesterday_completions = supabase.table("task_executions").select("id", count="exact").eq("user_id", user_id).eq("status", "completed").gte("executed_at", yesterday.isoformat()).lt("executed_at", today.isoformat()).execute()
        
        # Get current streak
        streak_response = supabase.table("streaks").select("*").eq("user_id", user_id).execute()
        
        if not streak_response.data:
            # Initialize streak record
            streak_data = {
                "user_id": user_id,
                "current_streak": 1 if today_completions.count > 0 else 0,
                "longest_streak": 1 if today_completions.count > 0 else 0,
                "last_completion_date": today.isoformat() if today_completions.count > 0 else None,
                "streak_start_date": today.isoformat() if today_completions.count > 0 else None,
                "total_completions": today_completions.count or 0,
                "total_tasks": 0  # This would be calculated separately
            }
            supabase.table("streaks").insert(streak_data).execute()
        else:
            current_streak_data = streak_response.data[0]
            current_streak = current_streak_data["current_streak"]
            longest_streak = current_streak_data["longest_streak"]
            last_completion_date = current_streak_data["last_completion_date"]
            
            # Update streak logic
            if today_completions.count > 0:
                if last_completion_date == yesterday.isoformat() or last_completion_date == today.isoformat():
                    # Continue or maintain streak
                    if last_completion_date != today.isoformat():
                        current_streak += 1
                elif not last_completion_date or last_completion_date < yesterday.isoformat():
                    # Start new streak
                    current_streak = 1
                
                # Update longest streak if current is longer
                longest_streak = max(longest_streak, current_streak)
                
                update_data = {
                    "current_streak": current_streak,
                    "longest_streak": longest_streak,
                    "last_completion_date": today.isoformat(),
                    "total_completions": current_streak_data["total_completions"] + (today_completions.count or 0),
                    "updated_at": datetime.now().isoformat()
                }
                
                if current_streak == 1:
                    update_data["streak_start_date"] = today.isoformat()
                
                supabase.table("streaks").update(update_data).eq("user_id", user_id).execute()
            
    except Exception as e:
        logger.error(f"Error updating streak for user {user_id}: {str(e)}")
        # Don't raise error as this is a background operation 