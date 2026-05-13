from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_officer
from app.models.affected_area import AffectedArea
from app.models.disaster_event import DisasterEvent
from app.models.early_warning import EarlyWarning
from app.models.evacuation_center import EvacuationCenter
from app.models.officer import Officer
from app.models.relief_operation import ReliefOperation
from app.models.response_team import ResponseTeam


router = APIRouter()


@router.get("/")
async def get_dashboard_report(_: Officer = Depends(get_current_officer)):
	disaster_events = await DisasterEvent.find_all().to_list()
	affected_areas = await AffectedArea.find_all().to_list()
	response_teams = await ResponseTeam.find_all().to_list()
	evacuation_centers = await EvacuationCenter.find_all().to_list()
	relief_operations = await ReliefOperation.find_all().to_list()
	early_warnings = await EarlyWarning.find_all().to_list()

	active_disasters = [event for event in disaster_events if event.status == "Ongoing"]

	return {
		"totals": {
			"disaster_events": len(disaster_events),
			"active_disasters": len(active_disasters),
			"affected_areas": len(affected_areas),
			"response_teams": len(response_teams),
			"evacuation_centers": len(evacuation_centers),
			"relief_operations": len(relief_operations),
			"early_warnings": len(early_warnings),
		},
		"recent": {
			"disaster_events": disaster_events[:5],
			"affected_areas": affected_areas[:5],
			"response_teams": response_teams[:5],
			"evacuation_centers": evacuation_centers[:5],
			"relief_operations": relief_operations[:5],
			"early_warnings": early_warnings[:5],
		},
	}
