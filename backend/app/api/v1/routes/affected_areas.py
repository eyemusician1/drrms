from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.v1.routes._helpers import apply_update, get_document_or_404
from app.core.dependencies import get_current_officer, require_admin
from app.models.affected_area import AffectedArea
from app.models.disaster_event import DisasterEvent
from app.models.officer import Officer


router = APIRouter()


class AffectedAreaCreate(BaseModel):
	event_id: str
	area_name: str
	casualties: int = 0
	injured: int = 0
	displaced_families: int = 0
	damaged_infrastructure: Optional[str] = None
	estimated_loss_php: float = 0.0


class AffectedAreaUpdate(BaseModel):
	event_id: Optional[str] = None
	area_name: Optional[str] = None
	casualties: Optional[int] = None
	injured: Optional[int] = None
	displaced_families: Optional[int] = None
	damaged_infrastructure: Optional[str] = None
	estimated_loss_php: Optional[float] = None


@router.get("/")
async def list_affected_areas(_: Officer = Depends(get_current_officer)):
	return await AffectedArea.find_all().to_list()


@router.get("/{area_id}")
async def get_affected_area(area_id: str, _: Officer = Depends(get_current_officer)):
	return await get_document_or_404(AffectedArea, area_id, "Affected area not found")


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_affected_area(payload: AffectedAreaCreate, _: Officer = Depends(require_admin)):
	event = await DisasterEvent.get(payload.event_id)
	if not event:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked disaster event not found")
	area = AffectedArea(**payload.model_dump())
	await area.insert()
	return area


@router.patch("/{area_id}")
async def update_affected_area(area_id: str, payload: AffectedAreaUpdate, _: Officer = Depends(require_admin)):
	area = await get_document_or_404(AffectedArea, area_id, "Affected area not found")
	update_data = payload.model_dump(exclude_unset=True)
	if not update_data:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No changes provided")
	if "event_id" in update_data:
		event = await DisasterEvent.get(update_data["event_id"])
		if not event:
			raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked disaster event not found")
	apply_update(area, update_data)
	await area.save()
	return area


@router.delete("/{area_id}")
async def delete_affected_area(area_id: str, _: Officer = Depends(require_admin)):
	area = await get_document_or_404(AffectedArea, area_id, "Affected area not found")
	await area.delete()
	return {"message": "Affected area deleted successfully"}
