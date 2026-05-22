from sqlalchemy.orm import Session as DBSession
from models import BrandAsset


def get_brand_config(company_id: str, db: DBSession) -> dict:
    assets = db.query(BrandAsset).filter(
        BrandAsset.company_id == company_id,
        BrandAsset.status == 'approved'
    ).all()
    config = {}
    for a in assets:
        config[a.key] = a.value
    return config


def get_logo_url(company_id: str, db: DBSession) -> str:
    asset = db.query(BrandAsset).filter(
        BrandAsset.company_id == company_id,
        BrandAsset.key == 'primary_logo',
        BrandAsset.status == 'approved'
    ).first()
    return asset.value if asset else "http://localhost:8000/static/brand/fruzaqla_logo.png"


def verify_image_approved(image_url: str, company_id: str, db: DBSession) -> bool:
    asset = db.query(BrandAsset).filter(
        BrandAsset.company_id == company_id,
        BrandAsset.value == image_url,
        BrandAsset.status == 'approved'
    ).first()
    return asset is not None
