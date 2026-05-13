from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.v1.routes._helpers import apply_update, get_document_or_404
from app.core.dependencies import get_current_officer, require_admin
from app.models.disaster_event import DisasterEvent
from app.models.early_warning import EarlyWarning
from app.models.officer import Officer


router = APIRouter()


class EarlyWarningCreate(BaseModel):
	warning_type: str
	region: str
	disaster_type: Literal["Typhoon", "Flood", "Earthquake", "Wildfire", "Landslide"]
	message: str
	linked_event_id: Optional[str] = None


class EarlyWarningUpdate(BaseModel):
	warning_type: Optional[str] = None
	region: Optional[str] = None
	disaster_type: Optional[Literal["Typhoon", "Flood", "Earthquake", "Wildfire", "Landslide"]] = None
	message: Optional[str] = None
	linked_event_id: Optional[str] = None


@router.get("/")
async def list_early_warnings(_: Officer = Depends(get_current_officer)):
	return await EarlyWarning.find_all().to_list()


@router.get("/{warning_id}")
async def get_early_warning(warning_id: str, _: Officer = Depends(get_current_officer)):
	return await get_document_or_404(EarlyWarning, warning_id, "Early warning not found")


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_early_warning(payload: EarlyWarningCreate, _: Officer = Depends(require_admin)):
	if payload.linked_event_id:
		event = await DisasterEvent.get(payload.linked_event_id)
		if not event:
			raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked disaster event not found")
	warning = EarlyWarning(**payload.model_dump())
	await warning.insert()
	return warning


@router.patch("/{warning_id}")
async def update_early_warning(warning_id: str, payload: EarlyWarningUpdate, _: Officer = Depends(require_admin)):
	warning = await get_document_or_404(EarlyWarning, warning_id, "Early warning not found")
	update_data = payload.model_dump(exclude_unset=True)
	if not update_data:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No changes provided")
	if "linked_event_id" in update_data and update_data["linked_event_id"]:
		event = await DisasterEvent.get(update_data["linked_event_id"])
		if not event:
			raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked disaster event not found")
	apply_update(warning, update_data)
	await warning.save()
	return warning


@router.delete("/{warning_id}")
async def delete_early_warning(warning_id: str, _: Officer = Depends(require_admin)):
	warning = await get_document_or_404(EarlyWarning, warning_id, "Early warning not found")
	await warning.delete()
	return {"message": "Early warning deleted successfully"}
