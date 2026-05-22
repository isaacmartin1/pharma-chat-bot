import os

from sqlalchemy.orm import Session

from models import BrandAsset, Company

LOGO_URL = "https://www.fruzaqlahcp.com/sites/default/files/2024-04/fruzaqla_logo_r_rgb.png"
LOGO_STATIC_PATH = "./static/brand/fruzaqla_logo.png"
LOGO_VALUE = "/static/brand/fruzaqla_logo.png"

_COLOR_TOKENS = [
    ("color_primary", "#8C4799"),
    ("color_secondary", "#59CBE8"),
    ("color_navy", "#002855"),
    ("color_lime", "#97D700"),
    ("color_yellow", "#FFC72C"),
]

_FONT_TOKENS = [
    ("email_body_font", "Arial, Helvetica, sans-serif"),
]


def _download_logo() -> None:
    """Download the FRUZAQLA logo to the static directory if not already present."""
    if os.path.exists(LOGO_STATIC_PATH):
        return

    os.makedirs(os.path.dirname(LOGO_STATIC_PATH), exist_ok=True)

    try:
        import httpx
        resp = httpx.get(LOGO_URL, follow_redirects=True, timeout=30)
        resp.raise_for_status()
        with open(LOGO_STATIC_PATH, "wb") as f:
            f.write(resp.content)
    except Exception as exc:
        print(f"[seed_brand_assets] Warning: could not download logo: {exc}")


def seed_brand_assets(db: Session) -> None:
    """Seed FRUZAQLA brand colors, fonts, and logo if they don't already exist."""
    company = db.query(Company).filter(Company.slug == "fruzaqla").first()
    if not company:
        return  # Company hasn't been seeded yet

    existing_count = (
        db.query(BrandAsset).filter(BrandAsset.company_id == company.id).count()
    )
    if existing_count > 0:
        return  # Already seeded

    _download_logo()

    # Logo
    logo_asset = BrandAsset(
        company_id=company.id,
        asset_type="logo",
        key="primary_logo",
        value=LOGO_VALUE,
        file_path=LOGO_STATIC_PATH,
        status="approved",
        source="crawler",
    )
    db.add(logo_asset)

    # Color tokens
    for key, value in _COLOR_TOKENS:
        db.add(
            BrandAsset(
                company_id=company.id,
                asset_type="color",
                key=key,
                value=value,
                status="approved",
                source="crawler",
            )
        )

    # Font tokens
    for key, value in _FONT_TOKENS:
        db.add(
            BrandAsset(
                company_id=company.id,
                asset_type="font",
                key=key,
                value=value,
                status="approved",
                source="crawler",
            )
        )

    db.commit()
