"""
Seed script generated from a live crawl of https://www.fruzaqlahcp.com/
(via Wayback Machine archive, captured 2024-12-29 / 2025-01-15).

The live site returns 403 for automated requests; all data below was extracted
from the archived copies and is embedded directly — no live HTTP calls are made
at seed time.

Run via seed_all.py or directly: python seed_from_crawl.py
"""

import uuid
from sqlalchemy.orm import Session
from models import BrandAsset, Claim, Company

# ─── Real images extracted from the site ──────────────────────────────────────
# Original URLs reconstructed from Wayback archive paths.

_IMAGES = [
    {
        "key": "FRUZAQLA® (fruquintinib) logo.",
        "url": "https://www.fruzaqlahcp.com/sites/default/files/2024-04/fruzaqla_logo_r_rgb.png",
        "asset_type": "image",
    },
    {
        "key": "hero_background_desktop",
        "url": "https://www.fruzaqlahcp.com/sites/default/files/styles/background_desktop/public/2024-04/hero-desktop-03262024.jpg",
        "asset_type": "image",
    },
    {
        "key": "hero_background_mobile",
        "url": "https://www.fruzaqlahcp.com/sites/default/files/styles/hero_bg_mobile/public/2024-04/hero-mobile-03262024.jpg",
        "asset_type": "image",
    },
    {
        "key": "NCCN (National Comprehensive Care Network) Category 2A*.",
        "url": "https://www.fruzaqlahcp.com/sites/default/files/2024-04/0.0-nccn-desk.svg",
        "asset_type": "image",
    },
    {
        "key": "Takeda logo.",
        "url": "https://www.fruzaqlahcp.com/sites/default/files/2022-04/logo-takeda.svg",
        "asset_type": "image",
    },
    {
        "key": "internal_page_hero_background",
        "url": "https://www.fruzaqlahcp.com/sites/default/files/styles/hero_bg_mobile/public/2024-02/mobile_internal_headers.png",
        "asset_type": "image",
    },
]

# ─── Real text claims extracted from the site ─────────────────────────────────

