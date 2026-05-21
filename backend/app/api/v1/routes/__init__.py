from fastapi import APIRouter

# Import all individual routers from your route files
from .affected_areas import router as affected_areas_router
from .auth import router as auth_router
from .disasters import router as disasters_router
from .evacuation import router as evacuation_router
from .geocode import router as geocode_router
from .relief import router as relief_router
from .reports import router as reports_router
from .stream import router as stream_router
from .teams import router as teams_router
from .warnings import router as warnings_router

# Create the main router that will hold all the sub-routers
api_router = APIRouter()

# Include each router with its corresponding prefix and tags
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(disasters_router, prefix="/disasters", tags=["disasters"])
api_router.include_router(
    affected_areas_router, prefix="/affected-areas", tags=["affected-areas"]
)
api_router.include_router(evacuation_router, prefix="/evacuation", tags=["evacuation"])
api_router.include_router(
    geocode_router, prefix="/geocode", tags=["geocode"]
)  # <-- This fixes your map bug!
api_router.include_router(relief_router, prefix="/relief", tags=["relief"])
api_router.include_router(reports_router, prefix="/reports", tags=["reports"])
api_router.include_router(stream_router, prefix="/stream", tags=["stream"])
api_router.include_router(teams_router, prefix="/teams", tags=["teams"])
api_router.include_router(warnings_router, prefix="/warnings", tags=["warnings"])
