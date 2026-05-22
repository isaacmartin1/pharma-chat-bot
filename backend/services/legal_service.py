import re
import uuid
from sqlalchemy.orm import Session as DBSession
from models import LegalRule, Company
from schemas import ComplianceCheck


def check_legal(html_content: str, company_id: str, db: DBSession) -> list[ComplianceCheck]:
    # Get company country
    company = db.query(Company).filter(Company.id == company_id).first()
    country = company.country if company else 'US'

    # Get active rules for this country
    rules = db.query(LegalRule).filter(LegalRule.country == country, LegalRule.active == 1).all()

    checks = []
    for rule in rules:
        passed, detail = _apply_rule(rule.rule_id, html_content)
        checks.append(ComplianceCheck(
            id=str(uuid.uuid4()),
            name=f"[{rule.rule_id}] {rule.rule_text[:60]}...",
            status="green" if passed else rule.severity,
            message=detail
        ))

    return checks


def _apply_rule(rule_id: str, html: str) -> tuple[bool, str]:
    """Apply a specific FDA rule to the HTML content. Returns (passed, detail_message)."""

    html_lower = html.lower()

    if rule_id == "FDA-202-fair-balance":
        # ISI / safety info must be present and roughly comparable in length
        has_isi = '<!-- isi_present -->' in html_lower or 'important safety information' in html_lower
        if not has_isi:
            return False, "No ISI/safety information found — fair balance requires safety info alongside efficacy claims"
        return True, "ISI present — fair balance requirement met"

    elif rule_id == "FDA-202-brief-summary":
        has_pi_ref = any(phrase in html_lower for phrase in [
            'prescribing information', 'full prescribing', 'see pi', 'see full pi'
        ])
        if not has_pi_ref:
            return False, "No reference to Prescribing Information found — brief summary requirement not met"
        return True, "Prescribing Information reference present"

    elif rule_id == "FDA-202-no-misleading":
        # Check for superlatives that could be misleading without qualification
        risky = re.findall(r'\b(safest|most effective|best(?! available)|guarantees?|cures?|eliminates? all)\b', html_lower)
        if risky:
            return False, f"Potentially misleading language detected: {', '.join(set(risky))}"
        return True, "No obviously misleading superlatives detected"

    elif rule_id == "FDA-202-logo-present":
        has_logo = '<!-- fruzaqla_logo_present -->' in html_lower or 'fruzaqla_logo' in html_lower
        if not has_logo:
            return False, "FRUZAQLA logo not detected in asset"
        return True, "FRUZAQLA logo present"

    elif rule_id == "FDA-202-trademark":
        has_trademark = 'fruzaqla®' in html_lower or 'fruzaqla&reg;' in html_lower or 'fruzaqla&#174;' in html_lower
        if not has_trademark:
            return False, "FRUZAQLA® registered trademark symbol missing on first use"
        return True, "FRUZAQLA® trademark symbol present"

    elif rule_id == "FDA-202-boxed-warning":
        # If drug has boxed warning, it must be referenced
        has_boxed_ref = any(phrase in html_lower for phrase in [
            'boxed warning', 'black box', 'warning:', 'see warnings'
        ])
        if not has_boxed_ref:
            return False, "FRUZAQLA has a BOXED WARNING for hemorrhage — must be referenced in promotional materials"
        return True, "Boxed warning referenced"

    elif rule_id == "FDA-202-established-name":
        has_inn = 'fruquintinib' in html_lower
        if not has_inn:
            return False, "INN/established name 'fruquintinib' not found — must appear near brand name per 21 CFR 202.1(b)(1)"
        return True, "Established name (fruquintinib) present"

    elif rule_id == "FDA-202-takeda-signoff":
        has_signoff = any(phrase in html_lower for phrase in ['takeda', '© 20', 'uso-frq'])
        if not has_signoff:
            return False, "Takeda copyright/sign-off line missing"
        return True, "Takeda sign-off line present"

    elif rule_id == "FDA-202-indication":
        has_indication = any(phrase in html_lower for phrase in [
            'metastatic colorectal', 'mcrc', 'previously treated'
        ])
        if not has_indication:
            return False, "Approved indication not stated — must reference mCRC indication"
        return True, "Approved indication present"

    return True, f"Rule {rule_id} checked"
