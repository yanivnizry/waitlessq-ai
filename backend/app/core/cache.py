import json
import hashlib
from typing import Any, Optional, Callable
from functools import wraps
import logging
from redis import Redis, ConnectionPool
from app.core.config import settings

logger = logging.getLogger(__name__)

class CacheManager:
    """Centralized cache management for the application"""
    
    def __init__(self):
        self.redis_pool = ConnectionPool(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            password=settings.REDIS_PASSWORD,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            max_connections=50
        )
        self.redis = Redis(connection_pool=self.redis_pool)
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            value = self.redis.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: int = None) -> bool:
        """Set value in cache with optional TTL"""
        try:
            ttl = ttl or settings.CACHE_TTL
            serialized_value = json.dumps(value)
            return self.redis.setex(key, ttl, serialized_value)
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete value from cache"""
        try:
            return bool(self.redis.delete(key))
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            return bool(self.redis.exists(key))
        except Exception as e:
            logger.error(f"Cache exists error for key {key}: {e}")
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern"""
        try:
            keys = self.redis.keys(pattern)
            if keys:
                return self.redis.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Cache clear pattern error for {pattern}: {e}")
            return 0
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        try:
            info = self.redis.info()
            return {
                "connected_clients": info.get("connected_clients", 0),
                "used_memory_human": info.get("used_memory_human", "0B"),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "total_commands_processed": info.get("total_commands_processed", 0),
            }
        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return {}

# Global cache instance
cache = CacheManager()

def cache_response(ttl: int = None, key_prefix: str = ""):
    """Decorator to cache API responses"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if not settings.CACHE_ENABLED:
                return await func(*args, **kwargs)
            
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            logger.debug(f"Cache miss for {cache_key}, stored result")
            return result
        return wrapper
    return decorator

def cache_invalidate(pattern: str):
    """Decorator to invalidate cache after function execution"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            cache.clear_pattern(pattern)
            logger.debug(f"Cache invalidated for pattern: {pattern}")
            return result
        return wrapper
    return decorator

class SessionCache:
    """Session management with Redis"""
    
    def __init__(self):
        self.cache = cache
    
    def set_session(self, session_id: str, data: dict, ttl: int = 3600) -> bool:
        """Set session data"""
        return self.cache.set(f"session:{session_id}", data, ttl)
    
    def get_session(self, session_id: str) -> Optional[dict]:
        """Get session data"""
        return self.cache.get(f"session:{session_id}")
    
    def delete_session(self, session_id: str) -> bool:
        """Delete session data"""
        return self.cache.delete(f"session:{session_id}")
    
    def extend_session(self, session_id: str, ttl: int = 3600) -> bool:
        """Extend session TTL"""
        session_data = self.get_session(session_id)
        if session_data:
            return self.set_session(session_id, session_data, ttl)
        return False

# Global session cache instance
session_cache = SessionCache()

class RateLimiter:
    """Rate limiting with Redis"""
    
    def __init__(self):
        self.cache = cache
    
    def is_allowed(self, key: str, limit: int, window: int) -> bool:
        """Check if request is allowed within rate limit"""
        current = self.cache.redis.get(f"rate_limit:{key}")
        if current is None:
            self.cache.redis.setex(f"rate_limit:{key}", window, 1)
            return True
        
        current_count = int(current)
        if current_count >= limit:
            return False
        
        self.cache.redis.incr(f"rate_limit:{key}")
        return True
    
    def get_remaining(self, key: str) -> int:
        """Get remaining requests for key"""
        current = self.cache.redis.get(f"rate_limit:{key}")
        if current is None:
            return settings.RATE_LIMIT_PER_MINUTE
        return max(0, settings.RATE_LIMIT_PER_MINUTE - int(current))

# Global rate limiter instance
rate_limiter = RateLimiter() 