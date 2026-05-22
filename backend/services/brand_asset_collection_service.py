import asyncio
import base64
import json
import re
import uuid
import httpx
from bs4 import BeautifulSoup
from anthropic import Anthropic
from sqlalchemy.orm import Session as DBSession
from models import BrandAsset, Claim, Company
from storage.local_blob import save_file

client = Anthropic()

# ─── HTML Crawler ─────────────────────────────────────────────────────────────

async def crawl_url(url: str, company_id: str, db: DBSession) -> dict:
    """Crawl a URL and extract brand assets + text claims."""
    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as http:
        resp = await http.get(url)
        resp.raise_for_status()
        html = resp.text

    soup = BeautifulSoup(html, 'html.parser')
    results = {"colors": [], "fonts": [], "images": [], "claims": [], "html_components": []}

    # Extract CSS custom properties (design tokens)
    style_tags = soup.find_all('style')
    for style in style_tags:
        css_text = style.string or ''
        colors = re.findall(r'--[\w-]+:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\))', css_text)
        results["colors"].extend(colors)

    # Extract image URLs
    for img in soup.find_all('img'):
        src = img.get('src') or img.get('data-src')
        if src and not src.startswith('data:'):
            full_url = src if src.startswith('http') else f"https://www.fruzaqlahcp.com{src}"
            alt = img.get('alt', '')
            results["images"].append({"url": full_url, "alt": alt})

    # Extract meaningful text blocks as potential claims
    for tag in soup.find_all(['h1', 'h2', 'h3', 'p', 'li']):
        text = tag.get_text(strip=True)
        if 30 < len(text) < 500 and any(kw in text.lower() for kw in [
            'fruzaqla', 'fruquintinib', 'survival', 'efficacy', 'safety',
            'colorectal', 'mcrc', 'indication', 'approved', 'patients'
        ]):
            results["claims"].append(text)

    # Extract key HTML sections as reusable components
    for section in soup.find_all(['section', 'header', 'div'], class_=True):
        classes = ' '.join(section.get('class', []))
        if any(kw in classes.lower() for kw in ['hero', 'banner', 'header', 'cta', 'feature']):
            component_html = str(section)
            if len(component_html) > 100:
                results["html_components"].append({
                    "classes": classes,
                    "html": component_html[:5000]  # truncate
                })

    # Store results in Brand DBs
    await _store_crawl_results(results, company_id, url, db)
    return results


async def _store_crawl_results(results: dict, company_id: str, source_url: str, db: DBSession):
    """Persist crawled assets to Brand Asset DB and Brand Writing DB."""

    # Store HTML components
    for component in results.get("html_components", []):
        asset = BrandAsset(
            id=str(uuid.uuid4()),
            company_id=company_id,
            asset_type='html_component',
            key=f"component_{component['classes'][:40].replace(' ', '_')}",
            value=component['html'],
            status='pending',
            source='crawler'
        )
        db.add(asset)

    # Store image references
    for img_data in results.get("images", [])[:20]:  # cap at 20
        existing = db.query(BrandAsset).filter(
            BrandAsset.company_id == company_id,
            BrandAsset.value == img_data['url']
        ).first()
        if not existing:
            asset = BrandAsset(
                id=str(uuid.uuid4()),
                company_id=company_id,
                asset_type='image',
                key=img_data.get('alt', img_data['url'].split('/')[-1])[:80],
                value=img_data['url'],
                status='pending',
                source='crawler'
            )
            db.add(asset)

    # Store potential claims (as pending — need human review)
    for claim_text in results.get("claims", []):
        existing = db.query(Claim).filter(
            Claim.company_id == company_id,
            Claim.claim_text == claim_text
        ).first()
        if not existing:
            claim = Claim(
                id=str(uuid.uuid4()),
                company_id=company_id,
                claim_text=claim_text,
                category='crawled',
                source_ref=f"Crawled from {source_url}",
                active=0  # inactive until reviewed
            )
            db.add(claim)

    db.commit()


# ─── Generator-Discriminator Loop ─────────────────────────────────────────────

