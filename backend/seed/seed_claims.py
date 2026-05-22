from sqlalchemy.orm import Session

from models import Claim, Company

_CLAIMS = [
    {
        "category": "indication",
        "claim_text": (
            "FRUZAQLA® (fruquintinib) is indicated for the treatment of adult patients "
            "with previously treated metastatic colorectal cancer (mCRC)."
        ),
        "source_ref": "Prescribing Information, Section 1",
    },
    {
        "category": "efficacy",
        "claim_text": (
            "In the FRESCO-2 trial, FRUZAQLA demonstrated a statistically significant improvement "
            "in overall survival vs placebo (median OS: 7.4 months vs 4.8 months; HR=0.66; "
            "95% CI: 0.55, 0.80; P<0.001)."
        ),
        "source_ref": "PI Section 14.1; Dasari et al., NEJM 2023",
    },
    {
        "category": "efficacy",
        "claim_text": (
            "FRUZAQLA significantly improved progression-free survival vs placebo "
            "(median PFS: 3.7 months vs 1.8 months; HR=0.32; 95% CI: 0.27, 0.39; P<0.001)."
        ),
        "source_ref": "PI Section 14.1",
    },
    {
        "category": "efficacy",
        "claim_text": (
            "FRUZAQLA demonstrated consistent efficacy across all pre-specified subgroups regardless "
            "of prior therapy type, including prior regorafenib or TAS-102."
        ),
        "source_ref": "FRESCO-2 supplementary data",
    },
    {
        "category": "dosing",
        "claim_text": (
            "The recommended dose of FRUZAQLA is 5 mg orally once daily for the first 21 days "
            "of each 28-day cycle, with or without food."
        ),
        "source_ref": "PI Section 2.1",
    },
    {
        "category": "dosing",
        "claim_text": (
            "FRUZAQLA requires no dose adjustment based on age, sex, race/ethnicity, "
            "or mild-to-moderate renal impairment."
        ),
        "source_ref": "PI Section 2.2",
    },
    {
        "category": "safety",
        "claim_text": (
            "The most common adverse reactions (≥15%) with FRUZAQLA were hypertension, "
            "hand-foot skin reaction, proteinuria, and diarrhea."
        ),
        "source_ref": "PI Section 6.1",
    },
    {
        "category": "safety",
        "claim_text": (
            "FRUZAQLA carries a BOXED WARNING for the risk of severe or fatal hemorrhage; "
            "permanently discontinue for severe or fatal hemorrhage."
        ),
        "source_ref": "PI Boxed Warning",
    },
    {
        "category": "safety",
        "claim_text": (
            "Advise females of reproductive potential of the potential risk to a fetus and to use "
            "effective contraception during treatment and for 1 week after the final dose."
        ),
        "source_ref": "PI Section 5.7",
    },
    {
        "category": "efficacy",
        "claim_text": (
            "FRUZAQLA is a kinase inhibitor that selectively inhibits VEGFR-1, VEGFR-2, and VEGFR-3 "
            "with high selectivity."
        ),
        "source_ref": "PI Section 12.1",
    },
    {
        "category": "isi",
        "claim_text": (
            "IMPORTANT SAFETY INFORMATION: Please see full Prescribing Information, including BOXED WARNING, "
            "for FRUZAQLA® (fruquintinib). FRUZAQLA is indicated for the treatment of adult patients "
            "with previously treated metastatic colorectal cancer."
        ),
        "source_ref": "Full ISI",
    },
]


def seed_claims(db: Session) -> None:
    """Seed approved claims for FRUZAQLA if they don't already exist."""
    company = db.query(Company).filter(Company.slug == "fruzaqla").first()
    if not company:
        return  # Company hasn't been seeded yet

    existing_count = db.query(Claim).filter(Claim.company_id == company.id).count()
    if existing_count > 0:
        return  # Already seeded

    for item in _CLAIMS:
        claim = Claim(
            company_id=company.id,
            claim_text=item["claim_text"],
            category=item["category"],
            source_ref=item.get("source_ref"),
            active=1,
        )
        db.add(claim)

    db.commit()
