"""
Authentication endpoints for Callivate API
Handles Google OAuth and JWT token management via Supabase Auth
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.user import User, UserCreate, UserResponse, UserSettings
from app.core.database import get_supabase, get_supabase_admin
from supabase import Client
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase)
) -> User:
    """Dependency to get current authenticated user from JWT token"""
    try:
        # Get user from Supabase using the JWT token
        user_response = supabase.auth.get_user(credentials.credentials)
        
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        # Get user profile from our users table
        user_data = supabase.table("users").select("*").eq("id", user_response.user.id).execute()
        
        if not user_data.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        return User(**user_data.data[0])
    
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

@router.post("/google", response_model=Dict[str, Any])
async def google_oauth_callback(
    id_token: str,
    supabase: Client = Depends(get_supabase)
):
    """Handle Google OAuth login with ID token from client"""
    try:
        # Exchange Google ID token for Supabase session
        auth_response = supabase.auth.sign_in_with_id_token({
            "provider": "google",
            "token": id_token
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google authentication failed"
            )
        
        user_id = auth_response.user.id
        user_email = auth_response.user.email
        user_name = auth_response.user.user_metadata.get("name", "")
        avatar_url = auth_response.user.user_metadata.get("avatar_url", "")
        
        # Check if user profile exists, create if not
        existing_user = supabase.table("users").select("*").eq("id", user_id).execute()
        
        if not existing_user.data:
            # Create user profile
            user_data = {
                "id": user_id,
                "email": user_email,
                "name": user_name,
                "avatar_url": avatar_url,
                "onboarding_completed": False
            }
            
            created_user = supabase.table("users").insert(user_data).execute()
            
            # Create default user settings
            settings_data = {
                "user_id": user_id,
                "default_voice_id": "google-wavenet-en-us-1",
                "voice_provider": "google",
                "silent_mode": False,
                "notification_enabled": True,
                "notification_sound": True,
                "time_format": "12h"
            }
            
            supabase.table("user_settings").insert(settings_data).execute()
            
            # Initialize user streak
            streak_data = {
                "user_id": user_id,
                "current_streak": 0,
                "longest_streak": 0,
                "total_completions": 0,
                "total_tasks": 0
            }
            
            supabase.table("streaks").insert(streak_data).execute()
            
            logger.info(f"Created new user profile for {user_email}")
        else:
            # Update last login time
            supabase.table("users").update({"last_login": "NOW()"}).eq("id", user_id).execute()
        
        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "user": auth_response.user,
            "expires_at": auth_response.session.expires_at
        }
        
    except Exception as e:
        logger.error(f"Google OAuth error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )

@router.post("/refresh")
async def refresh_token(
    refresh_token: str,
    supabase: Client = Depends(get_supabase)
):
    """Refresh access token using refresh token"""
    try:
        auth_response = supabase.auth.refresh_session(refresh_token)
        
        if not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "expires_at": auth_response.session.expires_at
        }
        
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed"
        )

@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Handle user logout"""
    try:
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return {"message": "Logged out successfully"}  # Always return success

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get current authenticated user with settings"""
    try:
        # Get user settings
        settings_response = supabase.table("user_settings").select("*").eq("user_id", current_user.id).execute()
        
        settings = None
        if settings_response.data:
            settings = UserSettings(**settings_response.data[0])
        
        return UserResponse(user=current_user, settings=settings)
        
    except Exception as e:
        logger.error(f"Get user profile error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )

@router.post("/verify-token")
async def verify_token(
    current_user: User = Depends(get_current_user)
):
    """Verify JWT token validity"""
    return {
        "valid": True,
        "user_id": current_user.id,
        "email": current_user.email
    } 