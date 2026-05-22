from sqlalchemy.orm import Session

from seed.seed_company import seed_company
from seed.seed_claims import seed_claims
from seed.seed_brand_assets import seed_brand_assets
from seed.seed_legal_rules import run as seed_legal_rules
from seed.seed_from_crawl import run as seed_from_crawl
from seed.seed_evidence import run as seed_evidence
from seed.seed_from_style_guide import run as seed_from_style_guide


def seed_all(db: Session) -> None:
    """Run all seeders in dependency order.

    Each seeder is idempotent and skips work when the data already exists.
    """
    seed_company(db)
    seed_claims(db)
    seed_brand_assets(db)
    seed_legal_rules(db)
    seed_from_crawl(db)
    seed_evidence(db)
    seed_from_style_guide(db)
