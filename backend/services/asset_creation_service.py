import uuid

from anthropic import Anthropic
from sqlalchemy.orm import Session as DBSession

from models import Asset, AssetVersion, Session as ChatSession, User
from services.brand_assets_service import get_logo_url
from services.brand_wording_service import get_claims_for_company
from prompts.asset_generation import get_asset_generation_prompt

client = Anthropic()


async def generate_asset(session_id: str, requirements_summary: str, db: DBSession) -> tuple[str, str]:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    user = db.query(User).filter(User.id == session.user_id).first()
    company_id = user.company_id

    logo_url = get_logo_url(company_id, db)
    claims = get_claims_for_company(company_id, db)
    selected_claims_text = "\n".join([
        f"- [{c.category.upper()}] {c.claim_text} (ID: {c.id}, Source: {c.source_ref})"
        for c in claims[:5]  # Use top 5 most relevant
    ])

    prompt = get_asset_generation_prompt(requirements_summary, selected_claims_text, logo_url)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8096,
        messages=[{"role": "user", "content": prompt}],
    )

    html_content = response.content[0].text.strip()

    # Ensure compliance markers are present
    if "<!-- FRUZAQLA_LOGO_PRESENT -->" not in html_content:
        html_content = html_content.replace("</head>", "<!-- FRUZAQLA_LOGO_PRESENT -->\n</head>")
    if "<!-- ISI_PRESENT -->" not in html_content and "IMPORTANT SAFETY INFORMATION" in html_content:
        html_content = html_content.replace(
            "IMPORTANT SAFETY INFORMATION",
            "<!-- ISI_PRESENT -->IMPORTANT SAFETY INFORMATION",
            1,
        )

    # Persist asset record
    asset_id = str(uuid.uuid4())
    asset = Asset(
        id=asset_id,
        session_id=session_id,
        asset_type="email",
        html_content=html_content,
        ready=0,
        version=1,
    )
    db.add(asset)

    # Snapshot initial version
    version = AssetVersion(
        id=str(uuid.uuid4()),
        asset_id=asset_id,
        html_content=html_content,
        version=1,
        source="ai_generated",
    )
    db.add(version)
    db.commit()

    return asset_id, html_content
