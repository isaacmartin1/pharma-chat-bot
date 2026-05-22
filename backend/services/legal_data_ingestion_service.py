import uuid
from sqlalchemy.orm import Session as DBSession
from models import LegalRule

# Curated FDA rules for US pharmaceutical advertising (21 CFR Part 202)
FDA_US_RULES = [
    {
        "rule_id": "FDA-202-fair-balance",
        "rule_text": "Fair balance: safety information must receive presentation comparable to efficacy claims (21 CFR 202.1(e)(5))",
        "severity": "red",
        "source_url": "https://www.ecfr.gov/current/title-21/chapter-I/subchapter-C/part-202"
    },
    {
        "rule_id": "FDA-202-brief-summary",
        "rule_text": "Brief summary: promotional materials must reference or include full Prescribing Information (21 CFR 202.1(e)(1))",
        "severity": "red",
        "source_url": "https://www.ecfr.gov/current/title-21/chapter-I/subchapter-C/part-202"
    },
    {
        "rule_id": "FDA-202-no-misleading",
        "rule_text": "No false or misleading claims about safety, efficacy, or mechanism of action (21 CFR 202.1(e)(6))",
        "severity": "red",
        "source_url": "https://www.ecfr.gov/current/title-21/chapter-I/subchapter-C/part-202"
    },
    {
        "rule_id": "FDA-202-logo-present",
        "rule_text": "Brand logo must be present in all promotional materials",
        "severity": "red",
        "source_url": "https://www.fda.gov/drugs/prescription-drug-advertising"
    },
    {
        "rule_id": "FDA-202-trademark",
        "rule_text": "Registered trademark symbol (®) required on first use of brand name FRUZAQLA",
        "severity": "yellow",
        "source_url": "https://www.fda.gov/drugs/prescription-drug-advertising/prescription-drug-advertising-questions-and-answers"
    },
    {
        "rule_id": "FDA-202-boxed-warning",
        "rule_text": "BOXED WARNING for hemorrhage risk must be prominently referenced in all FRUZAQLA promotional materials (21 CFR 202.1(e)(2))",
        "severity": "red",
        "source_url": "https://www.ecfr.gov/current/title-21/chapter-I/subchapter-C/part-202"
    },
    {
        "rule_id": "FDA-202-established-name",
        "rule_text": "Established (INN) name 'fruquintinib' must appear prominently with brand name at least once (21 CFR 202.1(b)(1))",
        "severity": "yellow",
        "source_url": "https://www.ecfr.gov/current/title-21/chapter-I/subchapter-C/part-202"
    },
    {
        "rule_id": "FDA-202-takeda-signoff",
        "rule_text": "Takeda copyright and job code sign-off required on all promotional materials",
        "severity": "yellow",
        "source_url": "https://www.takeda.com"
    },
    {
        "rule_id": "FDA-202-indication",
        "rule_text": "Approved indication must be clearly stated: previously treated metastatic colorectal cancer",
        "severity": "red",
        "source_url": "https://www.accessdata.fda.gov/drugsatfda_docs/label/2023/217737s000lbl.pdf"
    },
]


def seed_legal_rules(db: DBSession, country: str = 'US') -> int:
    """Seed FDA rules if not already present. Returns number of rules inserted."""
    inserted = 0
    for rule_data in FDA_US_RULES:
        existing = db.query(LegalRule).filter(
            LegalRule.rule_id == rule_data['rule_id'],
            LegalRule.country == country
        ).first()
        if not existing:
            rule = LegalRule(
                id=str(uuid.uuid4()),
                country=country,
                rule_id=rule_data['rule_id'],
                rule_text=rule_data['rule_text'],
                severity=rule_data['severity'],
                source_url=rule_data.get('source_url'),
                active=1
            )
            db.add(rule)
            inserted += 1
    db.commit()
    return inserted


async def refresh_rules_from_source(country: str, db: DBSession) -> dict:
    """
    Production: would crawl FDA.gov / EMA for rule updates.
    POC: re-seeds from curated list, deactivating removed rules.
    """
    current_ids = {r['rule_id'] for r in FDA_US_RULES}

    # Deactivate rules no longer in our curated set
    stale = db.query(LegalRule).filter(
        LegalRule.country == country,
        LegalRule.active == 1
    ).all()
    for rule in stale:
        if rule.rule_id not in current_ids:
            rule.active = 0

    inserted = seed_legal_rules(db, country)
    db.commit()

    return {
        "country": country,
        "rules_active": len(FDA_US_RULES),
        "rules_inserted": inserted,
        "message": "Rules refreshed from curated FDA 21 CFR Part 202 source"
    }
