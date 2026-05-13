from beanie import Document
from typing import Optional, Literal
from datetime import datetime

class EarlyWarning(Document):
    warning_type: str
    region: str
    issued_at: datetime = datetime.utcnow()
    disaster_type: Literal["Typhoon", "Flood", "Earthquake", "Wildfire", "Landslide"]
    message: str
    linked_event_id: Optional[str] = None

    class Settings:
        name = "early_warnings"
