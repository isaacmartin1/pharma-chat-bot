from sqlalchemy.orm import Session

from auth_utils import get_password_hash
from models import Company, User


def seed_company(db: Session) -> None:
    """Seed the FRUZAQLA company and admin user if they don't already exist."""
    company = db.query(Company).filter(Company.slug == "fruzaqla").first()
    if not company:
        company = Company(
            name="Takeda / FRUZAQLA",
            slug="fruzaqla",
            country="US",
        )
        db.add(company)
        db.flush()

    admin_email = "admin@fruzaqla.com"
    if not db.query(User).filter(User.email == admin_email).first():
        admin = User(
            email=admin_email,
            password_hash=get_password_hash("demo1234"),
            name="Demo Admin",
            company_id=company.id,
            role="admin",
        )
        db.add(admin)

    db.commit()
