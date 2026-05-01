import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.message import MessageStatus, ScheduledMessage
from ..routes.deps import get_current_user
from ..schemas.message import MessageList, MessageResponse
from ..services.scheduler import get_credentials, _dispatch

router = APIRouter(prefix="/messages", tags=["messages"])
SP_TZ = ZoneInfo("America/Sao_Paulo")
_SOFT_DELETE_TTL = timedelta(hours=24)


@router.get("/", response_model=MessageList)
async def list_messages(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(ScheduledMessage).order_by(ScheduledMessage.scheduled_at)
    )
    messages = result.scalars().all()
    # Filtra mensagens soft-deleted com TTL expirado e remove fisicamente
    visible = []
    to_purge = []
    for m in messages:
        if m.deleted_at is not None:
            if now - m.deleted_at > _SOFT_DELETE_TTL:
                to_purge.append(m)
            else:
                visible.append(m)
        else:
            visible.append(m)
    for m in to_purge:
        await db.delete(m)
    if to_purge:
        await db.commit()
    return MessageList(messages=[MessageResponse.model_validate(m) for m in visible])


@router.post("/", status_code=201)
async def create_message(
    message_type: str = Form(...),
    text: Optional[str] = Form(None),
    parse_mode: str = Form("HTML"),
    inline_keyboard: Optional[str] = Form(None),
    poll_data: Optional[str] = Form(None),
    disable_web_page_preview: bool = Form(False),
    scheduled_at: str = Form(...),
    media: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    try:
        scheduled_dt = datetime.fromisoformat(scheduled_at).replace(tzinfo=SP_TZ)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data inválido. Use ISO 8601.")

    if scheduled_dt <= datetime.now(SP_TZ):
        raise HTTPException(status_code=400, detail="A data de envio deve ser no futuro.")

    media_bytes: Optional[bytes] = None
    media_filename: Optional[str] = None
    media_mime_type: Optional[str] = None
    if media and media.filename:
        media_bytes = await media.read()
        media_filename = media.filename
        media_mime_type = media.content_type

    msg = ScheduledMessage(
        message_type=message_type,
        text=text,
        parse_mode=parse_mode,
        media=media_bytes,
        media_filename=media_filename,
        media_mime_type=media_mime_type,
        inline_keyboard=json.loads(inline_keyboard) if inline_keyboard else None,
        poll_data=json.loads(poll_data) if poll_data else None,
        disable_web_page_preview=disable_web_page_preview,
        scheduled_at=scheduled_dt,
        status=MessageStatus.pending,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return {"id": str(msg.id), "scheduled_at": msg.scheduled_at.isoformat()}


@router.put("/{message_id}", status_code=200)
async def update_message(
    message_id: uuid.UUID,
    message_type: str = Form(...),
    text: Optional[str] = Form(None),
    parse_mode: str = Form("HTML"),
    inline_keyboard: Optional[str] = Form(None),
    poll_data: Optional[str] = Form(None),
    disable_web_page_preview: bool = Form(False),
    scheduled_at: str = Form(...),
    clear_media: bool = Form(False),
    media: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(ScheduledMessage).where(ScheduledMessage.id == message_id)
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Mensagem não encontrada")
    if msg.status not in (MessageStatus.pending, MessageStatus.failed):
        raise HTTPException(status_code=409, detail="Só é possível editar mensagens pendentes ou com falha.")

    try:
        scheduled_dt = datetime.fromisoformat(scheduled_at).replace(tzinfo=SP_TZ)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data inválido.")

    if scheduled_dt <= datetime.now(SP_TZ):
        raise HTTPException(status_code=400, detail="A data de envio deve ser no futuro.")

    msg.message_type = message_type
    msg.text = text
    msg.parse_mode = parse_mode
    msg.inline_keyboard = json.loads(inline_keyboard) if inline_keyboard else None
    msg.poll_data = json.loads(poll_data) if poll_data else None
    msg.disable_web_page_preview = disable_web_page_preview
    msg.scheduled_at = scheduled_dt
    msg.status = MessageStatus.pending
    msg.error_message = None

    if clear_media:
        msg.media = None
        msg.media_filename = None
        msg.media_mime_type = None
    elif media and media.filename:
        msg.media = await media.read()
        msg.media_filename = media.filename
        msg.media_mime_type = media.content_type

    await db.commit()
    await db.refresh(msg)
    return {"id": str(msg.id), "scheduled_at": msg.scheduled_at.isoformat()}


@router.delete("/{message_id}")
async def delete_message(
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(ScheduledMessage).where(ScheduledMessage.id == message_id)
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Mensagem não encontrada")

    # Soft delete: mensagens pendentes ficam 24h visíveis para "Repetir envio"
    if msg.status == MessageStatus.pending and msg.deleted_at is None:
        msg.deleted_at = datetime.now(timezone.utc)
        await db.commit()
    else:
        await db.delete(msg)
        await db.commit()
    return {"detail": "Removida"}


@router.post("/{message_id}/send-now")
async def send_now(
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(ScheduledMessage).where(ScheduledMessage.id == message_id)
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Mensagem não encontrada")

    token, chat_id = await get_credentials(db)
    if not token or not chat_id:
        raise HTTPException(status_code=400, detail="Bot não configurado. Acesse Configurações.")

    try:
        await _dispatch(msg, token, chat_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    await db.delete(msg)
    await db.commit()
    return {"detail": "Enviada com sucesso"}
