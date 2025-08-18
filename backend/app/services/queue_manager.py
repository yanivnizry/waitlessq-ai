"""
Queue Manager Service

Handles automatic creation and management of daily service queues.
Each day, for each service, a queue is created and all appointments 
for that service on that day are assigned to that queue.
"""

from datetime import date, datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.queue import Queue, QueueStatus
from app.models.appointment import Appointment
from app.models.provider import Provider


class QueueManager:
    """Manages daily service queues"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_or_create_daily_queue(
        self, 
        provider_id: int, 
        service_name: str, 
        queue_date: date
    ) -> Queue:
        """
        Get or create a daily queue for a specific service.
        
        Args:
            provider_id: ID of the provider
            service_name: Name of the service
            queue_date: Date for the queue
            
        Returns:
            Queue object for the service and date
        """
        # Try to find existing queue for this service and date
        existing_queue = self.db.query(Queue).filter(
            and_(
                Queue.provider_id == provider_id,
                Queue.service_name == service_name,
                Queue.queue_date == queue_date
            )
        ).first()
        
        if existing_queue:
            return existing_queue
        
        # Create new daily queue
        queue_name = f"{service_name} - {queue_date.strftime('%B %d, %Y')}"
        description = f"Daily queue for {service_name} appointments on {queue_date.strftime('%A, %B %d, %Y')}"
        
        new_queue = Queue(
            provider_id=provider_id,
            name=queue_name,
            description=description,
            service_name=service_name,
            queue_date=queue_date,
            status=QueueStatus.ACTIVE,
            max_size=100,  # Allow more appointments per service
            estimated_wait_time=30
        )
        
        self.db.add(new_queue)
        self.db.commit()
        self.db.refresh(new_queue)
        
        print(f"✅ Created daily queue: {queue_name}")
        return new_queue
    
    def assign_appointment_to_queue(self, appointment: Appointment) -> Optional[Queue]:
        """
        Assign an appointment to its appropriate daily service queue.
        
        Args:
            appointment: The appointment to assign
            
        Returns:
            The queue the appointment was assigned to, or None if failed
        """
        if not appointment.scheduled_at or not appointment.service_name:
            return None
        
        # Get the date of the appointment
        appointment_date = appointment.scheduled_at.date()
        
        # Get or create the daily queue for this service
        queue = self.get_or_create_daily_queue(
            provider_id=appointment.provider_id,
            service_name=appointment.service_name,
            queue_date=appointment_date
        )
        
        # Assign appointment to queue
        appointment.queue_id = queue.id
        self.db.commit()
        
        print(f"📅 Assigned appointment {appointment.id} ({appointment.client_name}) to queue {queue.name}")
        return queue
    
    def create_daily_queues_for_provider(self, provider_id: int, target_date: date) -> List[Queue]:
        """
        Create daily queues for all services that have appointments on a given date.
        
        Args:
            provider_id: ID of the provider
            target_date: Date to create queues for
            
        Returns:
            List of created/existing queues
        """
        # Get all appointments for this provider on the target date
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = datetime.combine(target_date, datetime.max.time())
        
        appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.provider_id == provider_id,
                Appointment.scheduled_at >= start_of_day,
                Appointment.scheduled_at <= end_of_day,
                Appointment.status.in_(['scheduled', 'confirmed'])
            )
        ).all()
        
        # Get unique service names
        service_names = list(set(apt.service_name for apt in appointments if apt.service_name))
        
        created_queues = []
        
        # Create queues for each service
        for service_name in service_names:
            queue = self.get_or_create_daily_queue(
                provider_id=provider_id,
                service_name=service_name,
                queue_date=target_date
            )
            created_queues.append(queue)
            
            # Assign all appointments for this service to the queue
            service_appointments = [apt for apt in appointments if apt.service_name == service_name]
            for appointment in service_appointments:
                if not appointment.queue_id:  # Only assign if not already assigned
                    appointment.queue_id = queue.id
            
        self.db.commit()
        
        print(f"🗓️ Created {len(created_queues)} daily queues for provider {provider_id} on {target_date}")
        return created_queues
    
    def create_daily_queues_for_all_providers(self, target_date: date) -> List[Queue]:
        """
        Create daily queues for all providers for a given date.
        
        Args:
            target_date: Date to create queues for
            
        Returns:
            List of all created/existing queues
        """
        # Get all providers
        providers = self.db.query(Provider).all()
        
        all_queues = []
        
        for provider in providers:
            provider_queues = self.create_daily_queues_for_provider(
                provider_id=provider.id,
                target_date=target_date
            )
            all_queues.extend(provider_queues)
        
        return all_queues
    
    def close_past_queues(self, cutoff_date: date = None) -> int:
        """
        Close queues from past dates.
        
        Args:
            cutoff_date: Date before which to close queues. Defaults to yesterday.
            
        Returns:
            Number of queues closed
        """
        if cutoff_date is None:
            cutoff_date = date.today()
        
        # Find active queues from before the cutoff date
        past_queues = self.db.query(Queue).filter(
            and_(
                Queue.queue_date < cutoff_date,
                Queue.status == QueueStatus.ACTIVE
            )
        ).all()
        
        # Close them
        for queue in past_queues:
            queue.status = QueueStatus.CLOSED
        
        self.db.commit()
        
        print(f"🔒 Closed {len(past_queues)} past queues before {cutoff_date}")
        return len(past_queues)
    
    def get_daily_queues(
        self, 
        provider_id: int, 
        target_date: date = None
    ) -> List[Queue]:
        """
        Get all daily queues for a provider on a specific date.
        
        Args:
            provider_id: ID of the provider
            target_date: Date to get queues for. Defaults to today.
            
        Returns:
            List of queues for the date
        """
        if target_date is None:
            target_date = date.today()
        
        queues = self.db.query(Queue).filter(
            and_(
                Queue.provider_id == provider_id,
                Queue.queue_date == target_date
            )
        ).order_by(Queue.service_name).all()
        
        return queues
