from sqlalchemy.orm import Session as DBSession
from models import Claim, Company


def get_claims_for_company(company_id: str, db: DBSession) -> list[Claim]:
    return db.query(Claim).filter(Claim.company_id == company_id, Claim.active == 1).all()


def format_claims_context(claims: list[Claim]) -> str:
    lines = []
    for i, c in enumerate(claims, 1):
        lines.append(f"{i}. [{c.category.upper()}] {c.claim_text}")
        if c.source_ref:
            lines.append(f"   Source: {c.source_ref}")
    return "\n".join(lines)


def verify_claim_id(claim_id: str, company_id: str, db: DBSession) -> tuple[bool, str]:
    claim = db.query(Claim).filter(Claim.id == claim_id, Claim.company_id == company_id).first()
    if not claim:
        return False, "Claim not found in approved library"
    if not claim.active:
        return False, "Claim is inactive/deprecated"
    return True, "OK"
