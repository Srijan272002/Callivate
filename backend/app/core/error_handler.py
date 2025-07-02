"""
Enhanced Error Handling and Logging System for Callivate
Provides structured error handling, logging, and monitoring capabilities
"""

import logging
import traceback
from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
import json
import asyncio
from contextlib import asynccontextmanager

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


class ErrorCategory(Enum):
    """Error categories for classification"""
    DATABASE = "database"
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    EXTERNAL_API = "external_api"
    BUSINESS_LOGIC = "business_logic"
    SYSTEM = "system"
    NETWORK = "network"
    CONFIGURATION = "configuration"


class ErrorSeverity(Enum):
    """Error severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ErrorContext:
    """Error context information"""
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    additional_data: Optional[Dict[str, Any]] = None


@dataclass
class StructuredError:
    """Structured error representation"""
    error_id: str
    category: ErrorCategory
    severity: ErrorSeverity
    message: str
    details: Optional[str] = None
    context: Optional[ErrorContext] = None
    timestamp: datetime = None
    stack_trace: Optional[str] = None
    retry_count: int = 0
    resolved: bool = False

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging"""
        result = asdict(self)
        result['category'] = self.category.value
        result['severity'] = self.severity.value
        result['timestamp'] = self.timestamp.isoformat()
        return result


