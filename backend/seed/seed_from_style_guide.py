"""
seed_from_style_guide.py

Processes the FRUZAQLA brand style guide PDF and seeds extracted brand tokens
into the brand_assets table. At runtime, calls Claude vision to analyze each page
of the PDF. Falls back to hardcoded known brand colors/fonts if the PDF is not
found or ANTHROPIC_API_KEY is unavailable.

Generator-Discriminator pattern is used for key visual pages (color palettes,
logo treatments, typography showcases) to iteratively refine extracted HTML/CSS
components to match the original page content.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import re

from dotenv import load_dotenv
from sqlalchemy.orm import Session

load_dotenv()

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Hardcoded fallback brand tokens (known from the website)
# ---------------------------------------------------------------------------

STYLE_GUIDE_ASSETS: list[dict] = [
    # Colors
    {"asset_type": "color_palette", "key": "color_primary",   "value": "#8C4799"},
    {"asset_type": "color_palette", "key": "color_secondary",  "value": "#59CBE8"},
    {"asset_type": "color_palette", "key": "color_navy",       "value": "#002855"},
    {"asset_type": "color_palette", "key": "color_lime",       "value": "#97D700"},
    {"asset_type": "color_palette", "key": "color_yellow",     "value": "#FFC72C"},
    # Fonts
    {"asset_type": "font_rule",     "key": "email_body_font",  "value": "Arial, Helvetica, sans-serif"},
]

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

PDF_PATH = "/Users/isaacmartin/Desktop/Onsite_Interview/FRUZAQLAStyleGuideNov2023.pdf"
STYLE_GUIDE_OUTPUT_DIR = os.path.join(
    os.path.dirname(__file__), "..", "static", "brand", "style_guide"
)

# ---------------------------------------------------------------------------
# Vision extraction helpers
# ---------------------------------------------------------------------------

_EXTRACTION_PROMPT = (
    "You are analyzing a pharmaceutical brand style guide page. "
    "Extract all brand design tokens visible: hex color codes, font names and usage rules, "
    "logo specifications, spacing rules, and any explicit brand guidelines. "
    "Return a JSON object with keys: "
    "colors (array of {name, hex}), "
    "fonts (array of {name, usage}), "
    "rules (array of strings), "
    "logos (array of {description, usage})."
)

_COMPONENT_PROMPT = (
    "You are a frontend developer replicating a pharmaceutical brand style guide page. "
    "Generate a self-contained HTML/CSS component (no external dependencies) that visually "
    "replicates this page as closely as possible, including color swatches with hex labels, "
    "typography samples with font names, and any logo/brand treatments shown. "
    "Return ONLY the raw HTML string, starting with <div or <section."
)

_DISCRIMINATOR_PROMPT_TPL = (
    "You are a design QA reviewer. "
    "Compare the original style guide page image with the following HTML/CSS component. "
    "Score visual similarity from 0 to 100 (100 = pixel-perfect). "
    "Return a JSON object: {{\"score\": N, \"feedback\": \"...\"}}\n\n"
    "HTML Component:\n```html\n{html}\n```"
)

_KEY_PAGE_KEYWORDS = (
    "color", "colour", "palette", "pantone", "cmyk", "rgb", "hex",
    "font", "typeface", "typography", "logo", "brand mark", "treatment",
)


def _is_key_visual_page(text: str) -> bool:
    """Return True if the page text suggests a key visual page."""
    lower = text.lower()
    return any(kw in lower for kw in _KEY_PAGE_KEYWORDS)


def _encode_image(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def _call_claude_vision(client, image_path: str, prompt: str, max_tokens: int = 2048) -> str:
    """Call Claude with a single vision message and return the text response."""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": _encode_image(image_path),
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    )
    for block in response.content:
        if block.type == "text":
            return block.text
    return ""


def _extract_json_from_text(text: str) -> dict:
    """Try to parse JSON from model output, stripping markdown fences if present."""
    text = text.strip()
    # Strip ```json ... ``` fences
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if match:
        text = match.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {}


# ---------------------------------------------------------------------------
# Generator-Discriminator loop
# ---------------------------------------------------------------------------

def _generator_discriminator(client, image_path: str, max_iterations: int = 3) -> str:
    """
    Generate an HTML component replicating the image page, then iteratively
    improve it with discriminator feedback. Returns the best HTML or empty string.
    """
    html = _call_claude_vision(client, image_path, _COMPONENT_PROMPT, max_tokens=4096)
    if not html:
        return ""

    for iteration in range(max_iterations):
        # Discriminator: score the current HTML
        disc_prompt = _DISCRIMINATOR_PROMPT_TPL.format(html=html[:6000])  # cap to avoid token explosion
        disc_text = _call_claude_vision(client, image_path, disc_prompt, max_tokens=512)
        disc_data = _extract_json_from_text(disc_text)

        score = disc_data.get("score", 0)
        feedback = disc_data.get("feedback", "")
        log.info(
            "[style_guide] Gen-Disc iteration %d/%d: score=%s feedback=%s",
            iteration + 1, max_iterations, score, feedback[:120],
        )

        if score >= 85:
            log.info("[style_guide] Gen-Disc score >= 85, accepting HTML.")
            break

        if iteration < max_iterations - 1 and feedback:
            # Regenerate with feedback
            regen_prompt = (
                f"{_COMPONENT_PROMPT}\n\n"
                f"Previous attempt was scored {score}/100 with this feedback:\n{feedback}\n\n"
                "Please improve the component based on this feedback."
            )
            html = _call_claude_vision(client, image_path, regen_prompt, max_tokens=4096)

    return html


# ---------------------------------------------------------------------------
# PDF processing
# ---------------------------------------------------------------------------

def _process_pdf(client) -> list[dict]:
    """
    Open the PDF, render each page to PNG, call Claude vision to extract brand
    tokens, and run the generator-discriminator on key visual pages.

    Returns a list of asset dicts: {asset_type, key, value, file_path?}
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        log.warning("[style_guide] PyMuPDF not installed. Falling back to hardcoded assets.")
        return []

    if not os.path.exists(PDF_PATH):
        log.warning("[style_guide] PDF not found at %s. Using fallback assets.", PDF_PATH)
        return []

    os.makedirs(STYLE_GUIDE_OUTPUT_DIR, exist_ok=True)

    assets: list[dict] = []
    seen_color_keys: set[str] = set()
    seen_font_keys: set[str] = set()

    doc = fitz.open(PDF_PATH)
    total_pages = len(doc)
    log.info("[style_guide] PDF has %d pages.", total_pages)

    for page_num in range(total_pages):
        page = doc[page_num]
        page_text = page.get_text()

        # Render page to PNG at 150 DPI
        matrix = fitz.Matrix(150 / 72, 150 / 72)
        pix = page.get_pixmap(matrix=matrix)
        png_path = os.path.join(STYLE_GUIDE_OUTPUT_DIR, f"page_{page_num + 1}.png")
        pix.save(png_path)
        log.info("[style_guide] Rendered page %d -> %s", page_num + 1, png_path)

        # Extract brand tokens via Claude vision
        try:
            extraction_text = _call_claude_vision(client, png_path, _EXTRACTION_PROMPT)
            extracted = _extract_json_from_text(extraction_text)
        except Exception as exc:
            log.warning("[style_guide] Vision extraction failed for page %d: %s", page_num + 1, exc)
            extracted = {}

        # Process extracted colors
        for color in extracted.get("colors", []):
            hex_val = color.get("hex", "").strip()
            name = color.get("name", "").strip()
            if not hex_val or not re.match(r"^#[0-9A-Fa-f]{3,8}$", hex_val):
                continue
            # Build a normalised key
            key = re.sub(r"[^a-z0-9_]", "_", name.lower()).strip("_") or f"color_page{page_num + 1}"
            if key in seen_color_keys:
                key = f"{key}_p{page_num + 1}"
            seen_color_keys.add(key)
            assets.append({
                "asset_type": "color_palette",
                "key": key,
                "value": hex_val.upper(),
                "file_path": png_path,
            })

        # Process extracted fonts
        for font in extracted.get("fonts", []):
            fname = font.get("name", "").strip()
            usage = font.get("usage", "").strip()
            if not fname:
                continue
            key = re.sub(r"[^a-z0-9_]", "_", fname.lower()).strip("_") or f"font_page{page_num + 1}"
            if key in seen_font_keys:
                key = f"{key}_p{page_num + 1}"
            seen_font_keys.add(key)
            value = f"{fname}" + (f" — {usage}" if usage else "")
            assets.append({
                "asset_type": "font_rule",
                "key": key,
                "value": value,
                "file_path": png_path,
            })

        # Process extracted rules
        for i, rule in enumerate(extracted.get("rules", [])[:10]):  # cap at 10 per page
            if not rule:
                continue
            assets.append({
                "asset_type": "image",  # closest available type for layout/brand rules
                "key": f"brand_rule_p{page_num + 1}_{i + 1}",
                "value": rule[:500],
                "file_path": png_path,
            })

        # Process extracted logo descriptions
        for i, logo in enumerate(extracted.get("logos", [])[:5]):
            desc = logo.get("description", "").strip()
            usage = logo.get("usage", "").strip()
            if not desc:
                continue
            assets.append({
                "asset_type": "logo",
                "key": f"logo_p{page_num + 1}_{i + 1}",
                "value": desc + (f" — {usage}" if usage else ""),
                "file_path": png_path,
            })

        # Generator-Discriminator for key visual pages
        if _is_key_visual_page(page_text) or bool(extracted.get("colors")):
            log.info("[style_guide] Running Gen-Disc on key visual page %d.", page_num + 1)
            try:
                html_component = _generator_discriminator(client, png_path)
                if html_component:
                    html_path = os.path.join(
                        STYLE_GUIDE_OUTPUT_DIR, f"component_page_{page_num + 1}.html"
                    )
                    with open(html_path, "w", encoding="utf-8") as hf:
                        hf.write(html_component)
                    log.info("[style_guide] Saved HTML component to %s", html_path)
            except Exception as exc:
                log.warning("[style_guide] Gen-Disc failed for page %d: %s", page_num + 1, exc)

    doc.close()
    return assets


