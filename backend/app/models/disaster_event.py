#backend/app/models/disaster_event.py
from beanie import Document
from typing import Optional, Literal
from datetime import datetime

from pydantic import Field

class DisasterEvent(Document):
    disaster_type: Literal["Typhoon", "Flood", "Earthquake", "Wildfire", "Landslide", "Tsunami"]
    location: str
    date_occurred: datetime
    severity_level: Literal["Low", "Moderate", "High", "Critical"]
    duration_days: Optional[int] = None
    status: Literal["Ongoing", "Resolved"] = "Ongoing"
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "disaster_events"
