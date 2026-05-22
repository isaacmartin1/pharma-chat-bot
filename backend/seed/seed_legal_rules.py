from sqlalchemy.orm import Session as DBSession
from services.legal_data_ingestion_service import seed_legal_rules


def run(db: DBSession):
    count = seed_legal_rules(db, country='US')
    if count > 0:
        print(f"Seeded {count} FDA legal rules for US")
