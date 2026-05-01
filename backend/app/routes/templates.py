import json
import uuid
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.message import MessageTemplate, ScheduledMessage, MessageStatus
from ..routes.deps import get_current_user
from ..schemas.template import TemplateList, TemplateResponse

router = APIRouter(prefix="/templates", tags=["templates"])
SP_TZ = ZoneInfo("America/Sao_Paulo")


@router.get("/", response_model=TemplateList)
async def list_templates(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(MessageTemplate).order_by(MessageTemplate.created_at.desc())
    )
    templates = result.scalars().all()
    return TemplateList(templates=[TemplateResponse.model_validate(t) for t in templates])


@router.post("/", status_code=201)
async def create_template(
    name: str = Form(...),
    message_type: str = Form(...),
    text: Optional[str] = Form(None),
    parse_mode: str = Form("HTML"),
    inline_keyboard: Optional[str] = Form(None),
    poll_data: Optional[str] = Form(None),
    disable_web_page_preview: bool = Form(False),
    recurrence_minutes: Optional[int] = Form(None),
    next_send_at: Optional[str] = Form(None),
    recurrence_end_at: Optional[str] = Form(None),
    media: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    media_bytes: Optional[bytes] = None
    media_filename: Optional[str] = None
    media_mime_type: Optional[str] = None
    if media and media.filename:
        media_bytes = await media.read()
        media_filename = media.filename
        media_mime_type = media.content_type

    next_send_dt: Optional[datetime] = None
    if next_send_at:
        try:
            next_send_dt = datetime.fromisoformat(next_send_at).replace(tzinfo=SP_TZ)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido para next_send_at.")

    end_dt: Optional[datetime] = None
    if recurrence_end_at:
        try:
            end_dt = datetime.fromisoformat(recurrence_end_at).replace(tzinfo=SP_TZ)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido para recurrence_end_at.")

    tmpl = MessageTemplate(
        name=name,
        message_type=message_type,
        text=text,
        parse_mode=parse_mode,
        media=media_bytes,
        media_filename=media_filename,
        media_mime_type=media_mime_type,
        inline_keyboard=json.loads(inline_keyboard) if inline_keyboard else None,
        poll_data=json.loads(poll_data) if poll_data else None,
        disable_web_page_preview=disable_web_page_preview,
        recurrence_minutes=recurrence_minutes if recurrence_minutes and recurrence_minutes > 0 else None,
        next_send_at=next_send_dt,
        recurrence_end_at=end_dt,
    )
    db.add(tmpl)
    await db.commit()
    await db.refresh(tmpl)
    return {"id": str(tmpl.id)}


@router.put("/{template_id}", status_code=200)
async def update_template(
    template_id: uuid.UUID,
    name: str = Form(...),
    message_type: str = Form(...),
    text: Optional[str] = Form(None),
    parse_mode: str = Form("HTML"),
    inline_keyboard: Optional[str] = Form(None),
    poll_data: Optional[str] = Form(None),
    disable_web_page_preview: bool = Form(False),
    recurrence_minutes: Optional[int] = Form(None),
    next_send_at: Optional[str] = Form(None),
    recurrence_end_at: Optional[str] = Form(None),
    clear_media: bool = Form(False),
    media: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(MessageTemplate).where(MessageTemplate.id == template_id)
    )
    tmpl = result.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template não encontrado")

    tmpl.name = name
    tmpl.message_type = message_type
    tmpl.text = text
    tmpl.parse_mode = parse_mode
    tmpl.inline_keyboard = json.loads(inline_keyboard) if inline_keyboard else None
    tmpl.poll_data = json.loads(poll_data) if poll_data else None
    tmpl.disable_web_page_preview = disable_web_page_preview
    tmpl.recurrence_minutes = recurrence_minutes if recurrence_minutes and recurrence_minutes > 0 else None

    if next_send_at:
        try:
            tmpl.next_send_at = datetime.fromisoformat(next_send_at).replace(tzinfo=SP_TZ)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido para next_send_at.")
    else:
        tmpl.next_send_at = None

    if recurrence_end_at:
        try:
            tmpl.recurrence_end_at = datetime.fromisoformat(recurrence_end_at).replace(tzinfo=SP_TZ)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido para recurrence_end_at.")
    else:
        tmpl.recurrence_end_at = None

    if clear_media:
        tmpl.media = None
        tmpl.media_filename = None
        tmpl.media_mime_type = None
    elif media and media.filename:
        tmpl.media = await media.read()
        tmpl.media_filename = media.filename
        tmpl.media_mime_type = media.content_type

    await db.commit()
    await db.refresh(tmpl)
    return {"id": str(tmpl.id)}


@router.delete("/{template_id}")
async def delete_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(MessageTemplate).where(MessageTemplate.id == template_id)
    )
    tmpl = result.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    await db.delete(tmpl)
    await db.commit()
    return {"detail": "Removido"}


@router.post("/{template_id}/schedule")
async def schedule_from_template(
    template_id: uuid.UUID,
    scheduled_at: str = Form(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Cria uma mensagem agendada a partir de um template."""
    result = await db.execute(
        select(MessageTemplate).where(MessageTemplate.id == template_id)
    )
    tmpl = result.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template não encontrado")

    try:
        scheduled_dt = datetime.fromisoformat(scheduled_at).replace(tzinfo=SP_TZ)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data inválido.")

    if scheduled_dt <= datetime.now(SP_TZ):
        raise HTTPException(status_code=400, detail="A data de envio deve ser no futuro.")

    msg = ScheduledMessage(
        message_type=tmpl.message_type,
        text=tmpl.text,
        parse_mode=tmpl.parse_mode,
        media=tmpl.media,
        media_filename=tmpl.media_filename,
        media_mime_type=tmpl.media_mime_type,
        inline_keyboard=tmpl.inline_keyboard,
        poll_data=tmpl.poll_data,
        disable_web_page_preview=tmpl.disable_web_page_preview,
        scheduled_at=scheduled_dt,
        status=MessageStatus.pending,
        template_id=tmpl.id,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return {"id": str(msg.id), "scheduled_at": msg.scheduled_at.isoformat()}
