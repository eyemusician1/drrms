from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.v1.routes._helpers import apply_update, get_document_or_404
from app.core.dependencies import get_current_officer, require_admin
from app.models.disaster_event import DisasterEvent
from app.models.officer import Officer
from app.models.relief_operation import ReliefOperation


router = APIRouter()


class ReliefOperationCreate(BaseModel):
	event_id: str
	operation_type: Literal["Food", "Shelter", "Financial", "Medical"]
	date: datetime
	beneficiaries: int = 0
	resources_distributed: str
	handled_by_team_id: Optional[str] = None


class ReliefOperationUpdate(BaseModel):
	event_id: Optional[str] = None
	operation_type: Optional[Literal["Food", "Shelter", "Financial", "Medical"]] = None
	date: Optional[datetime] = None
	beneficiaries: Optional[int] = None
	resources_distributed: Optional[str] = None
	handled_by_team_id: Optional[str] = None


@router.get("/")
async def list_relief_operations(_: Officer = Depends(get_current_officer)):
	return await ReliefOperation.find_all().to_list()


@router.get("/{operation_id}")
async def get_relief_operation(operation_id: str, _: Officer = Depends(get_current_officer)):
	return await get_document_or_404(ReliefOperation, operation_id, "Relief operation not found")


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_relief_operation(payload: ReliefOperationCreate, _: Officer = Depends(require_admin)):
	event = await DisasterEvent.get(payload.event_id)
	if not event:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked disaster event not found")
	operation = ReliefOperation(**payload.model_dump())
	await operation.insert()
	return operation


@router.patch("/{operation_id}")
async def update_relief_operation(operation_id: str, payload: ReliefOperationUpdate, _: Officer = Depends(require_admin)):
	operation = await get_document_or_404(ReliefOperation, operation_id, "Relief operation not found")
	update_data = payload.model_dump(exclude_unset=True)
	if not update_data:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No changes provided")
	if "event_id" in update_data and update_data["event_id"]:
		event = await DisasterEvent.get(update_data["event_id"])
		if not event:
			raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked disaster event not found")
	apply_update(operation, update_data)
	await operation.save()
	return operation


@router.delete("/{operation_id}")
async def delete_relief_operation(operation_id: str, _: Officer = Depends(require_admin)):
	operation = await get_document_or_404(ReliefOperation, operation_id, "Relief operation not found")
	await operation.delete()
	return {"message": "Relief operation deleted successfully"}
