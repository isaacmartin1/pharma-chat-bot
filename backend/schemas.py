from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, field_validator


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    company_name: str
    company_slug: str
    country: str = "US"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    company_id: str
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = {"from_attributes": True}


TokenResponse.model_rebuild()


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

class SessionCreate(BaseModel):
    title: str = "New Session"


class SessionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SessionDetailResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List["MessageResponse"] = []
    latest_asset: Optional["AssetResponse"] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------

class MessageCreate(BaseModel):
    content: str
    upload_ids: List[str] = []


class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Assets
# ---------------------------------------------------------------------------

class AssetResponse(BaseModel):
    id: str
    session_id: str
    asset_type: str
    html_content: Optional[str] = None
    ready: int
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


SessionDetailResponse.model_rebuild()


class AssetUpdate(BaseModel):
    html_content: str
    source: str = "manual_edit"

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str) -> str:
        allowed = {"ai_generated", "ai_edit", "manual_edit"}
        if v not in allowed:
            raise ValueError(f"source must be one of {allowed}")
        return v


# ---------------------------------------------------------------------------
# Uploads
# ---------------------------------------------------------------------------

class UploadResponse(BaseModel):
    id: str
    session_id: Optional[str] = None
    user_id: str
    original_name: str
    mime_type: str
    file_path: str
    size_bytes: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Compliance
# ---------------------------------------------------------------------------

class ComplianceCheck(BaseModel):
    id: str
    name: str
    status: str  # "green" | "yellow" | "red"
    message: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {"green", "yellow", "red"}
        if v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v


class ComplianceResult(BaseModel):
    overall: str  # "green" | "yellow" | "red"
    checks: List[ComplianceCheck]


# ---------------------------------------------------------------------------
# Brand Collection
# ---------------------------------------------------------------------------

class GoogleAuthRequest(BaseModel):
    credential: str  # the raw ID token from Google


class CollectRequest(BaseModel):
    url: Optional[str] = None
