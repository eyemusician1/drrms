from beanie import Document
from typing import Optional, Literal
from datetime import datetime

class Officer(Document):
    full_name: str
    email: str
    hashed_password: str
    role: Literal["Admin", "Officer"] = "Officer"
    is_active: bool = True
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    last_login: Optional[datetime] = None
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "officers"
