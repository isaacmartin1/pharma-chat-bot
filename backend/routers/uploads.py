import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Upload, User
from schemas import UploadResponse
from storage.local_blob import save_file

router = APIRouter(prefix="/uploads", tags=["uploads"])

STORAGE_BASE = "./storage/user_content"


@router.post("", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = await file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    user_dir = os.path.join("user_content", current_user.id)
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "")[1]
    relative_path = os.path.join(user_dir, f"{file_id}{ext}")

    saved_path = save_file(data, relative_path)

    upload = Upload(
        user_id=current_user.id,
        session_id=session_id,
        original_name=file.filename or "unknown",
        mime_type=file.content_type or "application/octet-stream",
        file_path=saved_path,
        size_bytes=len(data),
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)
    return UploadResponse.model_validate(upload)
