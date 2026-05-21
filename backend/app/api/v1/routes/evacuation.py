from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.v1.routes._helpers import apply_update, get_document_or_404
from app.core.dependencies import get_current_officer, require_admin
from app.models.disaster_event import DisasterEvent
from app.models.evacuation_center import EvacuationCenter, Supplies
from app.models.officer import Officer


router = APIRouter()


class SuppliesPayload(BaseModel):
    food_packs: int = 0
    water_liters: int = 0
    medicine_kits: int = 0


class EvacuationCenterCreate(BaseModel):
    event_id: str
    name: str
    location: str
    province_code: Optional[str] = None
    city_municipality_code: Optional[str] = None
    city_municipality_type: Optional[str] = None
    barangay_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    capacity: int
    current_occupancy: int = 0
    supplies: SuppliesPayload = Field(default_factory=SuppliesPayload)
    managing_personnel: str


class EvacuationCenterUpdate(BaseModel):
    event_id: Optional[str] = None
    name: Optional[str] = None
    location: Optional[str] = None
    province_code: Optional[str] = None
    city_municipality_code: Optional[str] = None
    city_municipality_type: Optional[str] = None
    barangay_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    capacity: Optional[int] = None
    current_occupancy: Optional[int] = None
    supplies: Optional[SuppliesPayload] = None
    managing_personnel: Optional[str] = None


@router.get("/")
async def list_evacuation_centers(_: Officer = Depends(get_current_officer)):
    return await EvacuationCenter.find_all().to_list()


@router.get("/{center_id}")
async def get_evacuation_center(
    center_id: str, _: Officer = Depends(get_current_officer)
):
    return await get_document_or_404(
        EvacuationCenter, center_id, "Evacuation center not found"
    )


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_evacuation_center(
    payload: EvacuationCenterCreate, _: Officer = Depends(require_admin)
):
    event = await DisasterEvent.get(payload.event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Linked disaster event not found",
        )
    center = EvacuationCenter(
        **payload.model_dump(exclude={"supplies"}),
        supplies=Supplies(**payload.supplies.model_dump()),
    )
    await center.insert()
    return center


@router.patch("/{center_id}")
async def update_evacuation_center(
    center_id: str, payload: EvacuationCenterUpdate, _: Officer = Depends(require_admin)
):
    center = await get_document_or_404(
        EvacuationCenter, center_id, "Evacuation center not found"
    )
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No changes provided"
        )
    if "event_id" in update_data and update_data["event_id"]:
        event = await DisasterEvent.get(update_data["event_id"])
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Linked disaster event not found",
            )
    if "supplies" in update_data and update_data["supplies"] is not None:
        update_data["supplies"] = Supplies(**update_data["supplies"].model_dump())
    apply_update(center, update_data)
    await center.save()
    return center


@router.delete("/{center_id}")
async def delete_evacuation_center(center_id: str, _: Officer = Depends(require_admin)):
    center = await get_document_or_404(
        EvacuationCenter, center_id, "Evacuation center not found"
    )
    await center.delete()
    return {"message": "Evacuation center deleted successfully"}
