from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Asset, User
from schemas import ComplianceResult

router = APIRouter(prefix="/compliance", tags=["compliance"])


def _get_mandatory_checks_service():
    try:
        from services.mandatory_checks_service import run_checks
        return run_checks
    except ImportError:
        return None


@router.post("/check", response_model=ComplianceResult)
async def compliance_check(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset_id = body.get("asset_id")
    if not asset_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="asset_id required")

    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    run_checks = _get_mandatory_checks_service()
    if run_checks is None:
        # Return a stub result when service not yet available
        return ComplianceResult(
            overall="yellow",
            checks=[
                {
                    "id": "service_unavailable",
                    "name": "Compliance Service",
                    "status": "yellow",
                    "message": "mandatory_checks_service not yet available",
                }
            ],
        )

    result = await run_checks(asset_id, db)
    return result
