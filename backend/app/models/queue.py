from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from backend.app.core.database import Base

class QueueStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"

class QueueEntryStatus(str, enum.Enum):
    WAITING = "waiting"
    CALLED = "called"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class Queue(Base):
    __tablename__ = "queues"
    
    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    
    # Queue Information
    name = Column(String(255), nullable=False)  # e.g., "General", "Walk-ins", "Emergency"
    description = Column(Text)
    
    # Status and Settings
    status = Column(Enum(QueueStatus), default=QueueStatus.ACTIVE)
    max_size = Column(Integer, default=50)
    estimated_wait_time = Column(Integer)  # minutes
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    provider = relationship("Provider", back_populates="queues")
    entries = relationship("QueueEntry", back_populates="queue")
    
    def __repr__(self):
        return f"<Queue(id={self.id}, name='{self.name}', provider_id={self.provider_id})>"

class QueueEntry(Base):
    __tablename__ = "queue_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    queue_id = Column(Integer, ForeignKey("queues.id"), nullable=False)
    
    # Client Information
    client_name = Column(String(255), nullable=False)
    client_phone = Column(String(20))
    client_email = Column(String(255))
    
    # Entry Details
    position = Column(Integer, nullable=False)
    status = Column(Enum(QueueEntryStatus), default=QueueEntryStatus.WAITING)
    notes = Column(Text)
    
    # Timing
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    called_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    estimated_wait_time = Column(Integer)  # minutes when joined
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    queue = relationship("Queue", back_populates="entries")
    
    def __repr__(self):
        return f"<QueueEntry(id={self.id}, client_name='{self.client_name}', position={self.position})>" 