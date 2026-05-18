import asyncio
import json
from typing import Any, Awaitable, Callable

from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.responses import StreamingResponse

from app.core.dependencies import get_current_officer_sse
from app.models.affected_area import AffectedArea
from app.models.disaster_event import DisasterEvent
from app.models.early_warning import EarlyWarning
from app.models.evacuation_center import EvacuationCenter
from app.models.relief_operation import ReliefOperation
from app.models.response_team import ResponseTeam


router = APIRouter()


STREAM_INTERVAL_SECONDS = 0.4


def format_sse(data: Any) -> str:
    payload = json.dumps(jsonable_encoder(data))
    return f"data: {payload}\n\n"


async def stream_payload(fetcher: Callable[[], Awaitable[Any]]):
    while True:
        data = await fetcher()
        yield format_sse(data)
        await asyncio.sleep(STREAM_INTERVAL_SECONDS)


@router.get("/disasters")
async def stream_disasters(_: Any = Depends(get_current_officer_sse)):
    return StreamingResponse(
        stream_payload(lambda: DisasterEvent.find_all().to_list()),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/teams")
async def stream_teams(_: Any = Depends(get_current_officer_sse)):
    return StreamingResponse(
        stream_payload(lambda: ResponseTeam.find_all().to_list()),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/relief")
async def stream_relief(_: Any = Depends(get_current_officer_sse)):
    return StreamingResponse(
        stream_payload(lambda: ReliefOperation.find_all().to_list()),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/evacuation")
async def stream_evacuation(_: Any = Depends(get_current_officer_sse)):
    return StreamingResponse(
        stream_payload(lambda: EvacuationCenter.find_all().to_list()),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/warnings")
async def stream_warnings(_: Any = Depends(get_current_officer_sse)):
    return StreamingResponse(
        stream_payload(lambda: EarlyWarning.find_all().to_list()),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/affected-areas")
async def stream_affected_areas(_: Any = Depends(get_current_officer_sse)):
    return StreamingResponse(
        stream_payload(lambda: AffectedArea.find_all().to_list()),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/reports")
async def stream_reports(_: Any = Depends(get_current_officer_sse)):
    async def fetch_report():
        disaster_events = await DisasterEvent.find_all().to_list()
        affected_areas = await AffectedArea.find_all().to_list()
        response_teams = await ResponseTeam.find_all().to_list()
        evacuation_centers = await EvacuationCenter.find_all().to_list()
        relief_operations = await ReliefOperation.find_all().to_list()
        early_warnings = await EarlyWarning.find_all().to_list()

        active_disasters = [
            event for event in disaster_events if event.status == "Ongoing"
        ]

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

    return StreamingResponse(
        stream_payload(fetch_report),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
