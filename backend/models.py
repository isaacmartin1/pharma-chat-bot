import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


def _now():
    return datetime.now(timezone.utc)


def _new_id():
    return str(uuid.uuid4())


class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True, default=_new_id)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False, unique=True)
    country = Column(String, nullable=False, default="US")
    created_at = Column(DateTime, nullable=False, default=_now)

    users = relationship("User", back_populates="company")
    claims = relationship("Claim", back_populates="company")
    brand_assets = relationship("BrandAsset", back_populates="company")
    evidence = relationship("Evidence", back_populates="company")


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_new_id)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    role = Column(
        String,
        nullable=False,
        default="marketer",
    )
    created_at = Column(DateTime, nullable=False, default=_now)
    last_login = Column(DateTime, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "role IN ('admin','brand_manager','marketer','reviewer')",
            name="users_role_check",
        ),
    )

    company = relationship("Company", back_populates="users")
    sessions = relationship("Session", back_populates="user")
    uploads = relationship("Upload", back_populates="user", foreign_keys="Upload.user_id")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=_new_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False, default="New Session")
    created_at = Column(DateTime, nullable=False, default=_now)
    updated_at = Column(DateTime, nullable=False, default=_now, onupdate=_now)

    user = relationship("User", back_populates="sessions")
    messages = relationship(
        "Message", back_populates="session", cascade="all, delete-orphan"
    )
    assets = relationship(
        "Asset", back_populates="session", cascade="all, delete-orphan"
    )
    uploads = relationship("Upload", back_populates="session")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=_new_id)
    session_id = Column(
        String, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=_now)

    __table_args__ = (
        CheckConstraint("role IN ('user','assistant')", name="messages_role_check"),
    )

    session = relationship("Session", back_populates="messages")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True, default=_new_id)
    session_id = Column(
        String, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    asset_type = Column(String, nullable=False, default="email")
    html_content = Column(Text, nullable=True)
    ready = Column(Integer, nullable=False, default=0)
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, default=_now)
    updated_at = Column(DateTime, nullable=False, default=_now, onupdate=_now)

    session = relationship("Session", back_populates="assets")
    versions = relationship(
        "AssetVersion", back_populates="asset", cascade="all, delete-orphan"
    )


class AssetVersion(Base):
    __tablename__ = "asset_versions"

    id = Column(String, primary_key=True, default=_new_id)
    asset_id = Column(
        String, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False
    )
    html_content = Column(Text, nullable=False)
    version = Column(Integer, nullable=False)
    source = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=_now)

    __table_args__ = (
        CheckConstraint(
            "source IN ('ai_generated','ai_edit','manual_edit')",
            name="asset_versions_source_check",
        ),
    )

    asset = relationship("Asset", back_populates="versions")


class Upload(Base):
    __tablename__ = "uploads"

    id = Column(String, primary_key=True, default=_new_id)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    original_name = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False, default=_now)

    session = relationship("Session", back_populates="uploads")
    user = relationship("User", back_populates="uploads", foreign_keys=[user_id])


class Claim(Base):
    __tablename__ = "claims"

    id = Column(String, primary_key=True, default=_new_id)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    claim_text = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    source_ref = Column(String, nullable=True)
    active = Column(Integer, nullable=False, default=1)

    company = relationship("Company", back_populates="claims")
    evidence = relationship("Evidence", back_populates="claim")


class BrandAsset(Base):
    __tablename__ = "brand_assets"

    id = Column(String, primary_key=True, default=_new_id)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    asset_type = Column(String, nullable=False)
    key = Column(String, nullable=False)
    value = Column(String, nullable=False)
    file_path = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")
    source = Column(String, nullable=False, default="crawler")
    submitted_by = Column(String, ForeignKey("users.id"), nullable=True)
    approved_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=_now)

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','approved','rejected')",
            name="brand_assets_status_check",
        ),
        CheckConstraint(
            "source IN ('crawler','admin_upload','inpainted','html_generated')",
            name="brand_assets_source_check",
        ),
    )

    company = relationship("Company", back_populates="brand_assets")
    submitter = relationship("User", foreign_keys=[submitted_by])
    approver = relationship("User", foreign_keys=[approved_by])


class LegalRule(Base):
    __tablename__ = "legal_rules"

    id = Column(String, primary_key=True, default=_new_id)
    country = Column(String, nullable=False, default="US")
    rule_id = Column(String, nullable=False)
    rule_text = Column(Text, nullable=False)
    severity = Column(String, nullable=False)
    source_url = Column(String, nullable=True)
    active = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, default=_now)

    __table_args__ = (
        CheckConstraint(
            "severity IN ('red','yellow')", name="legal_rules_severity_check"
        ),
    )


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String, primary_key=True, default=_new_id)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    claim_id = Column(String, ForeignKey("claims.id"), nullable=True)  # links to specific claim
    study_name = Column(String, nullable=False)       # e.g. "FRESCO-2"
    publication = Column(String, nullable=True)        # e.g. "NEJM 2023"
    year = Column(Integer, nullable=True)
    evidence_type = Column(String, nullable=False)     # 'rct'|'meta_analysis'|'pi_section'|'labeling'
    evidence_text = Column(Text, nullable=False)       # the specific supporting text
    population = Column(String, nullable=True)         # e.g. "mCRC patients previously treated with VEGF/VEGFR"
    sample_size = Column(Integer, nullable=True)
    active = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, default=_now)

    company = relationship("Company", back_populates="evidence")
    claim = relationship("Claim", back_populates="evidence")
