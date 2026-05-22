import asyncio
import datetime
import json
import uuid

from sqlalchemy.orm import Session as DBSession

import models as _models
from models import Session as ChatSession, Message, Asset, AssetVersion, User
from services.brand_wording_service import get_claims_for_company, format_claims_context
from services.asset_creation_service import generate_asset
from services.mandatory_checks_service import run_checks
from prompts.chat_system import get_chat_system_prompt
from prompts.edit_mode import get_edit_mode_prompt

CLAUDE_BIN = "/Users/isaacmartin/.local/bin/claude"


async def _run_claude(prompt: str, system_prompt: str, stream: bool = False):
    """
    Run claude CLI subprocess. If stream=True, yields text deltas as they arrive.
    If stream=False, returns the full response string.
    """
    cmd = [
        CLAUDE_BIN, "-p",
        "--model", "sonnet",
        "--tools", "",
        "--system-prompt", system_prompt,
        "--output-format", "stream-json" if stream else "json",
        "--verbose",
    ]
    if stream:
        cmd.append("--include-partial-messages")

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
    )
    proc.stdin.write(prompt.encode())
    await proc.stdin.drain()
    proc.stdin.close()

    return proc


def _format_history(history: list, current_message: str) -> str:
    """Format conversation history + current message as a single prompt string."""
    if not history:
        return current_message

    lines = ["<conversation_history>"]
    for msg in history:
        role = "User" if msg["role"] == "user" else "Assistant"
        lines.append(f"{role}: {msg['content']}")
    lines.append("</conversation_history>")
    lines.append("")
    lines.append(current_message)
    return "\n".join(lines)


async def stream_chat(session_id: str, user_content: str, upload_ids: list[str], db: DBSession):
    """Async generator that yields SSE-formatted data strings."""

    # 1. Load session + user context
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    user = db.query(User).filter(User.id == session.user_id).first()
    company_id = user.company_id

    # 2. Check if session has an existing asset (edit mode)
    existing_asset = (
        db.query(Asset)
        .filter(Asset.session_id == session_id)
        .order_by(Asset.created_at.desc())
        .first()
    )
    is_edit_mode = existing_asset is not None and existing_asset.html_content is not None

    # 3. Build message history
    history = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at)
        .all()
    )
    messages = [{"role": m.role, "content": m.content} for m in history]

    # 4. Persist user message
    user_msg = Message(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="user",
        content=user_content,
    )
    db.add(user_msg)
    db.commit()

    # ------------------------------------------------------------------
    # EDIT MODE — single call, then compliance check
    # ------------------------------------------------------------------
    if is_edit_mode:
        edit_prompt = get_edit_mode_prompt(existing_asset.html_content, user_content)
        system = "You are an HTML email editor. Return only the updated complete HTML."

        proc = await _run_claude(edit_prompt, system, stream=False)
        stdout, _ = await proc.communicate()

        new_html = ""
        try:
            result = json.loads(stdout.decode())
            new_html = result.get("result", "").strip()
        except Exception:
            new_html = stdout.decode().strip()

        # Fallback: if response isn't HTML, keep original
        if not new_html.startswith("<!DOCTYPE") and not new_html.startswith("<html"):
            new_html = existing_asset.html_content

        existing_asset.html_content = new_html
        existing_asset.version += 1
        existing_asset.updated_at = datetime.datetime.utcnow()

        version = AssetVersion(
            id=str(uuid.uuid4()),
            asset_id=existing_asset.id,
            html_content=new_html,
            version=existing_asset.version,
            source="ai_edit",
        )
        db.add(version)

        assist_msg = Message(
            id=str(uuid.uuid4()),
            session_id=session_id,
            role="assistant",
            content="I've updated the asset based on your request.",
        )
        db.add(assist_msg)
        db.commit()

        yield f"data: {json.dumps({'type': 'asset_updated', 'asset_id': existing_asset.id, 'html': new_html})}\n\n"

        compliance_result = await run_checks(existing_asset.id, db)
        yield f"data: {json.dumps({'type': 'compliance_result', 'checks': [c.model_dump() for c in compliance_result.checks], 'overall': compliance_result.overall})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'message_id': assist_msg.id})}\n\n"
        return

    # ------------------------------------------------------------------
    # GATHERING MODE — stream conversational response
    # ------------------------------------------------------------------
    claims = get_claims_for_company(company_id, db)
    claims_context = format_claims_context(claims)
    system_prompt = get_chat_system_prompt(claims_context)
    full_prompt = _format_history(messages, user_content)

    proc = await _run_claude(full_prompt, system_prompt, stream=True)

    full_response = ""
    async for raw_line in proc.stdout:
        line = raw_line.decode().strip()
        if not line:
            continue
        try:
            event = json.loads(line)
            if event.get("type") == "stream_event":
                inner = event.get("event", {})
                if inner.get("type") == "content_block_delta":
                    delta = inner.get("delta", {})
                    if delta.get("type") == "text_delta":
                        text = delta.get("text", "")
                        full_response += text
                        yield f"data: {json.dumps({'type': 'text_delta', 'delta': text})}\n\n"
        except json.JSONDecodeError:
            continue

    await proc.wait()

    # 7. Detect READY_TO_GENERATE and kick off asset creation
    if "READY_TO_GENERATE:" in full_response:
        summary_lines = [l for l in full_response.split("\n") if "READY_TO_GENERATE:" in l]
        requirements_summary = (
            summary_lines[0].split("READY_TO_GENERATE:")[1].strip()
            if summary_lines
            else user_content
        )

        asset_id, html = await generate_asset(session_id, requirements_summary, db)
        yield f"data: {json.dumps({'type': 'asset_created', 'asset_id': asset_id, 'html': html})}\n\n"

        compliance_result = await run_checks(asset_id, db)
        yield f"data: {json.dumps({'type': 'compliance_result', 'checks': [c.model_dump() for c in compliance_result.checks], 'overall': compliance_result.overall})}\n\n"

    # 8. Persist assistant message and update session title
    assist_msg = Message(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="assistant",
        content=full_response,
    )
    db.add(assist_msg)

    if len(history) == 0:
        session.title = user_content[:50] + ("..." if len(user_content) > 50 else "")
    session.updated_at = datetime.datetime.utcnow()
    db.commit()

    yield f"data: {json.dumps({'type': 'done', 'message_id': assist_msg.id})}\n\n"