_CRAWLED_CLAIMS = [
    # Hero / homepage
    {
        "text": "Reimagine Survival with FRUZAQLA®",
        "category": "crawled",
        "source_ref": "Crawled from https://www.fruzaqlahcp.com/ (hero heading)",
    },
    {
        "text": (
            "The first and only novel targeted therapy approved for mCRC in more than a decade, "
            "for adult patients who have received oxaliplatin- and irinotecan-based regimens, "
            "regardless of mutation status"
        ),
        "category": "crawled",
        "source_ref": "Crawled from https://www.fruzaqlahcp.com/ (hero subheading)",
    },
    {
        "text": (
            "In FRESCO-2, FRUZAQLA (fruquintinib) + BSC significantly improved overall survival "
            "vs placebo + BSC (7.4 vs 4.8 months, a 2.6-month difference); "
            "HR=0.66 (95% CI: 0.55-0.80); P <0.001."
        ),
        "category": "crawled",
        "source_ref": "Crawled from https://www.fruzaqlahcp.com/ (OS stat callout)",
    },
    {
        "text": (
            "FRUZAQLA (fruquintinib) is indicated for the treatment of adult patients with mCRC "
            "who have been previously treated with fluoropyrimidine-, oxaliplatin-, and "
            "irinotecan-based chemotherapy, an anti-VEGF therapy, and, if RAS wild-type and "
            "medically appropriate, an anti-EGFR therapy."
        ),
        "category": "crawled",
        "source_ref": "Crawled from https://www.fruzaqlahcp.com/ (indication statement)",
    },
    # Efficacy page
    {
        "text": "FRUZAQLA® (fruquintinib) efficacy",
        "category": "crawled",
        "source_ref": "Crawled from https://www.fruzaqlahcp.com/efficacy (page hero)",
    },
    {
        "text": "FRUZAQLA demonstrated consistent efficacy and safety profile across 2 clinical trials",
        "category": "crawled",
        "source_ref": "Crawled from https://www.fruzaqlahcp.com/efficacy",
    },
    {
        "text": (
            "FRUZAQLA was studied across two phase 3 studies that included more than 1100 patients "
            "with metastatic colorectal cancer, FRESCO and FRESCO-2."
        ),
        "category": "crawled",
        "source_ref": "Crawled from https://www.fruzaqlahcp.com/efficacy",
    },
    {
        "text": (
            "In these two clinical studies, the primary endpoint was overall survival, and the "
            "secondary endpoints included progression-free survival, objective response rate, "
            "disease control rate, duration of response, and safety. Patients were randomized "
            "(2:1) to receive FRUZAQLA 5 mg orally once daily for the first 21 days of each "
            "28-day cycle plus BSC or placebo + BSC."
        ),
        "category": "crawled",
        "source_ref": "Crawled from https://www.fruzaqlahcp.com/efficacy (study design)",
    },
    # ISI / safety content extracted from homepage footer ISI
    {
        "text": (
            "Hypertension occurred in 49% of 911 patients with mCRC treated with FRUZAQLA, "
            "including Grade 3-4 events in 19%, and hypertensive crisis in three patients (0.3%). "
            "Do not initiate FRUZAQLA unless blood pressure is adequately controlled."
        ),
        "category": "crawled",
        "source_ref": "Crawled from https://www.fruzaqlahcp.com/ (ISI — Hypertension)",
    },
    {
        "text": (
            "Hemorrhagic Events including serious, fatal events can occur with FRUZAQLA. "
            "In 911 patients with mCRC treated with FRUZAQLA, 6% of patients experienced "
            "gastrointestinal hemorrhage, including 1% with a Grade ≥3 event and "
            "2 patients with fatal hemorrhages. Permanently discontinue FRUZAQLA in patients "
            "with severe or life-threatening hemorrhage."
        ),
        "category": "crawled",
        "source_ref": "Crawled from https://www.fruzaqlahcp.com/ (ISI — Hemorrhage)",
    },
    {
        "text": (
            "The most common adverse reactions (incidence ≥20%) following treatment with "
            "FRUZAQLA included hypertension, palmar-plantar erythrodysesthesia (hand-foot skin "
            "reactions), proteinuria, dysphonia, abdominal pain, diarrhea, and asthenia."
        ),
        "category": "crawled",
        "source_ref": "Crawled from https://www.fruzaqlahcp.com/ (ISI — adverse reactions)",
    },
    {
        "text": (
            "FRUZAQLA is indicated for the treatment of adult patients with metastatic colorectal "
            "cancer (mCRC) who have been previously treated with fluoropyrimidine-, oxaliplatin-, "
            "and irinotecan-based chemotherapy, an anti-VEGF therapy, and, if RAS wild-type and "
            "medically appropriate, an anti-EGFR therapy."
        ),
        "category": "crawled",
        "source_ref": "Crawled from https://www.fruzaqlahcp.com/ (ISI sidebar indication)",
    },
    {
        "text": (
            "Embryo-Fetal Toxicity. Based on findings in animal studies and its mechanism of "
            "action, FRUZAQLA can cause fetal harm when administered to pregnant women. Advise "
            "pregnant women of the potential risk to a fetus. Advise females of childbearing "
            "potential and males with female partners of childbearing potential to use effective "
            "contraception during treatment with FRUZAQLA and for 2 weeks after the last dose."
        ),
        "category": "crawled",
        "source_ref": "Crawled from https://www.fruzaqlahcp.com/ (ISI — Embryo-Fetal Toxicity)",
    },
    {
        "text": "Lactation: Advise women not to breastfeed during treatment with FRUZAQLA and for 2 weeks after the last dose.",
        "category": "crawled",
        "source_ref": "Crawled from https://www.fruzaqlahcp.com/ (ISI — Lactation)",
    },
    {
        "text": "Avoid concomitant administration of FRUZAQLA with strong or moderate CYP3A inducers.",
        "category": "crawled",
        "source_ref": "Crawled from https://www.fruzaqlahcp.com/ (ISI — Drug Interactions)",
    },
]

# ─── Real HTML components extracted from the site ─────────────────────────────

