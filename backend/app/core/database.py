from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Enhanced database engine with connection pooling
def create_database_engine(url: str, is_read_replica: bool = False):
    """Create database engine with optimized connection pooling"""
    pool_size = 50 if is_read_replica else 20
    max_overflow = 50 if is_read_replica else 30
    
    return create_engine(
        url,
        poolclass=QueuePool,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_pre_ping=True,
        pool_recycle=3600,  # Recycle connections every hour
        pool_timeout=30,    # Wait up to 30 seconds for available connection
        echo=False,         # Set to True for SQL query logging in development
        echo_pool=False,    # Set to True for connection pool logging
        connect_args={
            "application_name": "waitlessq_backend"
        } if "postgresql" in url else {}
    )

# Primary database for writes
primary_engine = create_database_engine(settings.DATABASE_URL, is_read_replica=False)

# Read replica for reads (if configured)
read_engine = None
if hasattr(settings, 'READ_DATABASE_URL') and settings.READ_DATABASE_URL:
    read_engine = create_database_engine(settings.READ_DATABASE_URL, is_read_replica=True)

# Create session factories
PrimarySessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=primary_engine
)

ReadSessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=read_engine or primary_engine
)

# Create base class for models
Base = declarative_base()

# Dependency to get database session for writes
def get_db():
    """Get database session for write operations"""
    db = PrimarySessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

# Dependency to get database session for reads
def get_read_db():
    """Get database session for read operations (uses read replica if available)"""
    db = ReadSessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Read database error: {e}")
        raise
    finally:
        db.close()

# Database health check
def check_database_health():
    """Check database connectivity"""
    try:
        with primary_engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False

# Connection pool monitoring
def get_pool_stats():
    """Get connection pool statistics"""
    return {
        "primary_pool_size": primary_engine.pool.size(),
        "primary_checked_in": primary_engine.pool.checkedin(),
        "primary_checked_out": primary_engine.pool.checkedout(),
        "read_pool_size": read_engine.pool.size() if read_engine else None,
        "read_checked_in": read_engine.pool.checkedin() if read_engine else None,
        "read_checked_out": read_engine.pool.checkedout() if read_engine else None,
    } 