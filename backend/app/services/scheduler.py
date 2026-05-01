import asyncio
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import AsyncSessionLocal
from ..models.message import MessageTemplate, ScheduledMessage, MessageStatus
from ..models.bot_settings import BotSettings
from ..services.encryption import decrypt
from ..services import telegram as tg
from ..services.telegram import normalize_bot_token
from ..config import settings

logger = logging.getLogger(__name__)
SP_TZ = ZoneInfo("America/Sao_Paulo")
_SETTINGS_ID = 1


async def get_credentials(session: AsyncSession) -> tuple[str, str]:
    s = await session.get(BotSettings, _SETTINGS_ID)
    if s and s.bot_token_encrypted:
        token = normalize_bot_token(decrypt(s.bot_token_encrypted))
        chat_id = decrypt(s.chat_id_encrypted) if s.chat_id_encrypted else ""
        return token, chat_id
    return normalize_bot_token(settings.telegram_bot_token), settings.telegram_chat_id


async def _dispatch(msg: ScheduledMessage | MessageTemplate, token: str, chat_id: str) -> None:
    t = msg.message_type
    kb = msg.inline_keyboard
    mime = msg.media_mime_type or "application/octet-stream"
    fn = msg.media_filename or "file"

    if t == "text":
        await tg.send_text(token, chat_id, msg.text or "", msg.parse_mode, kb, msg.disable_web_page_preview)
    elif t == "photo":
        await tg.send_photo(token, chat_id, msg.media, fn, mime, msg.text, msg.parse_mode, kb)
    elif t == "video":
        await tg.send_video(token, chat_id, msg.media, fn, mime, msg.text, msg.parse_mode, kb)
    elif t == "document":
        await tg.send_document(token, chat_id, msg.media, fn, mime, msg.text, msg.parse_mode, kb)
    elif t == "audio":
        await tg.send_audio(token, chat_id, msg.media, fn, mime, msg.text, msg.parse_mode, kb)
    elif t == "animation":
        await tg.send_animation(token, chat_id, msg.media, fn, mime, msg.text, msg.parse_mode, kb)
    elif t == "voice":
        await tg.send_voice(token, chat_id, msg.media, fn, mime, msg.text, msg.parse_mode, kb)
    elif t == "poll":
        await tg.send_poll(token, chat_id, msg.poll_data or {})
    else:
        raise ValueError(f"Tipo desconhecido: {t}")


async def process_message(message_id: str) -> None:
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(ScheduledMessage).where(ScheduledMessage.id == message_id)
            )
            msg = result.scalar_one_or_none()
            if not msg or msg.status != MessageStatus.sending:
                return

            token, chat_id = await get_credentials(session)
            await _dispatch(msg, token, chat_id)

            await session.delete(msg)
            await session.commit()
            logger.info("Mensagem %s enviada e removida com sucesso.", message_id)
        except Exception as exc:
            logger.error("Falha ao enviar mensagem %s: %s", message_id, exc)
            async with AsyncSessionLocal() as err_session:
                r = await err_session.execute(
                    select(ScheduledMessage).where(ScheduledMessage.id == message_id)
                )
                m = r.scalar_one_or_none()
                if m:
                    m.status = MessageStatus.failed
                    m.error_message = str(exc)
                    await err_session.commit()


async def process_recurring_template(template_id: str) -> None:
    """Envia um template recorrente e agenda o próximo envio."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(MessageTemplate).where(MessageTemplate.id == template_id)
            )
            tmpl = result.scalar_one_or_none()
            if not tmpl or not tmpl.next_send_at or not tmpl.recurrence_minutes:
                return

            token, chat_id = await get_credentials(session)
            await _dispatch(tmpl, token, chat_id)
            logger.info("Template recorrente %s enviado.", template_id)

            # Calcula próximo envio
            next_dt = tmpl.next_send_at + timedelta(minutes=tmpl.recurrence_minutes)
            if tmpl.recurrence_end_at and next_dt > tmpl.recurrence_end_at:
                tmpl.next_send_at = None  # Encerra recorrência
                logger.info("Recorrência do template %s encerrada (fim atingido).", template_id)
            else:
                tmpl.next_send_at = next_dt

            await session.commit()
        except Exception as exc:
            logger.error("Falha ao enviar template recorrente %s: %s", template_id, exc)


async def _check_due() -> None:
    async with AsyncSessionLocal() as session:
        now = datetime.now(SP_TZ)

        # Mensagens agendadas normais (ignora soft-deleted)
        result = await session.execute(
            select(ScheduledMessage).where(
                ScheduledMessage.scheduled_at <= now,
                ScheduledMessage.status == MessageStatus.pending,
                ScheduledMessage.deleted_at.is_(None),
            )
        )
        due = result.scalars().all()
        for msg in due:
            msg.status = MessageStatus.sending
        if due:
            await session.commit()
            for msg in due:
                asyncio.create_task(process_message(str(msg.id)))

        # Templates recorrentes com envio vencido
        result = await session.execute(
            select(MessageTemplate).where(
                MessageTemplate.next_send_at.is_not(None),
                MessageTemplate.next_send_at <= now,
                MessageTemplate.recurrence_minutes.is_not(None),
            )
        )
        due_templates = result.scalars().all()
        # Marca next_send_at temporariamente para evitar duplo disparo antes do commit
        for tmpl in due_templates:
            tmpl.next_send_at = None
        if due_templates:
            await session.commit()
            for tmpl in due_templates:
                asyncio.create_task(process_recurring_template(str(tmpl.id)))


async def scheduler_loop() -> None:
    logger.info("Scheduler iniciado (intervalo: 30s).")
    while True:
        try:
            await _check_due()
        except Exception as exc:
            logger.error("Erro no loop do scheduler: %s", exc)
        await asyncio.sleep(30)
