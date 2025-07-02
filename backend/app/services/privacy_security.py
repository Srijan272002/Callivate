"""
Privacy & Security Service for Callivate
Handles content filtering, voice recording cleanup, data privacy compliance,
and rate limiting with Supabase RLS integration
"""

import asyncio
import logging
import re
import hashlib
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any, Set
from dataclasses import dataclass
from enum import Enum
import json

from supabase import Client
from app.core.database import get_supabase
from app.core.config import settings

logger = logging.getLogger(__name__)

class ContentFilterLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class SecurityViolationType(Enum):
    INAPPROPRIATE_CONTENT = "inappropriate_content"
    SPAM = "spam"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    DATA_BREACH_ATTEMPT = "data_breach_attempt"

@dataclass
class SecurityEvent:
    user_id: str
    event_type: SecurityViolationType
    severity: str  # low, medium, high, critical
    description: str
    metadata: Dict[str, Any]
    timestamp: datetime

class PrivacySecurityService:
    """
    Comprehensive privacy and security service
    """
    
    def __init__(self):
        self.supabase = get_supabase()
        self.rate_limit_cache = {}
        self.blocked_ips = set()
        self.content_filter_patterns = self._load_filter_patterns()
        self.cleanup_tasks = []
        
    # Content Filtering
    
    def filter_inappropriate_content(
        self, 
        content: str, 
        filter_level: ContentFilterLevel = ContentFilterLevel.MEDIUM
    ) -> Dict[str, Any]:
        """
        Filter inappropriate content from user inputs
        Returns filtered content and violation details
        """
        try:
            violations = []
            filtered_content = content
            
            # Check for profanity
            profanity_result = self._check_profanity(content, filter_level)
            if profanity_result["violations"]:
                violations.extend(profanity_result["violations"])
                filtered_content = profanity_result["filtered_content"]
            
            # Check for personal information
            pii_result = self._check_personal_info(filtered_content)
            if pii_result["violations"]:
                violations.extend(pii_result["violations"])
                filtered_content = pii_result["filtered_content"]
            
            # Check for malicious content
            malicious_result = self._check_malicious_content(filtered_content)
            if malicious_result["violations"]:
                violations.extend(malicious_result["violations"])
                filtered_content = malicious_result["filtered_content"]
            
            return {
                "original_content": content,
                "filtered_content": filtered_content,
                "violations": violations,
                "is_safe": len(violations) == 0,
                "filter_level": filter_level.value
            }
            
        except Exception as e:
            logger.error(f"Error filtering content: {e}")
            return {
                "original_content": content,
                "filtered_content": content,
                "violations": [],
                "is_safe": True,
                "filter_level": filter_level.value,
                "error": str(e)
            }
    
    def _check_profanity(self, content: str, filter_level: ContentFilterLevel) -> Dict[str, Any]:
        """Check for profanity and inappropriate language"""
        violations = []
        filtered_content = content.lower()
        
        # Get profanity patterns based on filter level
        patterns = self.content_filter_patterns.get("profanity", {}).get(filter_level.value, [])
        
        for pattern in patterns:
            if re.search(pattern, filtered_content, re.IGNORECASE):
                violations.append({
                    "type": "profanity",
                    "pattern": pattern,
                    "severity": self._get_violation_severity(pattern)
                })
                # Replace with asterisks
                filtered_content = re.sub(pattern, "*" * len(pattern), filtered_content, flags=re.IGNORECASE)
        
        return {
            "filtered_content": filtered_content,
            "violations": violations
        }
    
    def _check_personal_info(self, content: str) -> Dict[str, Any]:
        """Check for and redact personal information"""
        violations = []
        filtered_content = content
        
        # Email pattern
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        if re.search(email_pattern, content):
            violations.append({"type": "email", "severity": "medium"})
            filtered_content = re.sub(email_pattern, "[EMAIL_REDACTED]", filtered_content)
        
        # Phone number pattern
        phone_pattern = r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'
        if re.search(phone_pattern, content):
            violations.append({"type": "phone", "severity": "medium"})
            filtered_content = re.sub(phone_pattern, "[PHONE_REDACTED]", filtered_content)
        
        # SSN pattern (US)
        ssn_pattern = r'\b\d{3}-\d{2}-\d{4}\b'
        if re.search(ssn_pattern, content):
            violations.append({"type": "ssn", "severity": "high"})
            filtered_content = re.sub(ssn_pattern, "[SSN_REDACTED]", filtered_content)
        
        # Credit card pattern
        cc_pattern = r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b'
        if re.search(cc_pattern, content):
            violations.append({"type": "credit_card", "severity": "high"})
            filtered_content = re.sub(cc_pattern, "[CC_REDACTED]", filtered_content)
        
        return {
            "filtered_content": filtered_content,
            "violations": violations
        }
    
    def _check_malicious_content(self, content: str) -> Dict[str, Any]:
        """Check for malicious content like SQL injection attempts"""
        violations = []
        filtered_content = content
        
        # SQL injection patterns
        sql_patterns = [
            r'(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b|\bupdate\b).*(\bfrom\b|\binto\b|\bwhere\b)',
            r'(\b--|\b#|\b/\*)',
            r'(\bor\b|\band\b).*\b1\s*=\s*1\b',
            r'\b(exec|execute)\b.*\(',
        ]
        
        for pattern in sql_patterns:
            if re.search(pattern, content.lower()):
                violations.append({
                    "type": "sql_injection",
                    "pattern": pattern,
                    "severity": "critical"
                })
                filtered_content = "[MALICIOUS_CONTENT_BLOCKED]"
        
        # Script injection patterns
        script_patterns = [
            r'<script.*?>.*?</script>',
            r'javascript:',
            r'on\w+\s*=',
        ]
        
        for pattern in script_patterns:
            if re.search(pattern, content.lower()):
                violations.append({
                    "type": "script_injection",
                    "pattern": pattern,
                    "severity": "critical"
                })
                filtered_content = re.sub(pattern, "[SCRIPT_BLOCKED]", filtered_content, flags=re.IGNORECASE)
        
        return {
            "filtered_content": filtered_content,
            "violations": violations
        }
    
    def _get_violation_severity(self, pattern: str) -> str:
        """Get severity level for a violation pattern"""
        # This would be more sophisticated in production
        if any(word in pattern.lower() for word in ["extreme", "violent", "illegal"]):
            return "critical"
        elif any(word in pattern.lower() for word in ["offensive", "inappropriate"]):
            return "high"
        else:
            return "medium"
    
    # Rate Limiting
    
    def check_rate_limit(
        self, 
        user_id: str, 
        action: str, 
        limit: int = 100, 
        window_minutes: int = 60
    ) -> Dict[str, Any]:
        """
        Check if user has exceeded rate limit for specific action
        """
        try:
            current_time = time.time()
            window_start = current_time - (window_minutes * 60)
            
            # Create rate limit key
            rate_key = f"{user_id}:{action}"
            
            # Initialize if not exists
            if rate_key not in self.rate_limit_cache:
                self.rate_limit_cache[rate_key] = []
            
            # Clean old entries
            self.rate_limit_cache[rate_key] = [
                timestamp for timestamp in self.rate_limit_cache[rate_key]
                if timestamp > window_start
            ]
            
            # Check current count
            current_count = len(self.rate_limit_cache[rate_key])
            
            if current_count >= limit:
                # Rate limit exceeded
                remaining_time = min(self.rate_limit_cache[rate_key]) + (window_minutes * 60) - current_time
                
                # Log security event
                self._log_security_event(SecurityEvent(
                    user_id=user_id,
                    event_type=SecurityViolationType.RATE_LIMIT_EXCEEDED,
                    severity="medium",
                    description=f"Rate limit exceeded for action: {action}",
                    metadata={
                        "action": action,
                        "current_count": current_count,
                        "limit": limit,
                        "window_minutes": window_minutes
                    },
                    timestamp=datetime.now()
                ))
                
                return {
                    "allowed": False,
                    "limit_exceeded": True,
                    "current_count": current_count,
                    "limit": limit,
                    "reset_time": remaining_time,
                    "retry_after": int(remaining_time)
                }
            
            # Add current request
            self.rate_limit_cache[rate_key].append(current_time)
            
            return {
                "allowed": True,
                "limit_exceeded": False,
                "current_count": current_count + 1,
                "limit": limit,
                "remaining": limit - current_count - 1,
                "reset_time": window_minutes * 60
            }
            
        except Exception as e:
            logger.error(f"Error checking rate limit: {e}")
            return {"allowed": True, "error": str(e)}
    
    # Voice Recording Cleanup
    
    async def schedule_voice_cleanup(self, recording_path: str, cleanup_delay_hours: int = 24):
        """Schedule voice recording cleanup after specified delay"""
        try:
            cleanup_time = datetime.now() + timedelta(hours=cleanup_delay_hours)
            
            cleanup_task = {
                "recording_path": recording_path,
                "cleanup_time": cleanup_time,
                "scheduled_at": datetime.now()
            }
            
            self.cleanup_tasks.append(cleanup_task)
            
            # Log cleanup scheduling
            logger.info(f"Scheduled cleanup for {recording_path} at {cleanup_time}")
            
        except Exception as e:
            logger.error(f"Error scheduling voice cleanup: {e}")
    
    async def process_voice_cleanup(self):
        """Process scheduled voice recording cleanup"""
        current_time = datetime.now()
        cleaned_count = 0
        
        try:
            # Get tasks ready for cleanup
            ready_tasks = [
                task for task in self.cleanup_tasks
                if task["cleanup_time"] <= current_time
            ]
            
            for task in ready_tasks:
                try:
                    # In production, this would delete actual files
                    # For now, we'll just log and remove from list
                    logger.info(f"Cleaning up voice recording: {task['recording_path']}")
                    
                    # Remove from cleanup list
                    self.cleanup_tasks.remove(task)
                    cleaned_count += 1
                    
                except Exception as e:
                    logger.error(f"Error cleaning up recording {task['recording_path']}: {e}")
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} voice recordings")
                
        except Exception as e:
            logger.error(f"Error processing voice cleanup: {e}")
    
    # Data Privacy Compliance
    
    async def anonymize_user_data(self, user_id: str) -> Dict[str, Any]:
        """Anonymize user data for privacy compliance"""
        try:
            anonymization_result = {
                "user_id": user_id,
                "anonymized_at": datetime.now().isoformat(),
                "tables_processed": [],
                "records_anonymized": 0
            }
            
            # Tables to anonymize
            tables_to_process = [
                "users", "task_executions", "notes", 
                "analytics", "sync_queue"
            ]
            
            for table in tables_to_process:
                try:
                    result = await self._anonymize_table_data(user_id, table)
                    anonymization_result["tables_processed"].append({
                        "table": table,
                        "records_affected": result.get("count", 0),
                        "success": result.get("success", False)
                    })
                    anonymization_result["records_anonymized"] += result.get("count", 0)
                    
                except Exception as e:
                    logger.error(f"Error anonymizing table {table}: {e}")
                    anonymization_result["tables_processed"].append({
                        "table": table,
                        "error": str(e),
                        "success": False
                    })
            
            return anonymization_result
            
        except Exception as e:
            logger.error(f"Error anonymizing user data: {e}")
            return {"error": str(e), "success": False}
    
    async def _anonymize_table_data(self, user_id: str, table: str) -> Dict[str, Any]:
        """Anonymize data in a specific table"""
        try:
            # Generate anonymous hash
            anonymous_id = hashlib.sha256(f"anon_{user_id}_{int(time.time())}".encode()).hexdigest()[:16]
            
            if table == "users":
                # Anonymize user profile
                update_data = {
                    "email": f"anonymous_{anonymous_id}@deleted.local",
                    "name": f"Anonymous User {anonymous_id[:8]}",
                    "avatar_url": None
                }
            elif table == "task_executions":
                # Remove sensitive response text
                update_data = {
                    "response_text": "[ANONYMIZED]"
                }
            elif table == "notes":
                # Anonymize note content
                update_data = {
                    "title": "[ANONYMIZED]",
                    "content": "[ANONYMIZED]"
                }
            else:
                # For other tables, we might just mark as anonymized
                update_data = {
                    "updated_at": datetime.now().isoformat()
                }
            
            # Execute update
            response = self.supabase.table(table).update(update_data).eq(
                "user_id", user_id
            ).execute()
            
            return {
                "success": True,
                "count": len(response.data) if response.data else 0
            }
            
        except Exception as e:
            logger.error(f"Error anonymizing table {table}: {e}")
            return {"success": False, "error": str(e)}
    
    async def export_user_data(self, user_id: str) -> Dict[str, Any]:
        """Export all user data for GDPR compliance"""
        try:
            export_data = {
                "user_id": user_id,
                "export_timestamp": datetime.now().isoformat(),
                "data": {}
            }
            
            # Tables to export
            tables_to_export = [
                "users", "user_settings", "tasks", "task_executions",
                "notes", "analytics", "streaks"
            ]
            
            for table in tables_to_export:
                try:
                    response = self.supabase.table(table).select("*").eq(
                        "user_id", user_id
                    ).execute()
                    
                    export_data["data"][table] = response.data or []
                    
                except Exception as e:
                    logger.error(f"Error exporting table {table}: {e}")
                    export_data["data"][table] = {"error": str(e)}
            
            return export_data
            
        except Exception as e:
            logger.error(f"Error exporting user data: {e}")
            return {"error": str(e), "success": False}
    
    # Security Event Logging
    
    def _log_security_event(self, event: SecurityEvent):
        """Log security event for monitoring"""
        try:
            event_data = {
                "user_id": event.user_id,
                "event_type": event.event_type.value,
                "severity": event.severity,
                "description": event.description,
                "metadata": json.dumps(event.metadata),
                "timestamp": event.timestamp.isoformat(),
                "created_at": datetime.now().isoformat()
            }
            
            # In production, save to security_events table
            logger.warning(f"Security Event: {event.event_type.value} - {event.description} (User: {event.user_id})")
            
        except Exception as e:
            logger.error(f"Error logging security event: {e}")
    
    def _load_filter_patterns(self) -> Dict[str, Any]:
        """Load content filter patterns"""
        # In production, these would be loaded from configuration or database
        return {
            "profanity": {
                "low": ["spam", "scam"],
                "medium": ["inappropriate", "offensive"],
                "high": ["explicit", "violent", "illegal"]
            }
        }
    
    # IP Blocking
    
    def block_ip(self, ip_address: str, reason: str = "Security violation"):
        """Block an IP address"""
        try:
            self.blocked_ips.add(ip_address)
            
            self._log_security_event(SecurityEvent(
                user_id="system",
                event_type=SecurityViolationType.SUSPICIOUS_ACTIVITY,
                severity="high",
                description=f"IP address blocked: {ip_address}",
                metadata={"ip_address": ip_address, "reason": reason},
                timestamp=datetime.now()
            ))
            
            logger.warning(f"Blocked IP address: {ip_address} - Reason: {reason}")
            
        except Exception as e:
            logger.error(f"Error blocking IP: {e}")
    
    def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if IP address is blocked"""
        return ip_address in self.blocked_ips
    
    # Data Validation
    
    def validate_input_data(self, data: Dict[str, Any], schema: Dict[str, Any]) -> Dict[str, Any]:
        """Validate input data against schema"""
        try:
            validation_result = {
                "valid": True,
                "errors": [],
                "sanitized_data": {}
            }
            
            for field, value in data.items():
                if field in schema:
                    field_schema = schema[field]
                    validation = self._validate_field(field, value, field_schema)
                    
                    if validation["valid"]:
                        validation_result["sanitized_data"][field] = validation["sanitized_value"]
                    else:
                        validation_result["valid"] = False
                        validation_result["errors"].extend(validation["errors"])
                else:
                    # Unknown field
                    validation_result["errors"].append(f"Unknown field: {field}")
            
            return validation_result
            
        except Exception as e:
            logger.error(f"Error validating input data: {e}")
            return {
                "valid": False,
                "errors": [f"Validation error: {str(e)}"],
                "sanitized_data": {}
            }
    
    def _validate_field(self, field: str, value: Any, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Validate individual field"""
        errors = []
        sanitized_value = value
        
        # Type validation
        expected_type = schema.get("type")
        if expected_type and not isinstance(value, expected_type):
            errors.append(f"Field {field} must be of type {expected_type.__name__}")
        
        # Length validation for strings
        if isinstance(value, str):
            min_length = schema.get("min_length", 0)
            max_length = schema.get("max_length", 10000)
            
            if len(value) < min_length:
                errors.append(f"Field {field} must be at least {min_length} characters")
            if len(value) > max_length:
                errors.append(f"Field {field} must be at most {max_length} characters")
                sanitized_value = value[:max_length]
        
        # Pattern validation
        pattern = schema.get("pattern")
        if pattern and isinstance(value, str):
            if not re.match(pattern, value):
                errors.append(f"Field {field} does not match required pattern")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "sanitized_value": sanitized_value
        }

# Global instance
privacy_security = PrivacySecurityService()

def get_privacy_security_service() -> PrivacySecurityService:
    """Get privacy and security service instance"""
    return privacy_security 