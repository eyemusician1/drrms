from datetime import datetime
from typing import Literal, Optional

from beanie import Document
from pydantic import EmailStr
from pymongo import IndexModel

class Officer(Document):    # "Document" = a MongoDB document
    full_name: str
    email: EmailStr
    hashed_password: str
    role: Literal["Admin", "Officer"] = "Officer"
    is_active: bool = True
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    last_login: Optional[datetime] = None
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "officers"   # the MongoDB collection name
        indexes = [
            IndexModel([("email", 1)], unique=True), # no duplicate emails
        ]
