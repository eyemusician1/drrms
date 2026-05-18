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
from app.core.security import hash_password


async def init_db() -> None:
    try:
        client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
        await init_beanie(
            database=client[settings.DB_NAME],
            document_models=[
                DisasterEvent,
                AffectedArea,
                ResponseTeam,
                EvacuationCenter,
                ReliefOperation,
                EarlyWarning,
                Officer,
                TokenBlacklist,
            ],
        )
        logger.info(f"Connected to MongoDB: {settings.DB_NAME}")
        await ensure_default_admin()
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        raise


async def ensure_default_admin() -> None:
    if settings.is_production:
        return

    existing_admin = await Officer.find_one(Officer.email == settings.ADMIN_EMAIL)
    if existing_admin:
        return

    existing_officers = await Officer.find_all().count()
    if existing_officers > 0:
        return

    officer = Officer(
        full_name=settings.ADMIN_FULL_NAME,
        email=settings.ADMIN_EMAIL,
        hashed_password=hash_password(settings.ADMIN_PASSWORD),
        role="Admin",
    )
    await officer.insert()
    logger.info(f"Seeded default admin: {settings.ADMIN_EMAIL}")
