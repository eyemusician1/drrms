import asyncio
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import get_current_officer
from app.models.officer import Officer

router = APIRouter()

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "DRRMS/1.0 (disaster-risk-reduction-system; educational-project)"

# Philippines viewbox: left, top, right, bottom (lng, lat)
PH_VIEWBOX = "116.0,21.3,127.7,4.2"
PH_BOUNDS = {"west": 116.0, "south": 4.2, "east": 127.7, "north": 21.3}


def _in_ph_bounds(lat: float, lng: float) -> bool:
    return (
        PH_BOUNDS["south"] <= lat <= PH_BOUNDS["north"]
        and PH_BOUNDS["west"] <= lng <= PH_BOUNDS["east"]
    )


def _mentions_philippines(item: dict) -> bool:
    display = str(item.get("display_name", "")).lower()
    return "philippines" in display or ", ph" in display


def _pick_result(items: list) -> Optional[dict]:
    if not isinstance(items, list):
        return None
    for item in items:
        try:
            lat = float(item.get("lat"))
            lng = float(item.get("lon"))
        except (TypeError, ValueError):
            continue
        if _in_ph_bounds(lat, lng) or _mentions_philippines(item):
            return {
                "lat": lat,
                "lng": lng,
                "label": item.get("display_name", ""),
            }
    return None


def _build_queries(
    q: str,
    barangay: Optional[str],
    city: Optional[str],
    province: Optional[str],
) -> list[str]:
    queries: list[str] = []
    seen: set[str] = set()

    def add(query: str) -> None:
        normalized = " ".join(str(query or "").split()).strip()
        if not normalized:
            return
        key = normalized.lower()
        if key in seen:
            return
        seen.add(key)
        queries.append(normalized)

    if barangay and city and province:
        add(f"{barangay}, {city}, {province}, Philippines")
    if barangay and city:
        add(f"{barangay}, {city}, Philippines")
    if city and province:
        add(f"{city}, {province}, Philippines")
    if city:
        add(f"{city}, Philippines")
    if province and not city:
        add(f"{province}, Philippines")

    base = str(q or "").strip()
    if base:
        if "philippines" not in base.lower():
            add(f"{base}, Philippines")
        add(base)

    return queries


async def _nominatim_search(
    client: httpx.AsyncClient, query: str, *, country_bias: bool
) -> Optional[dict]:
    params: dict = {
        "format": "json",
        "limit": 8,
        "addressdetails": 1,
        "q": query,
    }
    if country_bias:
        params["countrycodes"] = "ph"
        params["viewbox"] = PH_VIEWBOX
        params["bounded"] = 0

    response = await client.get(
        NOMINATIM_URL,
        params=params,
        headers={"User-Agent": USER_AGENT, "Accept-Language": "en"},
        timeout=12.0,
    )
    if response.status_code != 200:
        return None
    return _pick_result(response.json())


@router.get("/")
async def geocode_place(
    q: str = Query(..., min_length=1, max_length=300),
    barangay: Optional[str] = Query(None, max_length=120),
    city: Optional[str] = Query(None, max_length=120),
    province: Optional[str] = Query(None, max_length=120),
    _: Officer = Depends(get_current_officer),
):
    queries = _build_queries(q, barangay, city, province)
    if not queries:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Location query is required.",
        )

    async with httpx.AsyncClient() as client:
        for index, query in enumerate(queries):
            if index > 0:
                await asyncio.sleep(1.1)
            result = await _nominatim_search(client, query, country_bias=True)
            if result:
                return result
        for index, query in enumerate(queries[:3]):
            if index > 0:
                await asyncio.sleep(1.1)
            result = await _nominatim_search(client, query, country_bias=False)
            if result:
                return result

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No coordinates found for that location.",
    )
