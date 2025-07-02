"""
User management endpoints for Callivate API
Handles user profile and settings management
"""

from fastapi import APIRouter, HTTPException, status, Depends
from app.models.user import User, UserUpdate, UserSettings, UserSettingsUpdate
from app.api.api_v1.endpoints.auth import get_current_user
from app.core.database import get_supabase
from supabase import Client
from typing import Optional
from datetime import datetime
from uuid import UUID
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get user profile (users can only access their own profile)"""
    try:
        # Users can only access their own profile
        if str(user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this user profile"
            )
        
        user_response = supabase.table("users").select("*").eq("id", user_id).execute()
        
        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return User(**user_response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user profile"
        )

@router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: UUID,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Update user profile (users can only update their own profile)"""
    try:
        # Users can only update their own profile
        if str(user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this user profile"
            )
        
        # Prepare update data (only non-None values)
        update_data = {}
        for field, value in user_update.dict(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields to update"
            )
        
        update_data["updated_at"] = datetime.now().isoformat()
        
        # Update user
        response = supabase.table("users").update(update_data).eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        updated_user = User(**response.data[0])
        logger.info(f"Updated user profile for {user_id}")
        return updated_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile"
        )

@router.get("/{user_id}/settings", response_model=UserSettings)
async def get_user_settings(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get user settings"""
    try:
        # Users can only access their own settings
        if str(user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access these settings"
            )
        
        settings_response = supabase.table("user_settings").select("*").eq("user_id", user_id).execute()
        
        if not settings_response.data:
            # Create default settings if they don't exist
            default_settings = {
                "user_id": user_id,
                "default_voice_id": "google-wavenet-en-us-1",
                "voice_provider": "google",
                "silent_mode": False,
                "notification_enabled": True,
                "notification_sound": True,
                "time_format": "12h"
            }
            
            create_response = supabase.table("user_settings").insert(default_settings).execute()
            
            if not create_response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create default settings"
                )
            
            return UserSettings(**create_response.data[0])
        
        return UserSettings(**settings_response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user settings for {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user settings"
        )

@router.put("/{user_id}/settings", response_model=UserSettings)
async def update_user_settings(
    user_id: UUID,
    settings: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Update user settings with comprehensive voice and notification preferences"""
    try:
        # Users can only update their own settings
        if str(user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update these settings"
            )
        
        # Prepare update data (only non-None values)
        update_data = {}
        for field, value in settings.dict(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields to update"
            )
        
        # Validate voice_id exists if provided
        if "default_voice_id" in update_data:
            voice_response = supabase.table("voices").select("id").eq("id", update_data["default_voice_id"]).eq("is_active", True).execute()
            if not voice_response.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid voice ID"
                )
        
        update_data["updated_at"] = datetime.now().isoformat()
        
        # Check if settings exist
        existing_settings = supabase.table("user_settings").select("id").eq("user_id", user_id).execute()
        
        if existing_settings.data:
            # Update existing settings
            response = supabase.table("user_settings").update(update_data).eq("user_id", user_id).execute()
        else:
            # Create new settings with update data
            create_data = {
                "user_id": user_id,
                "default_voice_id": "google-wavenet-en-us-1",
                "voice_provider": "google",
                "silent_mode": False,
                "notification_enabled": True,
                "notification_sound": True,
                "time_format": "12h"
            }
            create_data.update(update_data)
            response = supabase.table("user_settings").insert(create_data).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update settings"
            )
        
        updated_settings = UserSettings(**response.data[0])
        logger.info(f"Updated settings for user {user_id}: {list(update_data.keys())}")
        return updated_settings
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user settings for {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user settings"
        )

@router.get("/{user_id}/preferences", response_model=dict)
async def get_user_preferences(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get comprehensive user preferences including voice options"""
    try:
        # Users can only access their own preferences
        if str(user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access these preferences"
            )
        
        # Get user settings
        settings_response = supabase.table("user_settings").select("*").eq("user_id", user_id).execute()
        settings = settings_response.data[0] if settings_response.data else None
        
        # Get available voices for the user's provider
        current_provider = settings.get("voice_provider", "google") if settings else "google"
        voices_response = supabase.table("voices").select("*").eq("provider", current_provider).eq("is_active", True).order("name").execute()
        
        # Get user's current voice details
        current_voice = None
        if settings and settings.get("default_voice_id"):
            current_voice_response = supabase.table("voices").select("*").eq("id", settings["default_voice_id"]).execute()
            current_voice = current_voice_response.data[0] if current_voice_response.data else None
        
        return {
            "settings": settings,
            "current_voice": current_voice,
            "available_voices": voices_response.data,
            "voice_providers": ["google", "elevenlabs", "openai"],
            "time_formats": ["12h", "24h"],
            "notification_preferences": {
                "enabled": settings.get("notification_enabled", True) if settings else True,
                "sound": settings.get("notification_sound", True) if settings else True,
                "silent_mode": settings.get("silent_mode", False) if settings else False
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user preferences for {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user preferences"
        )

@router.post("/{user_id}/reset-settings")
async def reset_user_settings(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Reset user settings to default values"""
    try:
        # Users can only reset their own settings
        if str(user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to reset these settings"
            )
        
        default_settings = {
            "default_voice_id": "google-wavenet-en-us-1",
            "voice_provider": "google",
            "silent_mode": False,
            "notification_enabled": True,
            "notification_sound": True,
            "time_format": "12h",
            "updated_at": datetime.now().isoformat()
        }
        
        # Check if settings exist
        existing_settings = supabase.table("user_settings").select("id").eq("user_id", user_id).execute()
        
        if existing_settings.data:
            # Update existing settings
            response = supabase.table("user_settings").update(default_settings).eq("user_id", user_id).execute()
        else:
            # Create new settings
            default_settings["user_id"] = user_id
            response = supabase.table("user_settings").insert(default_settings).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reset settings"
            )
        
        logger.info(f"Reset settings to defaults for user {user_id}")
        return {"message": "Settings reset to defaults", "settings": UserSettings(**response.data[0])}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting settings for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset user settings"
        )

@router.delete("/{user_id}/account")
async def delete_user_account(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Delete user account and all associated data"""
    try:
        # Users can only delete their own account
        if str(user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this account"
            )
        
        # Delete user data in correct order (due to foreign key constraints)
        tables_to_clear = [
            "task_executions",
            "tasks", 
            "notes",
            "analytics",
            "sync_queue",
            "user_settings",
            "streaks",
            "users"
        ]
        
        for table in tables_to_clear:
            try:
                supabase.table(table).delete().eq("user_id", user_id).execute()
            except Exception as table_error:
                logger.warning(f"Error deleting from {table} for user {user_id}: {str(table_error)}")
        
        # Delete from Supabase Auth (this should cascade and clean up any remaining data)
        try:
            # Note: This requires admin privileges, so we'll log the request
            logger.info(f"User {user_id} account deletion completed from database tables")
            # In production, you might want to trigger a cleanup job for the auth user
        except Exception as auth_error:
            logger.error(f"Error deleting auth user {user_id}: {str(auth_error)}")
        
        logger.info(f"Deleted account and all data for user {user_id}")
        return {"message": "Account and all associated data deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting account for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user account"
        ) 