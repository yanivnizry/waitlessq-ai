from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date, time
from enum import Enum

class DayOfWeekEnum(str, Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"

class AvailabilityTypeEnum(str, Enum):
    RECURRING = "recurring"
    EXCEPTION = "exception"
    SPECIAL = "special"

class ExceptionTypeEnum(str, Enum):
    VACATION = "vacation"
    HOLIDAY = "holiday"
    SICK = "sick"
    UNAVAILABLE = "unavailable"
    CUSTOM = "custom"

class BreakTime(BaseModel):
    start: str = Field(..., pattern=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    end: str = Field(..., pattern=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    title: str = Field(..., max_length=100)

    @validator('end')
    def end_after_start(cls, v, values):
        if 'start' in values:
            start_time = time.fromisoformat(values['start'])
            end_time = time.fromisoformat(v)
            if end_time <= start_time:
                raise ValueError('End time must be after start time')
        return v

class AvailabilityBase(BaseModel):
    availability_type: AvailabilityTypeEnum = AvailabilityTypeEnum.RECURRING
    day_of_week: Optional[DayOfWeekEnum] = None
    start_time: Optional[str] = Field(None, pattern=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    end_time: Optional[str] = Field(None, pattern=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    specific_date: Optional[date] = None
    is_available: bool = True
    breaks: List[BreakTime] = Field(default_factory=list)
    max_bookings: Optional[int] = Field(None, ge=1)
    buffer_minutes: int = Field(0, ge=0, le=120)
    is_active: bool = True
    notes: Optional[str] = Field(None, max_length=500)
    priority: int = Field(0, ge=0)

    @validator('start_time', 'end_time')
    def validate_time_format(cls, v):
        if v is not None:
            try:
                time.fromisoformat(v)
            except ValueError:
                raise ValueError('Invalid time format. Use HH:MM')
        return v

    @validator('end_time')
    def end_after_start(cls, v, values):
        if v is not None and 'start_time' in values and values['start_time'] is not None:
            start_time = time.fromisoformat(values['start_time'])
            end_time = time.fromisoformat(v)
            if end_time <= start_time:
                raise ValueError('End time must be after start time')
        return v

    @validator('day_of_week')
    def validate_recurring_fields(cls, v, values):
        if values.get('availability_type') == AvailabilityTypeEnum.RECURRING:
            if v is None:
                raise ValueError('day_of_week is required for recurring availability')
        return v

    @validator('specific_date')
    def validate_specific_fields(cls, v, values):
        if values.get('availability_type') in [AvailabilityTypeEnum.EXCEPTION, AvailabilityTypeEnum.SPECIAL]:
            if v is None:
                raise ValueError('specific_date is required for exception/special availability')
        return v

class AvailabilityCreate(AvailabilityBase):
    provider_id: int = Field(..., gt=0)

class AvailabilityUpdate(BaseModel):
    availability_type: Optional[AvailabilityTypeEnum] = None
    day_of_week: Optional[DayOfWeekEnum] = None
    start_time: Optional[str] = Field(None, pattern=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    end_time: Optional[str] = Field(None, pattern=r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
    specific_date: Optional[date] = None
    is_available: Optional[bool] = None
    breaks: Optional[List[BreakTime]] = None
    max_bookings: Optional[int] = Field(None, ge=1)
    buffer_minutes: Optional[int] = Field(None, ge=0, le=120)
    is_active: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=500)
    priority: Optional[int] = Field(None, ge=0)

class AvailabilityResponse(AvailabilityBase):
    id: int
    provider_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Additional computed fields
    provider_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class AvailabilityExceptionBase(BaseModel):
    start_date: date
    end_date: date
    exception_type: ExceptionTypeEnum
    is_available: bool = False
    custom_hours: Optional[Dict[str, Dict[str, str]]] = None
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    is_active: bool = True

    @validator('end_date')
    def end_after_start(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after or equal to start date')
        return v

class AvailabilityExceptionCreate(AvailabilityExceptionBase):
    provider_id: int = Field(..., gt=0)

class AvailabilityExceptionUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    exception_type: Optional[ExceptionTypeEnum] = None
    is_available: Optional[bool] = None
    custom_hours: Optional[Dict[str, Dict[str, str]]] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    is_active: Optional[bool] = None

class AvailabilityExceptionResponse(AvailabilityExceptionBase):
    id: int
    provider_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Additional computed fields
    provider_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class WeeklySchedule(BaseModel):
    """Represents a complete weekly schedule for a provider"""
    provider_id: int
    monday: List[AvailabilityResponse] = Field(default_factory=list)
    tuesday: List[AvailabilityResponse] = Field(default_factory=list)
    wednesday: List[AvailabilityResponse] = Field(default_factory=list)
    thursday: List[AvailabilityResponse] = Field(default_factory=list)
    friday: List[AvailabilityResponse] = Field(default_factory=list)
    saturday: List[AvailabilityResponse] = Field(default_factory=list)
    sunday: List[AvailabilityResponse] = Field(default_factory=list)
    exceptions: List[AvailabilityExceptionResponse] = Field(default_factory=list)

class AvailabilityStats(BaseModel):
    total_availability_rules: int
    active_rules: int
    inactive_rules: int
    total_exceptions: int
    active_exceptions: int
    coverage_percentage: float  # Percentage of week covered by availability
    most_available_day: Optional[str] = None
    least_available_day: Optional[str] = None

class BulkAvailabilityCreate(BaseModel):
    """For creating multiple availability rules at once (e.g., full week schedule)"""
    provider_id: int = Field(..., gt=0)
    availability_rules: List[AvailabilityBase]
    replace_existing: bool = False  # Whether to replace all existing rules

class AvailabilityConflict(BaseModel):
    """Represents a conflict between availability rules"""
    rule1_id: int
    rule2_id: int
    conflict_type: str
    description: str
    suggested_resolution: str
