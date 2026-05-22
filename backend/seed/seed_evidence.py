"""Seed FRESCO-2 evidence entries for the FRUZAQLA company."""
from sqlalchemy.orm import Session as DBSession
from models import Company, Claim, Evidence


EVIDENCE_SEED = [
    {
        "study_name": "FRESCO-2",
        "publication": "NEJM 2023",
        "year": 2023,
        "evidence_type": "rct",
        "population": "mCRC patients previously treated with VEGF/VEGFR inhibitors, oxaliplatin, and fluoropyrimidines",
        "sample_size": 691,
        "claim_match_fragment": "OS 7.4 vs 4.8 months",
        "evidence_text": (
            "FRESCO-2: randomized, double-blind, placebo-controlled phase 3 trial (n=691). "
            "Primary endpoint: OS — fruquintinib 7.4 months vs placebo 4.8 months, HR 0.66 (95% CI 0.55–0.80), p<0.001. "
            "Publication: NEJM 2023;388:33-43. PI Section 14.1."
        ),
    },
    {
        "study_name": "FRESCO-2",
        "publication": "NEJM 2023",
        "year": 2023,
        "evidence_type": "rct",
        "population": "mCRC patients previously treated with VEGF/VEGFR inhibitors",
        "sample_size": 691,
        "claim_match_fragment": "PFS 3.7 vs 1.8 months",
        "evidence_text": (
            "FRESCO-2: PFS — fruquintinib 3.7 months vs placebo 1.8 months, HR 0.32 (95% CI 0.27–0.39), p<0.001. "
            "Publication: NEJM 2023;388:33-43. PI Section 14.1."
        ),
    },
    {
        "study_name": "FRESCO-2 Subgroup Analysis",
        "publication": "NEJM 2023 Supplementary",
        "year": 2023,
        "evidence_type": "rct",
        "population": "mCRC patients regardless of prior therapy lines",
        "sample_size": 691,
        "claim_match_fragment": "subgroups regardless of prior",
        "evidence_text": (
            "Consistent efficacy observed across pre-specified subgroups in FRESCO-2, "
            "including patients regardless of number of prior therapy lines, KRAS status, "
            "prior regorafenib use, and geographic region. Source: FRESCO-2 supplementary data."
        ),
    },
    {
        "study_name": "FRUZAQLA Prescribing Information",
        "publication": "FDA-approved PI",
        "year": 2023,
        "evidence_type": "labeling",
        "population": "Adult patients with mCRC",
        "sample_size": None,
        "claim_match_fragment": "5 mg orally once daily",
        "evidence_text": (
            "Recommended dose: 5 mg orally once daily for the first 21 days of each 28-day cycle, "
            "with or without food. Continue until disease progression or unacceptable toxicity. "
            "Source: FRUZAQLA PI Section 2.1."
        ),
    },
    {
        "study_name": "FRUZAQLA Prescribing Information",
        "publication": "FDA-approved PI",
        "year": 2023,
        "evidence_type": "labeling",
        "population": "Special populations",
        "sample_size": None,
        "claim_match_fragment": "No dose adjustment for age",
        "evidence_text": (
            "No dose adjustment recommended for age, sex, race, mild-to-moderate renal impairment "
            "(eGFR 30-89 mL/min/1.73m²), or mild hepatic impairment (Child-Pugh A). "
            "Source: FRUZAQLA PI Section 2.2."
        ),
    },
    {
        "study_name": "FRUZAQLA Prescribing Information",
        "publication": "FDA-approved PI",
        "year": 2023,
        "evidence_type": "pi_section",
        "population": "mCRC patients treated with fruquintinib",
        "sample_size": 416,
        "claim_match_fragment": "hypertension, HFSR, proteinuria",
        "evidence_text": (
            "Most common adverse reactions (≥15%) from FRESCO-2 (n=416): hypertension (34%), "
            "hand-foot skin reaction/HFSR (30%), proteinuria (24%), diarrhea (20%), asthenia/fatigue (19%), "
            "dysphonia (17%), decreased appetite (16%). Source: FRUZAQLA PI Section 6.1."
        ),
    },
    {
        "study_name": "FRUZAQLA Prescribing Information — Boxed Warning",
        "publication": "FDA-approved PI",
        "year": 2023,
        "evidence_type": "labeling",
        "population": "All patients",
        "sample_size": None,
        "claim_match_fragment": "BOXED WARNING",
        "evidence_text": (
            "BOXED WARNING: Hemorrhage — Fruquintinib can cause severe or fatal hemorrhage. "
            "Grade ≥3 hemorrhagic events occurred in 2.4% of patients in FRESCO-2. "
            "Withhold and permanently discontinue for severe or life-threatening hemorrhage. "
            "Source: FRUZAQLA PI Boxed Warning."
        ),
    },
    {
        "study_name": "FRUZAQLA Prescribing Information",
        "publication": "FDA-approved PI",
        "year": 2023,
        "evidence_type": "labeling",
        "population": "Patients of reproductive potential",
        "sample_size": None,
        "claim_match_fragment": "Embryo-fetal toxicity",
        "evidence_text": (
            "Embryo-Fetal Toxicity: Based on its mechanism of action and animal data, "
            "fruquintinib can cause fetal harm. Advise females of reproductive potential and males "
            "with female partners of reproductive potential to use effective contraception during "
            "treatment and for at least 1 week after the last dose. Source: FRUZAQLA PI Section 5.7."
        ),
    },
    {
        "study_name": "FRUZAQLA Prescribing Information",
        "publication": "FDA-approved PI",
        "year": 2023,
        "evidence_type": "pi_section",
        "population": "In vitro pharmacology",
        "sample_size": None,
        "claim_match_fragment": "VEGFR-1, -2, -3",
        "evidence_text": (
            "Fruquintinib is a kinase inhibitor that selectively inhibits VEGFR-1, VEGFR-2, and VEGFR-3. "
            "In vitro, fruquintinib inhibits recombinant VEGFR-1, VEGFR-2, and VEGFR-3 with IC50 values "
            "of 33, 35, and 0.5 nM, respectively, with minimal off-target kinase activity. "
            "Source: FRUZAQLA PI Section 12.1."
        ),
    },
    {
        "study_name": "FRUZAQLA Prescribing Information — Indication",
        "publication": "FDA-approved PI",
        "year": 2023,
        "evidence_type": "labeling",
        "population": "Adult patients with mCRC",
        "sample_size": None,
        "claim_match_fragment": "previously treated mCRC",
        "evidence_text": (
            "Indication: FRUZAQLA is indicated for the treatment of adult patients with metastatic colorectal cancer "
            "(mCRC) who have been previously treated with fluoropyrimidine-, oxaliplatin-, and irinotecan-based "
            "chemotherapy, an anti-VEGF biological therapy, and, if RAS wild-type and medically appropriate, "
            "an anti-EGFR therapy. Source: FRUZAQLA PI Section 1."
        ),
    },
    {
        "study_name": "FRUZAQLA Full Prescribing Information — ISI",
        "publication": "FDA-approved PI",
        "year": 2023,
        "evidence_type": "labeling",
        "population": "All patients",
        "sample_size": None,
        "claim_match_fragment": "Full ISI text",
        "evidence_text": (
            "Full Important Safety Information included per FDA fair balance requirements. "
            "All boxed warnings, contraindications, warnings, precautions, and adverse reactions "
            "as described in the full Prescribing Information. Source: FRUZAQLA Full PI."
        ),
    },
]


