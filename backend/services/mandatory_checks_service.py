import asyncio
import re
import uuid

from sqlalchemy.orm import Session as DBSession

import models as _models
from models import Asset
from schemas import ComplianceCheck, ComplianceResult
from services.evidence_service import check_evidence
from services.brand_wording_service import verify_claim_id
from services.brand_assets_service import verify_image_approved

# ---------------------------------------------------------------------------
# Graceful fallback for legal_service — owned by another agent.
# If the file hasn't been created yet (or has an import error) we substitute
# a no-op that returns a single yellow check so the rest of the pipeline
# continues to function.
# ---------------------------------------------------------------------------
try:
    from services.legal_service import check_legal as _check_legal_impl

    def check_legal(html: str, company_id: str, db: DBSession) -> list[ComplianceCheck]:
        return _check_legal_impl(html, company_id, db)

except Exception:
    def check_legal(html: str, company_id: str, db: DBSession) -> list[ComplianceCheck]:
        return [ComplianceCheck(
            id=str(uuid.uuid4()),
            name="Legal Review",
            status="yellow",
            message="Legal service unavailable — manual review required",
        )]


async def run_checks(asset_id: str, db: DBSession) -> ComplianceResult:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset or not asset.html_content:
        return ComplianceResult(overall="fail", checks=[
            ComplianceCheck(
                id=str(uuid.uuid4()),
                name="Asset",
                status="red",
                message="Asset not found or has no content",
            )
        ])

    html = asset.html_content

    # Resolve company_id by walking session -> user
    session = db.query(_models.Session).filter(_models.Session.id == asset.session_id).first()
    user = db.query(_models.User).filter(_models.User.id == session.user_id).first()
    company_id = user.company_id

    # Run all four check groups in parallel
    legal_checks, evidence_checks, wording_checks, asset_checks = await asyncio.gather(
        asyncio.to_thread(check_legal, html, company_id, db),
        asyncio.to_thread(check_evidence, html, company_id, db),
        asyncio.to_thread(_check_brand_wording, html, company_id, db),
        asyncio.to_thread(_check_brand_assets, html, company_id, db),
    )

    all_checks = legal_checks + evidence_checks + wording_checks + asset_checks

    if any(c.status == "red" for c in all_checks):
        overall = "fail"
    elif any(c.status == "yellow" for c in all_checks):
        overall = "warning"
    else:
        overall = "pass"

    return ComplianceResult(overall=overall, checks=all_checks)


# ---------------------------------------------------------------------------
# Sub-check helpers (called via asyncio.to_thread so they must be sync)
# ---------------------------------------------------------------------------

def _check_brand_wording(html: str, company_id: str, db: DBSession) -> list[ComplianceCheck]:
    checks = []
    claim_ids = re.findall(r'<!-- CLAIM_ID:([a-f0-9-]+) -->', html)
    for claim_id in claim_ids:
        ok, msg = verify_claim_id(claim_id, company_id, db)
        checks.append(ComplianceCheck(
            id=str(uuid.uuid4()),
            name=f"Brand Wording ({claim_id[:8]}...)",
            status="green" if ok else "red",
            message="Approved wording verified" if ok else msg,
        ))
    if not claim_ids:
        checks.append(ComplianceCheck(
            id=str(uuid.uuid4()),
            name="Brand Wording",
            status="yellow",
            message="No claims found to verify",
        ))
    return checks


def _check_brand_assets(html: str, company_id: str, db: DBSession) -> list[ComplianceCheck]:
    checks = []

    # ISI marker
    if "<!-- ISI_PRESENT -->" in html:
        checks.append(ComplianceCheck(
            id=str(uuid.uuid4()), name="ISI Footer",
            status="green", message="ISI footer present",
        ))
    else:
        checks.append(ComplianceCheck(
            id=str(uuid.uuid4()), name="ISI Footer",
            status="red", message="ISI footer missing — required for all promotional materials",
        ))

    # Image URL approval
    img_urls = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', html)
    for url in img_urls:
        if "localhost:8000/static/brand" in url or verify_image_approved(url, company_id, db):
            checks.append(ComplianceCheck(
                id=str(uuid.uuid4()), name="Brand Asset",
                status="green", message=f"Approved asset: {url.split('/')[-1]}",
            ))
        else:
            checks.append(ComplianceCheck(
                id=str(uuid.uuid4()), name="Brand Asset",
                status="red", message=f"Unauthorized image: {url}",
            ))
    return checks