async def raster_to_html(
    image_bytes: bytes,
    company_id: str,
    db: DBSession,
    max_iterations: int = 3,
) -> tuple[str, float]:
    """
    Convert a raster image to an HTML/CSS equivalent using generator-discriminator pattern.
    Returns (best_html, final_score).

    Generator: Claude vision generates HTML/CSS to match the image.
    Discriminator: Claude vision scores similarity between rendered HTML and original.
    """
    from services.brand_assets_service import get_brand_config

    brand_config = get_brand_config(company_id, db)
    image_b64 = base64.standard_b64encode(image_bytes).decode()

    best_html = ""
    best_score = 0.0
    feedback = ""

    for iteration in range(max_iterations):
        # Generator pass
        generator_prompt = f"""You are an expert HTML/CSS developer. Analyze this image and produce a pixel-accurate HTML/CSS recreation.

Requirements:
- Self-contained HTML with all CSS inline or in a <style> block
- Use brand colors: purple #8C4799, blue #59CBE8, navy #002855, lime #97D700, yellow #FFC72C
- Use Rubik font (Google Fonts) for display text, Arial for body
- No external image URLs — recreate visual elements with CSS gradients, shapes, and text
- Target width: 600px
- Match the layout, typography hierarchy, color usage, and visual weight as closely as possible

{f'Previous attempt feedback from discriminator: {feedback}' if feedback else 'This is your first attempt.'}

Return ONLY valid HTML starting with <!DOCTYPE html>."""

        gen_response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8096,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": image_b64,
                        },
                    },
                    {"type": "text", "text": generator_prompt},
                ],
            }],
        )

        candidate_html = gen_response.content[0].text.strip()
        if candidate_html.startswith("```"):
            candidate_html = re.sub(r'^```\w*\n?', '', candidate_html)
            candidate_html = re.sub(r'\n?```$', '', candidate_html)

        # Discriminator pass — compare original image with candidate HTML description
        discriminator_prompt = f"""You are a visual quality discriminator. Compare the original image with this HTML/CSS code that attempts to recreate it.

HTML to evaluate:
{candidate_html[:3000]}

Rate the visual similarity on a scale of 0-100 where:
- 90-100: Nearly identical visual appearance
- 70-89: Similar layout and colors, minor differences
- 50-69: Recognizable similarity but notable differences
- 0-49: Poor match

Respond with ONLY a JSON object:
{{"score": <number>, "feedback": "<specific differences to fix in next iteration>"}}"""

        disc_response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": image_b64,
                        },
                    },
                    {"type": "text", "text": discriminator_prompt},
                ],
            }],
        )

        try:
            result = json.loads(disc_response.content[0].text.strip())
            score = float(result.get("score", 0))
            feedback = result.get("feedback", "")
        except (json.JSONDecodeError, ValueError):
            score = 50.0
            feedback = "Could not parse discriminator response, try again"

        if score > best_score:
            best_score = score
            best_html = candidate_html

        if score >= 85:
            break

    return best_html, best_score


# ─── Scheduled Crawl ──────────────────────────────────────────────────────────

async def run_scheduled_crawl():
    """Called by APScheduler. Crawls FRUZAQLA website for all companies using it."""
    from database import SessionLocal

    db = SessionLocal()
    try:
        company = db.query(Company).filter(Company.slug == 'fruzaqla').first()
        if company:
            await crawl_url("https://www.fruzaqlahcp.com/", company.id, db)
            await crawl_url("https://www.fruzaqlahcp.com/efficacy", company.id, db)
            await crawl_url("https://www.fruzaqlahcp.com/safety", company.id, db)
            await crawl_url("https://www.fruzaqlahcp.com/dosing", company.id, db)
    finally:
        db.close()


# ─── Main Entry Point ─────────────────────────────────────────────────────────

async def collect(
    url: str | None,
    file_bytes: bytes | None,
    file_name: str | None,
    company_id: str,
    db: DBSession | None = None,
    user_id: str | None = None,
) -> dict:
    """
    Main entry point called by the brand_collection router (via background task).

    ``db`` is optional: when the router calls this via BackgroundTasks it does not
    inject a session, so we open one ourselves using SessionLocal.
    """
    from database import SessionLocal

    _owns_session = db is None
    if _owns_session:
        db = SessionLocal()

    try:
        results = {}

        if url:
            results["crawl"] = await crawl_url(url, company_id, db)

        if file_bytes and file_name:
            ext = file_name.lower().split('.')[-1] if file_name else ''
            if ext in ('png', 'jpg', 'jpeg', 'webp'):
                html, score = await raster_to_html(file_bytes, company_id, db)
                asset = BrandAsset(
                    id=str(uuid.uuid4()),
                    company_id=company_id,
                    asset_type='html_component',
                    key=f"generated_{file_name}",
                    value=html,
                    status='pending',
                    source='admin_upload',
                    submitted_by=user_id,
                )
                db.add(asset)
                db.commit()
                results["generated_html"] = {"score": score, "asset_id": asset.id}

        return results
    finally:
        if _owns_session:
            db.close()
