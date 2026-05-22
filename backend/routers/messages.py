import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Session as ChatSession, User
from schemas import MessageCreate

router = APIRouter(prefix="/sessions", tags=["messages"])

# Lazy import of chat_service so the app starts even if the service is missing
def _get_chat_service():
    try:
        from services.chat_service import stream_chat
        return stream_chat
    except ImportError:
        return None


@router.post("/{session_id}/messages")
async def send_message(
    session_id: str,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    stream_chat = _get_chat_service()

    async def event_stream():
        if stream_chat is None:
            # Fallback stub when service not yet implemented
            error_event = json.dumps({"type": "error", "content": "chat_service not available"})
            yield f"data: {error_event}\n\n"
            return

        try:
            async for chunk in stream_chat(
                session_id=session_id,
                user_id=current_user.id,
                content=payload.content,
                upload_ids=payload.upload_ids,
                db=db,
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as exc:
            error_event = json.dumps({"type": "error", "content": str(exc)})
            yield f"data: {error_event}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