class EnhancedErrorHandler:
    """Enhanced error handler with structured logging and monitoring"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.error_counts: Dict[str, int] = {}
        self.recent_errors: List[StructuredError] = []
        self.max_recent_errors = 100

    def create_error_id(self, category: ErrorCategory, message: str) -> str:
        """Create unique error ID"""
        import hashlib
        content = f"{category.value}:{message}:{datetime.utcnow().isoformat()}"
        return hashlib.md5(content.encode()).hexdigest()[:12]

    def log_error(
        self,
        category: ErrorCategory,
        severity: ErrorSeverity,
        message: str,
        details: Optional[str] = None,
        context: Optional[ErrorContext] = None,
        exception: Optional[Exception] = None
    ) -> StructuredError:
        """Log structured error"""
        
        error_id = self.create_error_id(category, message)
        
        # Get stack trace if exception provided
        stack_trace = None
        if exception:
            stack_trace = ''.join(traceback.format_exception(
                type(exception), exception, exception.__traceback__
            ))

        # Create structured error
        structured_error = StructuredError(
            error_id=error_id,
            category=category,
            severity=severity,
            message=message,
            details=details,
            context=context,
            stack_trace=stack_trace
        )

        # Log with appropriate level
        log_data = structured_error.to_dict()
        
        if severity == ErrorSeverity.CRITICAL:
            self.logger.critical(f"CRITICAL ERROR: {message}", extra=log_data)
        elif severity == ErrorSeverity.HIGH:
            self.logger.error(f"HIGH SEVERITY: {message}", extra=log_data)
        elif severity == ErrorSeverity.MEDIUM:
            self.logger.warning(f"MEDIUM SEVERITY: {message}", extra=log_data)
        else:
            self.logger.info(f"LOW SEVERITY: {message}", extra=log_data)

        # Track error counts
        error_key = f"{category.value}:{severity.value}"
        self.error_counts[error_key] = self.error_counts.get(error_key, 0) + 1

        # Store recent errors
        self.recent_errors.append(structured_error)
        if len(self.recent_errors) > self.max_recent_errors:
            self.recent_errors.pop(0)

        return structured_error

    def get_error_stats(self) -> Dict[str, Any]:
        """Get error statistics"""
        return {
            "total_errors": sum(self.error_counts.values()),
            "error_counts_by_category": self.error_counts,
            "recent_errors_count": len(self.recent_errors),
            "critical_errors_last_hour": len([
                e for e in self.recent_errors 
                if e.severity == ErrorSeverity.CRITICAL and 
                (datetime.utcnow() - e.timestamp).total_seconds() < 3600
            ])
        }

    async def handle_database_error(
        self, 
        exception: Exception, 
        operation: str,
        context: Optional[ErrorContext] = None
    ) -> StructuredError:
        """Handle database-specific errors"""
        
        # Classify database error severity
        severity = ErrorSeverity.HIGH
        if "connection" in str(exception).lower():
            severity = ErrorSeverity.CRITICAL
        elif "timeout" in str(exception).lower():
            severity = ErrorSeverity.MEDIUM

        return self.log_error(
            category=ErrorCategory.DATABASE,
            severity=severity,
            message=f"Database error in {operation}",
            details=str(exception),
            context=context,
            exception=exception
        )

    async def handle_api_error(
        self,
        exception: Exception,
        service_name: str,
        endpoint: str,
        context: Optional[ErrorContext] = None
    ) -> StructuredError:
        """Handle external API errors"""
        
        severity = ErrorSeverity.MEDIUM
        if "timeout" in str(exception).lower():
            severity = ErrorSeverity.HIGH
        elif "404" in str(exception) or "401" in str(exception):
            severity = ErrorSeverity.LOW

        return self.log_error(
            category=ErrorCategory.EXTERNAL_API,
            severity=severity,
            message=f"External API error: {service_name}",
            details=f"Endpoint: {endpoint}, Error: {str(exception)}",
            context=context,
            exception=exception
        )

    def create_http_error_response(
        self, 
        structured_error: StructuredError,
        show_details: bool = False
    ) -> JSONResponse:
        """Create HTTP error response from structured error"""
        
        # Map severity to HTTP status codes
        status_map = {
            ErrorSeverity.LOW: 400,
            ErrorSeverity.MEDIUM: 500,
            ErrorSeverity.HIGH: 500,
            ErrorSeverity.CRITICAL: 503
        }

        status_code = status_map.get(structured_error.severity, 500)
        
        response_data = {
            "error_id": structured_error.error_id,
            "message": structured_error.message,
            "category": structured_error.category.value,
            "timestamp": structured_error.timestamp.isoformat()
        }

        if show_details and structured_error.details:
            response_data["details"] = structured_error.details

        return JSONResponse(
            status_code=status_code,
            content=response_data
        )


class CircuitBreaker:
    """Circuit breaker pattern for external services"""

    def __init__(
        self, 
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half-open

    def can_execute(self) -> bool:
        """Check if operation can be executed"""
        if self.state == "closed":
            return True
        elif self.state == "open":
            if (datetime.utcnow().timestamp() - self.last_failure_time) > self.recovery_timeout:
                self.state = "half-open"
                return True
            return False
        else:  # half-open
            return True

    def record_success(self):
        """Record successful operation"""
        self.failure_count = 0
        self.state = "closed"

    def record_failure(self):
        """Record failed operation"""
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow().timestamp()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "open"

    @asynccontextmanager
    async def execute(self):
        """Execute operation with circuit breaker"""
        if not self.can_execute():
            raise Exception("Circuit breaker is open")

        try:
            yield
            self.record_success()
        except self.expected_exception as e:
            self.record_failure()
            raise e


class RetryHandler:
    """Configurable retry handler"""

    @staticmethod
    async def with_retry(
        operation,
        max_retries: int = 3,
        delay: float = 1.0,
        backoff_factor: float = 2.0,
        exceptions: tuple = (Exception,)
    ):
        """Execute operation with retry logic"""
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                if asyncio.iscoroutinefunction(operation):
                    return await operation()
                else:
                    return operation()
            except exceptions as e:
                last_exception = e
                if attempt == max_retries:
                    break
                
                wait_time = delay * (backoff_factor ** attempt)
                await asyncio.sleep(wait_time)

        raise last_exception


# Global error handler instance
error_handler = EnhancedErrorHandler()


def get_error_handler() -> EnhancedErrorHandler:
    """Get global error handler instance"""
    return error_handler


# FastAPI error handler middleware
async def global_error_handler(request: Request, call_next):
    """Global error handling middleware"""
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        # Create error context from request
        context = ErrorContext(
            request_id=getattr(request.state, 'request_id', None),
            endpoint=str(request.url),
            method=request.method,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get('user-agent')
        )

        # Log the error
        structured_error = error_handler.log_error(
            category=ErrorCategory.SYSTEM,
            severity=ErrorSeverity.HIGH,
            message="Unhandled exception in request processing",
            details=str(e),
            context=context,
            exception=e
        )

        # Return structured error response
        return error_handler.create_http_error_response(structured_error) 