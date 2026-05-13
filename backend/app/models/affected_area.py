from beanie import Document
from typing import Optional
from datetime import datetime

class AffectedArea(Document):
    event_id: str
    area_name: str
    casualties: int = 0
    injured: int = 0
    displaced_families: int = 0
    damaged_infrastructure: Optional[str] = None
    estimated_loss_php: float = 0.0
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "affected_areas"
