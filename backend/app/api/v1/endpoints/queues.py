from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.app.core.database import get_db
from backend.app.models.queue import Queue, QueueEntry
from backend.app.schemas.queue import QueueCreate, QueueUpdate, QueueResponse, QueueEntryCreate, QueueEntryUpdate, QueueEntryResponse

router = APIRouter()

@router.get("/", response_model=List[QueueResponse])
async def get_queues(db: Session = Depends(get_db)):
    """Get all queues"""
    queues = db.query(Queue).all()
    return queues

@router.get("/{queue_id}", response_model=QueueResponse)
async def get_queue(queue_id: int, db: Session = Depends(get_db)):
    """Get a specific queue"""
    queue = db.query(Queue).filter(Queue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")
    return queue

@router.post("/", response_model=QueueResponse)
async def create_queue(queue: QueueCreate, db: Session = Depends(get_db)):
    """Create a new queue"""
    db_queue = Queue(**queue.dict())
    db.add(db_queue)
    db.commit()
    db.refresh(db_queue)
    return db_queue

@router.put("/{queue_id}", response_model=QueueResponse)
async def update_queue(queue_id: int, queue: QueueUpdate, db: Session = Depends(get_db)):
    """Update a queue"""
    db_queue = db.query(Queue).filter(Queue.id == queue_id).first()
    if not db_queue:
        raise HTTPException(status_code=404, detail="Queue not found")
    
    for field, value in queue.dict(exclude_unset=True).items():
        setattr(db_queue, field, value)
    
    db.commit()
    db.refresh(db_queue)
    return db_queue

@router.delete("/{queue_id}")
async def delete_queue(queue_id: int, db: Session = Depends(get_db)):
    """Delete a queue"""
    queue = db.query(Queue).filter(Queue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")
    
    db.delete(queue)
    db.commit()
    return {"message": "Queue deleted successfully"}

# Queue Entries
@router.get("/{queue_id}/entries", response_model=List[QueueEntryResponse])
async def get_queue_entries(queue_id: int, db: Session = Depends(get_db)):
    """Get all entries for a queue"""
    entries = db.query(QueueEntry).filter(QueueEntry.queue_id == queue_id).all()
    return entries

@router.post("/{queue_id}/entries", response_model=QueueEntryResponse)
async def add_queue_entry(queue_id: int, entry: QueueEntryCreate, db: Session = Depends(get_db)):
    """Add an entry to a queue"""
    # Get the next position
    last_entry = db.query(QueueEntry).filter(QueueEntry.queue_id == queue_id).order_by(QueueEntry.position.desc()).first()
    position = 1 if not last_entry else last_entry.position + 1
    
    db_entry = QueueEntry(**entry.dict(), position=position)
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.put("/{queue_id}/entries/{entry_id}", response_model=QueueEntryResponse)
async def update_queue_entry(queue_id: int, entry_id: int, entry: QueueEntryUpdate, db: Session = Depends(get_db)):
    """Update a queue entry"""
    db_entry = db.query(QueueEntry).filter(QueueEntry.id == entry_id, QueueEntry.queue_id == queue_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    
    for field, value in entry.dict(exclude_unset=True).items():
        setattr(db_entry, field, value)
    
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.delete("/{queue_id}/entries/{entry_id}")
async def remove_queue_entry(queue_id: int, entry_id: int, db: Session = Depends(get_db)):
    """Remove an entry from a queue"""
    entry = db.query(QueueEntry).filter(QueueEntry.id == entry_id, QueueEntry.queue_id == queue_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    
    db.delete(entry)
    db.commit()
    return {"message": "Queue entry removed successfully"} 