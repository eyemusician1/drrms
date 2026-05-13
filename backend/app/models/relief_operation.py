from beanie import Document
from typing import Optional, Literal
from datetime import datetime

class ReliefOperation(Document):
    event_id: str
    operation_type: Literal["Food", "Shelter", "Financial", "Medical"]
    date: datetime
    beneficiaries: int = 0
    resources_distributed: str
    handled_by_team_id: Optional[str] = None
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "relief_operations"
