"""
Configuration Validator for Callivate
Ensures proper environment setup and provides diagnostics
"""

import os
import logging
from typing import Dict, List, Any, Optional
from enum import Enum
from dataclasses import dataclass
import re

from app.core.config import settings
from app.utils.error_handler import error_handler, ErrorCategory, ErrorSeverity

logger = logging.getLogger(__name__)

class ConfigLevel(Enum):
    REQUIRED = "required"
    RECOMMENDED = "recommended"
    OPTIONAL = "optional"

@dataclass
class ConfigCheck:
    name: str
    level: ConfigLevel
    description: str
    check_function: callable
    fix_suggestion: str

class ConfigurationValidator:
    """Validates configuration and provides diagnostics"""
    
    def __init__(self):
        self.checks: List[ConfigCheck] = []
        self.results: Dict[str, Any] = {}
        self._setup_checks()

    def _setup_checks(self):
        """Setup all configuration checks"""
        
        # Required checks
        self.checks.extend([
            ConfigCheck(
                name="supabase_url",
                level=ConfigLevel.REQUIRED,
                description="Supabase URL must be configured",
                check_function=self._check_supabase_url,
                fix_suggestion="Set SUPABASE_URL in your .env file"
            ),
            ConfigCheck(
                name="supabase_keys",
                level=ConfigLevel.REQUIRED,
                description="Supabase API keys must be configured",
                check_function=self._check_supabase_keys,
                fix_suggestion="Set SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in your .env file"
            ),
            ConfigCheck(
                name="jwt_secret",
                level=ConfigLevel.REQUIRED,
                description="JWT secret key must be secure",
                check_function=self._check_jwt_secret,
                fix_suggestion="Set a strong JWT_SECRET_KEY in your .env file"
            )
        ])

        # Recommended checks
        self.checks.extend([
            ConfigCheck(
                name="ai_configuration",
                level=ConfigLevel.RECOMMENDED,
                description="AI services should be configured for full functionality",
                check_function=self._check_ai_configuration,
                fix_suggestion="Set GEMINI_API_KEY for AI features"
            ),
            ConfigCheck(
                name="calling_configuration",
                level=ConfigLevel.RECOMMENDED,
                description="Calling services should be configured",
                check_function=self._check_calling_configuration,
                fix_suggestion="Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE for calling features"
            ),
            ConfigCheck(
                name="redis_connection",
                level=ConfigLevel.RECOMMENDED,
                description="Redis should be available for background tasks",
                check_function=self._check_redis_connection,
                fix_suggestion="Install and start Redis, or update REDIS_URL"
            )
        ])

        # Optional checks
        self.checks.extend([
            ConfigCheck(
                name="voice_providers",
                level=ConfigLevel.OPTIONAL,
                description="Additional voice providers enhance user experience",
                check_function=self._check_voice_providers,
                fix_suggestion="Configure ELEVENLABS_API_KEY or OPENAI_API_KEY for premium voices"
            ),
            ConfigCheck(
                name="monitoring_setup",
                level=ConfigLevel.OPTIONAL,
                description="Monitoring and analytics improve system reliability",
                check_function=self._check_monitoring_setup,
                fix_suggestion="Configure Sentry or other monitoring tools"
            )
        ])

    def _check_supabase_url(self) -> Dict[str, Any]:
        """Check Supabase URL configuration"""
        url = settings.SUPABASE_URL
        
        if not url or url.startswith("https://your-"):
            return {"passed": False, "message": "Supabase URL not configured"}
        
        if not re.match(r"https://[a-z0-9]+\.supabase\.co", url):
            return {"passed": False, "message": "Invalid Supabase URL format"}
        
        return {"passed": True, "message": "Supabase URL properly configured"}

    def _check_supabase_keys(self) -> Dict[str, Any]:
        """Check Supabase API keys"""
        anon_key = settings.SUPABASE_ANON_KEY
        service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        
        issues = []
        
        if not anon_key or anon_key.startswith("your-"):
            issues.append("Anonymous key not configured")
        elif len(anon_key) < 50:
            issues.append("Anonymous key appears invalid (too short)")
            
        if not service_key or service_key.startswith("your-"):
            issues.append("Service role key not configured")
        elif len(service_key) < 50:
            issues.append("Service role key appears invalid (too short)")
        
        if issues:
            return {"passed": False, "message": "; ".join(issues)}
        
        return {"passed": True, "message": "Supabase keys properly configured"}

    def _check_jwt_secret(self) -> Dict[str, Any]:
        """Check JWT secret key security"""
        secret = settings.JWT_SECRET_KEY
        
        if not secret or secret == "your-secret-key-change-in-production":
            return {"passed": False, "message": "Default JWT secret detected - security risk"}
        
        if len(secret) < 32:
            return {"passed": False, "message": "JWT secret too short (minimum 32 characters)"}
        
        # Check for common weak patterns
        weak_patterns = ["password", "secret", "key", "123", "abc"]
        if any(pattern in secret.lower() for pattern in weak_patterns):
            return {"passed": False, "message": "JWT secret appears weak"}
        
        return {"passed": True, "message": "JWT secret appears secure"}

    def _check_ai_configuration(self) -> Dict[str, Any]:
        """Check AI service configuration"""
        if not settings.GEMINI_API_KEY:
            return {"passed": False, "message": "Gemini API key not configured"}
        
        if len(settings.GEMINI_API_KEY) < 30:
            return {"passed": False, "message": "Gemini API key appears invalid"}
        
        return {"passed": True, "message": "AI services configured"}

    def _check_calling_configuration(self) -> Dict[str, Any]:
        """Check calling service configuration"""
        issues = []
        
        if not settings.TWILIO_ACCOUNT_SID:
            issues.append("Twilio Account SID missing")
        if not settings.TWILIO_AUTH_TOKEN:
            issues.append("Twilio Auth Token missing")
        if not settings.TWILIO_FROM_PHONE:
            issues.append("Twilio phone number missing")
        
        if issues:
            return {"passed": False, "message": "; ".join(issues)}
        
        return {"passed": True, "message": "Calling services configured"}

    def _check_redis_connection(self) -> Dict[str, Any]:
        """Check Redis connection"""
        try:
            import redis
            r = redis.from_url(settings.REDIS_URL)
            r.ping()
            return {"passed": True, "message": "Redis connection successful"}
        except ImportError:
            return {"passed": False, "message": "Redis package not installed"}
        except Exception as e:
            return {"passed": False, "message": f"Redis connection failed: {str(e)}"}

    def _check_voice_providers(self) -> Dict[str, Any]:
        """Check additional voice provider configuration"""
        providers = []
        
        if settings.ELEVENLABS_API_KEY:
            providers.append("ElevenLabs")
        if settings.OPENAI_API_KEY:
            providers.append("OpenAI")
        if settings.GOOGLE_TTS_API_KEY:
            providers.append("Google TTS")
        
        if providers:
            return {"passed": True, "message": f"Additional providers: {', '.join(providers)}"}
        
        return {"passed": False, "message": "Only browser TTS available"}

    def _check_monitoring_setup(self) -> Dict[str, Any]:
        """Check monitoring configuration"""
        monitoring_tools = []
        
        # Check for common monitoring environment variables
        if os.getenv("SENTRY_DSN"):
            monitoring_tools.append("Sentry")
        
        if monitoring_tools:
            return {"passed": True, "message": f"Monitoring: {', '.join(monitoring_tools)}"}
        
        return {"passed": False, "message": "No monitoring tools configured"}

    async def validate_all(self) -> Dict[str, Any]:
        """Run all configuration checks"""
        results = {
            "overall_status": "unknown",
            "summary": {},
            "checks": {},
            "recommendations": []
        }

        required_passed = 0
        required_total = 0
        recommended_passed = 0
        recommended_total = 0

        for check in self.checks:
            try:
                result = check.check_function()
                results["checks"][check.name] = {
                    "level": check.level.value,
                    "description": check.description,
                    "passed": result["passed"],
                    "message": result["message"],
                    "fix_suggestion": check.fix_suggestion if not result["passed"] else None
                }

                # Track statistics
                if check.level == ConfigLevel.REQUIRED:
                    required_total += 1
                    if result["passed"]:
                        required_passed += 1
                elif check.level == ConfigLevel.RECOMMENDED:
                    recommended_total += 1
                    if result["passed"]:
                        recommended_passed += 1

                # Add recommendations for failed checks
                if not result["passed"]:
                    results["recommendations"].append({
                        "level": check.level.value,
                        "issue": check.description,
                        "suggestion": check.fix_suggestion
                    })

            except Exception as e:
                await error_handler.log_error(
                    category=ErrorCategory.SYSTEM,
                    severity=ErrorSeverity.MEDIUM,
                    message=f"Configuration check failed: {check.name}"
                )
                
                results["checks"][check.name] = {
                    "level": check.level.value,
                    "description": check.description,
                    "passed": False,
                    "message": f"Check failed: {str(e)}",
                    "fix_suggestion": check.fix_suggestion
                }

        # Determine overall status
        if required_passed == required_total:
            if recommended_passed == recommended_total:
                results["overall_status"] = "excellent"
            elif recommended_passed >= recommended_total * 0.7:
                results["overall_status"] = "good"
            else:
                results["overall_status"] = "adequate"
        else:
            results["overall_status"] = "needs_attention"

        # Summary statistics
        results["summary"] = {
            "required": {"passed": required_passed, "total": required_total},
            "recommended": {"passed": recommended_passed, "total": recommended_total},
            "optional": {"passed": 0, "total": 0}  # Calculate if needed
        }

        return results

    def print_validation_report(self, results: Dict[str, Any]) -> None:
        """Print a formatted validation report"""
        print("\n" + "="*60)
        print("🔧 CALLIVATE CONFIGURATION VALIDATION REPORT")
        print("="*60)
        
        # Overall status
        status_emoji = {
            "excellent": "🟢",
            "good": "🟡", 
            "adequate": "🟠",
            "needs_attention": "🔴"
        }
        
        print(f"\nOverall Status: {status_emoji.get(results['overall_status'], '❓')} {results['overall_status'].upper()}")
        
        # Summary
        summary = results["summary"]
        print(f"\nRequired Checks: {summary['required']['passed']}/{summary['required']['total']} passed")
        print(f"Recommended Checks: {summary['recommended']['passed']}/{summary['recommended']['total']} passed")
        
        # Failed checks
        failed_checks = [name for name, check in results["checks"].items() if not check["passed"]]
        if failed_checks:
            print(f"\n❌ Failed Checks ({len(failed_checks)}):")
            for name in failed_checks:
                check = results["checks"][name]
                print(f"  • {check['description']}: {check['message']}")
        
        # Recommendations
        if results["recommendations"]:
            print(f"\n💡 Recommendations:")
            for i, rec in enumerate(results["recommendations"][:5], 1):  # Show top 5
                print(f"  {i}. [{rec['level'].upper()}] {rec['suggestion']}")
        
        print("\n" + "="*60 + "\n")

# Global validator instance
config_validator = ConfigurationValidator()

async def validate_configuration() -> Dict[str, Any]:
    """Validate current configuration"""
    return await config_validator.validate_all()

async def print_config_report():
    """Print configuration validation report"""
    results = await validate_configuration()
    config_validator.print_validation_report(results)
    return results 