# ---------------------------------------------------------------------------
# Public seeder
# ---------------------------------------------------------------------------

def run(db: Session) -> None:
    """
    Seed brand assets extracted from the FRUZAQLA style guide PDF into the
    brand_assets table.  Idempotent: skips any key that already exists for
    the company.
    """
    from models import BrandAsset, Company  # local import to avoid circular deps at module load

    company = db.query(Company).filter(Company.slug == "fruzaqla").first()
    if not company:
        log.warning("[style_guide] Company 'fruzaqla' not found. Skipping style guide seed.")
        return

    # Check if style-guide assets have already been seeded
    existing_keys = {
        row.key
        for row in db.query(BrandAsset.key).filter(
            BrandAsset.company_id == company.id,
            BrandAsset.source == "admin_upload",
        ).all()
    }

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    pdf_exists = os.path.exists(PDF_PATH)
    client = None

    if api_key and api_key not in ("your_key_here", ""):
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
        except Exception as exc:
            log.warning("[style_guide] Could not create Anthropic client: %s", exc)

    # Try to process the PDF at runtime
    pdf_assets: list[dict] = []
    if client and pdf_exists:
        try:
            log.info("[style_guide] Processing PDF with Claude vision...")
            pdf_assets = _process_pdf(client)
            log.info("[style_guide] Extracted %d assets from PDF.", len(pdf_assets))
        except Exception as exc:
            log.warning("[style_guide] PDF processing failed: %s. Using fallback assets.", exc)
            pdf_assets = []
    elif not pdf_exists:
        log.warning("[style_guide] PDF not found at %s. Using fallback assets.", PDF_PATH)
    elif not client:
        log.warning("[style_guide] No Anthropic API key available. Using fallback assets.")

    # Merge: use PDF-extracted assets, then fill in any missing fallback keys
    all_assets = list(pdf_assets)
    pdf_keys = {a["key"] for a in pdf_assets}
    for fallback in STYLE_GUIDE_ASSETS:
        if fallback["key"] not in pdf_keys:
            all_assets.append(fallback)

    # Deduplicate and insert
    inserted = 0
    for asset_dict in all_assets:
        key = asset_dict["key"]
        if key in existing_keys:
            continue  # already present — skip
        db.add(
            BrandAsset(
                company_id=company.id,
                asset_type=asset_dict["asset_type"],
                key=key,
                value=asset_dict["value"],
                file_path=asset_dict.get("file_path"),
                status="approved",
                source="admin_upload",
            )
        )
        existing_keys.add(key)
        inserted += 1

    if inserted:
        db.commit()
        log.info("[style_guide] Seeded %d brand asset(s) from style guide.", inserted)
    else:
        log.info("[style_guide] No new style guide assets to seed.")
