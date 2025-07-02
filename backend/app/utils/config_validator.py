"""
Configuration Validator for Callivate
"""

import os
import logging
from typing import Dict, List, Any
from enum import Enum

from app.core.config import settings

logger = logging.getLogger(__name__)

class ConfigLevel(Enum):
    REQUIRED = "required"
    RECOMMENDED = "recommended"
    OPTIONAL = "optional"

class ConfigurationValidator:
    """Validates configuration and provides diagnostics"""
    
    def __init__(self):
        self.results: Dict[str, Any] = {}

    def check_supabase_config(self) -> Dict[str, Any]:
        """Check Supabase configuration"""
        url = settings.SUPABASE_URL
        anon_key = settings.SUPABASE_ANON_KEY
        
        if not url or url.startswith("https://your-"):
            return {"passed": False, "message": "Supabase URL not configured"}
        
        if not anon_key or anon_key.startswith("your-"):
            return {"passed": False, "message": "Supabase keys not configured"}
        
        return {"passed": True, "message": "Supabase properly configured"}

    def check_jwt_secret(self) -> Dict[str, Any]:
        """Check JWT secret security"""
        secret = settings.JWT_SECRET_KEY
        
        if not secret or secret == "your-secret-key-change-in-production":
            return {"passed": False, "message": "Default JWT secret - security risk"}
        
        if len(secret) < 32:
            return {"passed": False, "message": "JWT secret too short"}
        
        return {"passed": True, "message": "JWT secret secure"}

    def check_ai_config(self) -> Dict[str, Any]:
        """Check AI configuration"""
        if not settings.GEMINI_API_KEY:
            return {"passed": False, "message": "Gemini API key not configured"}
        
        return {"passed": True, "message": "AI services configured"}

    async def validate_all(self) -> Dict[str, Any]:
        """Run all configuration checks"""
        checks = {
            "supabase": self.check_supabase_config(),
            "jwt_secret": self.check_jwt_secret(),
            "ai_config": self.check_ai_config()
        }
        
        failed_count = sum(1 for check in checks.values() if not check["passed"])
        
        return {
            "overall_status": "good" if failed_count == 0 else "needs_attention",
            "checks": checks,
            "failed_count": failed_count
        }

# Global validator
config_validator = ConfigurationValidator()

async def validate_configuration() -> Dict[str, Any]:
    """Validate current configuration"""
    return await config_validator.validate_all() 