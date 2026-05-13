from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.v1.routes._helpers import apply_update, get_document_or_404
from app.core.dependencies import get_current_officer, require_admin
from app.models.disaster_event import DisasterEvent
from app.models.officer import Officer
from app.models.response_team import ResponseTeam


router = APIRouter()


class ResponseTeamCreate(BaseModel):
	team_name: str
	team_type: Literal["Government", "NGO", "Volunteer"]
	specialization: Literal["Rescue", "Medical", "Logistics", "Relief"]
	contact: str
	assigned_event_id: Optional[str] = None
	operation_zone: Optional[str] = None


class ResponseTeamUpdate(BaseModel):
	team_name: Optional[str] = None
	team_type: Optional[Literal["Government", "NGO", "Volunteer"]] = None
	specialization: Optional[Literal["Rescue", "Medical", "Logistics", "Relief"]] = None
	contact: Optional[str] = None
	assigned_event_id: Optional[str] = None
	operation_zone: Optional[str] = None


@router.get("/")
async def list_response_teams(_: Officer = Depends(get_current_officer)):
	return await ResponseTeam.find_all().to_list()


@router.get("/{team_id}")
async def get_response_team(team_id: str, _: Officer = Depends(get_current_officer)):
	return await get_document_or_404(ResponseTeam, team_id, "Response team not found")


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_response_team(payload: ResponseTeamCreate, _: Officer = Depends(require_admin)):
	if payload.assigned_event_id:
		event = await DisasterEvent.get(payload.assigned_event_id)
		if not event:
			raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned disaster event not found")
	team = ResponseTeam(**payload.model_dump())
	await team.insert()
	return team


@router.patch("/{team_id}")
async def update_response_team(team_id: str, payload: ResponseTeamUpdate, _: Officer = Depends(require_admin)):
	team = await get_document_or_404(ResponseTeam, team_id, "Response team not found")
	update_data = payload.model_dump(exclude_unset=True)
	if not update_data:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No changes provided")
	if "assigned_event_id" in update_data and update_data["assigned_event_id"]:
		event = await DisasterEvent.get(update_data["assigned_event_id"])
		if not event:
			raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned disaster event not found")
	apply_update(team, update_data)
	await team.save()
	return team


@router.delete("/{team_id}")
async def delete_response_team(team_id: str, _: Officer = Depends(require_admin)):
	team = await get_document_or_404(ResponseTeam, team_id, "Response team not found")
	await team.delete()
	return {"message": "Response team deleted successfully"}
