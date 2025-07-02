"""
Enhanced Error Handling System for Callivate
"""

import logging
from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional
from dataclasses import dataclass

class ErrorCategory(Enum):
    DATABASE = "database"
    AUTHENTICATION = "authentication" 
    EXTERNAL_API = "external_api"
    SYSTEM = "system"

class ErrorSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high" 
    CRITICAL = "critical"

@dataclass
class StructuredError:
    error_id: str
    category: ErrorCategory
    severity: ErrorSeverity
    message: str
    timestamp: datetime

class EnhancedErrorHandler:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def log_error(self, category: ErrorCategory, severity: ErrorSeverity, message: str) -> StructuredError:
        error_id = f"{category.value}_{datetime.utcnow().timestamp()}"
        
        if severity == ErrorSeverity.CRITICAL:
            self.logger.critical(message)
        elif severity == ErrorSeverity.HIGH:
            self.logger.error(message)
        else:
            self.logger.warning(message)
            
        return StructuredError(
            error_id=error_id,
            category=category,
            severity=severity,
            message=message,
            timestamp=datetime.utcnow()
        )

# Global instance
error_handler = EnhancedErrorHandler() 