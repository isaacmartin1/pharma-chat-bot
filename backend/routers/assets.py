import io
import json
import zipfile
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Asset, AssetVersion, User
from schemas import AssetResponse, AssetUpdate

router = APIRouter(prefix="/assets", tags=["assets"])


def _get_compliance_service():
    try:
        from services.mandatory_checks_service import run_checks
        return run_checks
    except ImportError:
        return None


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return AssetResponse.model_validate(asset)


@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: str,
    payload: AssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    # Snapshot current content to asset_versions before updating
    if asset.html_content:
        snapshot = AssetVersion(
            asset_id=asset.id,
            html_content=asset.html_content,
            version=asset.version,
            source=payload.source,
        )
        db.add(snapshot)

    asset.html_content = payload.html_content
    asset.version = asset.version + 1
    asset.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(asset)
    return AssetResponse.model_validate(asset)


@router.post("/{asset_id}/export")
async def export_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    # Build compliance data if available
    run_checks = _get_compliance_service()
    compliance_data: dict = {"overall": "unknown", "checks": []}
    if run_checks is not None:
        try:
            result = await run_checks(asset_id, db)
            compliance_data = result.model_dump() if hasattr(result, "model_dump") else result
        except Exception:
            pass

    html_bytes = (asset.html_content or "").encode("utf-8")
    compliance_bytes = json.dumps(compliance_data, indent=2).encode("utf-8")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"asset_{asset_id}.html", html_bytes)
        zf.writestr("compliance.json", compliance_bytes)
    zip_buffer.seek(0)

    filename = f"asset_{asset_id}.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
