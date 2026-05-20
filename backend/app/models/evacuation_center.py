from beanie import Document
from pydantic import BaseModel
from datetime import datetime


class Supplies(BaseModel):
    food_packs: int = 0
    water_liters: int = 0
    medicine_kits: int = 0


class EvacuationCenter(Document):
    event_id: str
    name: str
    location: str
    latitude: float | None = None
    longitude: float | None = None
    capacity: int
    current_occupancy: int = 0
    supplies: Supplies = Supplies()
    managing_personnel: str
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "evacuation_centers"
