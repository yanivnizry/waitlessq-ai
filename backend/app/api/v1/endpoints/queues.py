from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.queue import Queue, QueueEntry
from app.models.user import User
from app.schemas.queue import QueueCreate, QueueUpdate, QueueResponse, QueueEntryCreate, QueueEntryUpdate, QueueEntryResponse
from app.services.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[QueueResponse])
async def get_queues(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all queues for the current user's organization"""
    # Get providers for the current user's organization
    from app.models.provider import Provider
    providers = db.query(Provider).filter(Provider.organization_id == current_user.organization_id).all()
    provider_ids = [p.id for p in providers]
    
    # Get queues for those providers
    queues = db.query(Queue).filter(Queue.provider_id.in_(provider_ids)).all()
    return queues

@router.get("/{queue_id}", response_model=QueueResponse)
async def get_queue(queue_id: int, db: Session = Depends(get_db)):
    """Get a specific queue"""
    queue = db.query(Queue).filter(Queue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")
    return queue

@router.post("/", response_model=QueueResponse)
async def create_queue(
    queue: QueueCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new queue"""
    # Verify the provider belongs to the current user's organization
    from app.models.provider import Provider
    provider = db.query(Provider).filter(
        Provider.id == queue.provider_id,
        Provider.organization_id == current_user.organization_id
    ).first()
    
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found or doesn't belong to your organization"
        )
    
    try:
        # Convert Pydantic model to dict (use model_dump for Pydantic v2)
        queue_dict = queue.model_dump() if hasattr(queue, 'model_dump') else queue.dict()
        db_queue = Queue(**queue_dict)
        db.add(db_queue)
        db.commit()
        db.refresh(db_queue)
        return db_queue
    except Exception as e:
        db.rollback()
        print(f"🚨 Error creating queue: {e}")
        print(f"🚨 Queue data: {queue}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create queue: {str(e)}"
        )

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