from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import User
from schemas import CollectRequest

router = APIRouter(prefix="/brand-assets", tags=["brand-assets"])


def _get_collection_service():
    try:
        from services.brand_asset_collection_service import collect
        return collect
    except ImportError:
        return None


@router.post("/collect")
async def collect_brand_assets(
    background_tasks: BackgroundTasks,
    url: str = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    collect = _get_collection_service()

    file_bytes: bytes | None = None
    file_name: str | None = None
    if file is not None:
        file_bytes = await file.read()
        file_name = file.filename

    if collect is not None:
        background_tasks.add_task(
            collect,
            url=url,
            file_bytes=file_bytes,
            file_name=file_name,
            user_id=current_user.id,
            company_id=current_user.company_id,
        )

    return {"queued": True}
