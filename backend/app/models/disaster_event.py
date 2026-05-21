from beanie import Document
from typing import Optional, Literal
from datetime import datetime


class DisasterEvent(Document):
    disaster_type: Literal["Typhoon", "Flood", "Earthquake", "Wildfire", "Landslide"]
    location: str
    province_code: Optional[str] = None
    city_municipality_code: Optional[str] = None
    city_municipality_type: Optional[str] = None
    barangay_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    date_occurred: datetime
    severity_level: Literal["Low", "Moderate", "High", "Critical"]
    duration_days: Optional[int] = None
    status: Literal["Ongoing", "Resolved"] = "Ongoing"
    created_by: Optional[str] = None
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

    class Settings:
        name = "disaster_events"