def run(db: DBSession) -> None:
    company = db.query(Company).filter(Company.slug == "fruzaqla").first()
    if not company:
        print("[seed_evidence] FRUZAQLA company not found — skipping")
        return

    claims = db.query(Claim).filter(Claim.company_id == company.id).all()

    inserted = 0
    for entry in EVIDENCE_SEED:
        # Skip if already seeded (match on study_name + claim fragment)
        fragment = entry["claim_match_fragment"]
        existing = (
            db.query(Evidence)
            .filter(
                Evidence.company_id == company.id,
                Evidence.study_name == entry["study_name"],
                Evidence.evidence_text.contains(fragment[:30]),
            )
            .first()
        )
        if existing:
            continue

        # Find matching claim
        matched_claim = None
        for claim in claims:
            if fragment.lower() in claim.claim_text.lower():
                matched_claim = claim
                break

        ev = Evidence(
            company_id=company.id,
            claim_id=matched_claim.id if matched_claim else None,
            study_name=entry["study_name"],
            publication=entry.get("publication"),
            year=entry.get("year"),
            evidence_type=entry["evidence_type"],
            evidence_text=entry["evidence_text"],
            population=entry.get("population"),
            sample_size=entry.get("sample_size"),
        )
        db.add(ev)
        inserted += 1

    db.commit()
    print(f"[seed_evidence] inserted {inserted} evidence entries")
