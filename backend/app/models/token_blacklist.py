from beanie import Document
from datetime import datetime

class TokenBlacklist(Document):
    token: str
    invalidated_at: datetime = datetime.utcnow()
    expires_at: datetime

    class Settings:
        name = "token_blacklist"
