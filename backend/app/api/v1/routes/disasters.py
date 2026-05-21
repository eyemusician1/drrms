from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.v1.routes._helpers import apply_update, get_document_or_404
from app.core.dependencies import get_current_officer, require_admin
from app.models.disaster_event import DisasterEvent
from app.models.officer import Officer


router = APIRouter()


class DisasterEventCreate(BaseModel):
    disaster_type: Literal["Typhoon", "Flood", "Earthquake", "Wildfire", "Landslide"]
    location: str
    province_code: Optional[str] = None
    city_municipality_code: Optional[str] = None
    city_municipality_type: Optional[str] = None
    barangay_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    date_occurred: datetime
    severity_level: Literal["Low", "Moderate", "High", "Critical"]
    duration_days: Optional[int] = None
    status: Literal["Ongoing", "Resolved"] = "Ongoing"


class DisasterEventUpdate(BaseModel):
    disaster_type: Optional[
        Literal["Typhoon", "Flood", "Earthquake", "Wildfire", "Landslide"]
    ] = None
    location: Optional[str] = None
    province_code: Optional[str] = None
    city_municipality_code: Optional[str] = None
    city_municipality_type: Optional[str] = None
    barangay_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    date_occurred: Optional[datetime] = None
    severity_level: Optional[Literal["Low", "Moderate", "High", "Critical"]] = None
    duration_days: Optional[int] = None
    status: Optional[Literal["Ongoing", "Resolved"]] = None


@router.get("/")
async def list_disaster_events(_: Officer = Depends(get_current_officer)):
    return await DisasterEvent.find_all().to_list()


@router.get("/{event_id}")
async def get_disaster_event(event_id: str, _: Officer = Depends(get_current_officer)):
    return await get_document_or_404(
        DisasterEvent, event_id, "Disaster event not found"
    )


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_disaster_event(
    payload: DisasterEventCreate, current_officer: Officer = Depends(require_admin)
):
    event = DisasterEvent(**payload.model_dump(), created_by=current_officer.email)
    await event.insert()
    return event


@router.patch("/{event_id}")
async def update_disaster_event(
    event_id: str, payload: DisasterEventUpdate, _: Officer = Depends(require_admin)
):
    event = await get_document_or_404(
        DisasterEvent, event_id, "Disaster event not found"
    )
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No changes provided"
        )
    apply_update(event, update_data)
    event.updated_at = datetime.utcnow()
    await event.save()
    return event


@router.delete("/{event_id}")
async def delete_disaster_event(event_id: str, _: Officer = Depends(require_admin)):
    event = await get_document_or_404(
        DisasterEvent, event_id, "Disaster event not found"
    )
    await event.delete()
    return {"message": "Disaster event deleted successfully"}
