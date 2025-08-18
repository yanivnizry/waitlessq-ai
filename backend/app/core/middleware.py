import time
import logging
from typing import Callable
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from app.core.cache import rate_limiter
from app.core.config import settings

logger = logging.getLogger(__name__)

class RateLimitMiddleware:
    """Rate limiting middleware"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        # Get client identifier (IP or user ID)
        client_id = self._get_client_id(request)
        
        # Check rate limit
        if not rate_limiter.is_allowed(
            key=client_id,
            limit=settings.RATE_LIMIT_PER_MINUTE,
            window=60
        ):
            response = JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": "Too many requests. Please try again later.",
                    "retry_after": 60
                }
            )
            await response(scope, receive, send)
            return
        
        await self.app(scope, receive, send)
    
    def _get_client_id(self, request: Request) -> str:
        """Get client identifier for rate limiting"""
        # Try to get user ID from token if authenticated
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            # In a real implementation, decode JWT to get user ID
            return f"user:{request.client.host}"
        
        # Fallback to IP address
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return f"ip:{forwarded_for.split(',')[0].strip()}"
        
        return f"ip:{request.client.host}"

class RequestLoggingMiddleware:
    """Request logging middleware with performance metrics"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        start_time = time.time()
        request = Request(scope, receive)
        
        # Log request start
        logger.info(
            f"Request started: {request.method} {request.url.path} "
            f"from {request.client.host}"
        )
        
        # Track response
        response_sent = False
        
        async def send_wrapper(message):
            nonlocal response_sent
            if not response_sent:
                response_sent = True
                process_time = time.time() - start_time
                
                # Log response
                logger.info(
                    f"Request completed: {request.method} {request.url.path} "
                    f"in {process_time:.3f}s"
                )
                
                # Log slow requests
                if process_time > 1.0:
                    logger.warning(
                        f"Slow request: {request.method} {request.url.path} "
                        f"took {process_time:.3f}s"
                    )
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)

class PerformanceMiddleware:
    """Performance monitoring middleware"""
    
    def __init__(self, app):
        self.app = app
        self.request_count = 0
        self.error_count = 0
        self.total_response_time = 0.0
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        start_time = time.time()
        self.request_count += 1
        
        try:
            await self.app(scope, receive, send)
        except Exception as e:
            self.error_count += 1
            logger.error(f"Request error: {e}")
            raise
        finally:
            response_time = time.time() - start_time
            self.total_response_time += response_time
    
    def get_stats(self) -> dict:
        """Get performance statistics"""
        avg_response_time = (
            self.total_response_time / self.request_count 
            if self.request_count > 0 else 0
        )
        
        error_rate = (
            self.error_count / self.request_count * 100 
            if self.request_count > 0 else 0
        )
        
        return {
            "total_requests": self.request_count,
            "total_errors": self.error_count,
            "error_rate_percent": error_rate,
            "avg_response_time": avg_response_time,
            "total_response_time": self.total_response_time
        }

class SecurityMiddleware:
    """Security middleware for headers and validation"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        # Add security headers
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = dict(message.get("headers", []))
                
                # Security headers
                security_headers = {
                    "X-Content-Type-Options": "nosniff",
                    "X-Frame-Options": "DENY",
                    "X-XSS-Protection": "1; mode=block",
                    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
                    "Content-Security-Policy": "default-src 'self'",
                    "Referrer-Policy": "strict-origin-when-cross-origin"
                }
                
                for header, value in security_headers.items():
                    header_key = header.encode() if isinstance(header, str) else header
                    if header_key not in headers:
                        header_value = value.encode() if isinstance(value, str) else value
                        headers[header_key] = header_value
                
                message["headers"] = list(headers.items())
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)

class DatabaseConnectionMiddleware:
    """Database connection monitoring middleware"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Log database connection pool stats periodically
        # This could be moved to a background task
        from app.core.database import get_pool_stats
        
        try:
            pool_stats = get_pool_stats()
            if pool_stats["primary_checked_out"] > pool_stats["primary_pool_size"] * 0.8:
                logger.warning("Database connection pool usage is high", extra=pool_stats)
        except Exception as e:
            logger.error(f"Error getting pool stats: {e}")
        
        await self.app(scope, receive, send) 