_HTML_COMPONENTS = [
    {
        "key": "component_hero_home",
        "classes": "hero",
        "html": (
            '<header class="hero" data-align="text-align-left">'
            '<picture class="hero__background">'
            '<source media="(min-width:800px)" srcset="https://www.fruzaqlahcp.com/sites/default/files/styles/background_desktop/public/2024-04/hero-desktop-03262024.jpg"/>'
            '<source srcset="https://www.fruzaqlahcp.com/sites/default/files/styles/hero_bg_mobile/public/2024-04/hero-mobile-03262024.jpg"/>'
            '<img alt="" src="https://www.fruzaqlahcp.com/sites/default/files/styles/hero_bg_mobile/public/2024-04/hero-mobile-03262024.jpg"/>'
            '</picture>'
            '<div class="hero__inner wrapper">'
            '<div class="hero__content">'
            '<h1 class="hero__heading"><strong>Reimagine Survival with FRUZAQLA<sup>®</sup></strong></h1>'
            '<div class="hero__subheading lede">'
            '<p>The first and only novel targeted therapy approved for mCRC in more than a decade, '
            'for adult patients who have received oxaliplatin- and irinotecan-based regimens, '
            'regardless of mutation status<sup>1-5</sup></p>'
            '</div>'
            '</div>'
            '</div>'
            '</header>'
        ),
    },
    {
        "key": "component_isi_sidebar_indication",
        "classes": "isi__sidebar--inner",
        "html": (
            '<div class="isi__sidebar--inner">'
            '<h3>INDICATION</h3>'
            '<p>FRUZAQLA is indicated for the treatment of adult patients with metastatic colorectal '
            'cancer (mCRC) who have been previously treated with fluoropyrimidine-, oxaliplatin-, '
            'and irinotecan-based chemotherapy, an anti-VEGF therapy, and, if RAS wild-type and '
            'medically appropriate, an anti-EGFR therapy.</p>'
            '</div>'
        ),
    },
    {
        "key": "component_header_utility",
        "classes": "global-header__utility",
        "html": (
            '<div class="global-header__utility">'
            '<a href="https://www.fruzaqlahcp.com/#isi">Important Safety Information</a>'
            '<a href="https://www.fruzaqlahcp.com/sites/default/files/2024-04/fruzaqla-pi.pdf" target="_blank">Prescribing Information</a>'
            '<a href="https://www.fruzaqlahcp.com/sites/default/files/2024-04/fruzaqla-medication-guide.pdf" target="_blank">Medication Information</a>'
            '<a href="https://www.fruzaqlahcp.com/patient-caregiver-site" target="_blank">Patient/Caregiver Site</a>'
            '</div>'
        ),
    },
    {
        "key": "component_hero_efficacy",
        "classes": "hero",
        "html": (
            '<header class="hero" data-align="text-align-left">'
            '<picture class="hero__background">'
            '<source media="(min-width:800px)" srcset="https://www.fruzaqlahcp.com/sites/default/files/styles/background_desktop/public/2024-02/internal_headers.png"/>'
            '<source srcset="https://www.fruzaqlahcp.com/sites/default/files/styles/hero_bg_mobile/public/2024-02/mobile_internal_headers.png"/>'
            '<img alt="" src="https://www.fruzaqlahcp.com/sites/default/files/styles/hero_bg_mobile/public/2024-02/mobile_internal_headers.png"/>'
            '</picture>'
            '<div class="hero__inner wrapper">'
            '<div class="hero__content">'
            '<h1 class="hero__heading">FRUZAQLA<sup>®</sup> (fruquintinib) efficacy</h1>'
            '</div>'
            '</div>'
            '</header>'
        ),
    },
]


# ─── Seed function ────────────────────────────────────────────────────────────

def run(db: Session) -> None:
    """
    Insert crawl-derived BrandAsset rows (images + HTML components) and
    pending Claim rows for FRUZAQLA.

    Idempotent: skips rows whose (company_id, value) or (company_id, key) already exist.
    """
    company = db.query(Company).filter(Company.slug == "fruzaqla").first()
    if not company:
        print("[seed_from_crawl] Company 'fruzaqla' not found — run seed_company first.")
        return

    inserted = 0

    # --- Images ---
    for img in _IMAGES:
        existing = db.query(BrandAsset).filter(
            BrandAsset.company_id == company.id,
            BrandAsset.value == img["url"],
        ).first()
        if existing:
            continue
        asset = BrandAsset(
            id=str(uuid.uuid4()),
            company_id=company.id,
            asset_type=img["asset_type"],
            key=img["key"][:80],
            value=img["url"],
            status="pending",
            source="crawler",
        )
        db.add(asset)
        inserted += 1

    # --- HTML components ---
    for comp in _HTML_COMPONENTS:
        existing = db.query(BrandAsset).filter(
            BrandAsset.company_id == company.id,
            BrandAsset.key == comp["key"],
        ).first()
        if existing:
            continue
        asset = BrandAsset(
            id=str(uuid.uuid4()),
            company_id=company.id,
            asset_type="html_component",
            key=comp["key"],
            value=comp["html"],
            status="pending",
            source="crawler",
        )
        db.add(asset)
        inserted += 1

    # --- Crawled claims (inactive — need review before use) ---
    for item in _CRAWLED_CLAIMS:
        existing = db.query(Claim).filter(
            Claim.company_id == company.id,
            Claim.claim_text == item["text"],
        ).first()
        if existing:
            continue
        claim = Claim(
            id=str(uuid.uuid4()),
            company_id=company.id,
            claim_text=item["text"],
            category=item["category"],
            source_ref=item.get("source_ref"),
            active=0,  # inactive until reviewed by brand manager
        )
        db.add(claim)
        inserted += 1

    db.commit()
    print(f"[seed_from_crawl] Inserted {inserted} new rows.")
