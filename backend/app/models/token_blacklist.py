from datetime import datetime

from beanie import Document
from pymongo import IndexModel

class TokenBlacklist(Document):
    token: str
    invalidated_at: datetime = datetime.utcnow()
    expires_at: datetime

    class Settings:
        name = "token_blacklist"
        indexes = [
            IndexModel([("expires_at", 1)], expireAfterSeconds=0),
        ]
