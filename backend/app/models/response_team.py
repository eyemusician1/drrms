from beanie import Document
from typing import Optional, Literal
from datetime import datetime

class ResponseTeam(Document):
    team_name: str
    team_type: Literal["Government", "NGO", "Volunteer"]
    specialization: Literal["Rescue", "Medical", "Logistics", "Relief"]
    contact: str
    assigned_event_id: Optional[str] = None
    operation_zone: Optional[str] = None
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "response_teams"
