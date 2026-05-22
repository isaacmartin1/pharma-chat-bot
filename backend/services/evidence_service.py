import re
import uuid

from sqlalchemy.orm import Session as DBSession

from models import Claim, Evidence
from schemas import ComplianceCheck


def check_evidence(html_content: str, company_id: str, db: DBSession) -> list[ComplianceCheck]:
    checks = []
    claim_ids = re.findall(r'<!-- CLAIM_ID:([a-f0-9-]+) -->', html_content)

    if not claim_ids:
        checks.append(ComplianceCheck(
            id=str(uuid.uuid4()), name="Claim Citations",
            status="yellow",
            message="No claim IDs found in HTML — claims cannot be verified against evidence library"
        ))
        return checks

    for claim_id in claim_ids:
        claim = db.query(Claim).filter(Claim.id == claim_id, Claim.company_id == company_id).first()
        if not claim:
            checks.append(ComplianceCheck(
                id=str(uuid.uuid4()), name=f"Claim Evidence ({claim_id[:8]}...)",
                status="red", message="Claim ID not found in approved claims library"
            ))
            continue

        # Look for supporting evidence in Evidence DB
        evidence = (
            db.query(Evidence)
            .filter(Evidence.claim_id == claim_id, Evidence.active == 1)
            .first()
        )

        if evidence:
            pub = f" ({evidence.publication}, {evidence.year})" if evidence.publication else ""
            checks.append(ComplianceCheck(
                id=str(uuid.uuid4()), name=f"Claim Evidence ({claim.category})",
                status="green",
                message=f"Evidence on file: {evidence.study_name}{pub}"
            ))
        elif claim.source_ref:
            # Fallback: claim has a source_ref even without full evidence entry
            checks.append(ComplianceCheck(
                id=str(uuid.uuid4()), name=f"Claim Citation ({claim.category})",
                status="yellow",
                message=f"Claim has source ref but no evidence DB entry: {claim.source_ref}"
            ))
        else:
            checks.append(ComplianceCheck(
                id=str(uuid.uuid4()), name=f"Claim Evidence ({claim.category})",
                status="red",
                message=f"No evidence on file for claim: '{claim.claim_text[:60]}...'"
            ))

    return checks
