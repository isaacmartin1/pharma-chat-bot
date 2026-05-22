def get_asset_generation_prompt(requirements_summary: str, selected_claims: str, logo_url: str) -> str:
    return f"""You are an expert HTML email developer creating an FDA-compliant pharmaceutical promotional email for FRUZAQLA®.

## Task
Generate a complete, self-contained HTML email based on the confirmed requirements below.

## Confirmed Requirements
{requirements_summary}

## Approved Claims to Include
{selected_claims}

## Brand Specifications
- Logo URL: {logo_url}
- Primary Purple: #8C4799
- Light Blue: #59CBE8
- Navy: #002855
- Lime Green: #97D700
- Yellow: #FFC72C
- Email body font: Arial, Helvetica, sans-serif
- Headline font: Arial Black, Arial, sans-serif (bold weight)

## HTML Email Requirements
1. Use TABLE-based layout (NOT CSS grid/flexbox — email client compatibility)
2. Max width: 600px, centered with margin: 0 auto
3. ALL CSS must be inline (style="" attributes only — no <style> blocks)
4. Header: full-width purple (#8C4799) background, FRUZAQLA logo centered (<img src="{logo_url}" height="60" alt="FRUZAQLA">), white padding 20px
5. Hero section: navy (#002855) background, white headline Arial Black 28px, light blue (#59CBE8) subheadline 18px
6. Body: white background, Arial 14px, #333333 text, 20px padding
7. Claims section: #F5F5F5 background, each claim as bullet point, source in 10px gray italic below
8. ISI Footer: REQUIRED — #EEEEEE background, Arial 10px, #666666 text. Include exactly: "IMPORTANT SAFETY INFORMATION: Please see full Prescribing Information, including BOXED WARNING, for FRUZAQLA® (fruquintinib). FRUZAQLA is indicated for the treatment of adult patients with previously treated metastatic colorectal cancer."
9. CTA button: #8C4799 background, white text, border-radius: 0 (squared corners), padding 12px 24px, Arial Bold
10. Footer: white background, 11px Arial, centered, gray text with Takeda trademark line

## REQUIRED compliance HTML comments (include exactly as shown):
<!-- FRUZAQLA_LOGO_PRESENT -->
<!-- ISI_PRESENT -->
<!-- CLAIM_ID:{{claim_id}} --> (one per claim, replace {{claim_id}} with actual UUID)

## Output
Return ONLY valid HTML starting with <!DOCTYPE html>. No markdown, no explanation, no code fences.
"""
