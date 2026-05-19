from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.logger import logger
from app.models.disaster_event import DisasterEvent
from app.models.affected_area import AffectedArea
from app.models.response_team import ResponseTeam
from app.models.evacuation_center import EvacuationCenter
from app.models.relief_operation import ReliefOperation
from app.models.early_warning import EarlyWarning
from app.models.officer import Officer
from app.models.token_blacklist import TokenBlacklist

async def init_db() -> None:
    try:
        # 1. Opens a connection to MongoDB using the URI from .env
        client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=5000
        )
        await init_beanie(
            database=client[settings.DB_NAME],
            document_models=[
                DisasterEvent, AffectedArea, ResponseTeam,
                EvacuationCenter, ReliefOperation, EarlyWarning,
                Officer, TokenBlacklist
            ]
        )
        logger.info(f"Connected to MongoDB: {settings.DB_NAME}")
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        raise
