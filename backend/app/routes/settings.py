from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.bot_settings import BotSettings
from ..routes.deps import get_current_user
from ..schemas.bot_settings import BotSettingsRequest, BotSettingsResponse
from ..services.encryption import decrypt, encrypt
from ..services.telegram import get_bot_info, normalize_bot_token

router = APIRouter(prefix="/settings", tags=["settings"])


async def _get_or_create(db: AsyncSession) -> BotSettings:
    result = await db.execute(select(BotSettings).limit(1))
    s = result.scalar_one_or_none()
    if not s:
        s = BotSettings(id=1)
        db.add(s)
    return s


@router.get("/bot", response_model=BotSettingsResponse)
async def get_bot_settings(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(BotSettings).limit(1))
    s = result.scalar_one_or_none()
    if not s:
        return BotSettingsResponse(bot_token_set=False, chat_id="")
    return BotSettingsResponse(
        bot_token_set=bool(s.bot_token_encrypted),
        chat_id=decrypt(s.chat_id_encrypted) if s.chat_id_encrypted else "",
    )


@router.put("/bot")
async def update_bot_settings(
    body: BotSettingsRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    s = await _get_or_create(db)
    if body.bot_token:
        normalized = normalize_bot_token(body.bot_token)
        if not normalized:
            raise HTTPException(status_code=400, detail="Token inválido")
        s.bot_token_encrypted = encrypt(normalized)
    if body.chat_id is not None:
        s.chat_id_encrypted = encrypt(body.chat_id.strip()) if body.chat_id.strip() else None
    await db.commit()
    return {"detail": "Configurações atualizadas"}


@router.get("/test")
async def test_bot(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    from ..config import settings as app_settings

    result = await db.execute(select(BotSettings).limit(1))
    s = result.scalar_one_or_none()
    token = (
        decrypt(s.bot_token_encrypted)
        if s and s.bot_token_encrypted
        else app_settings.telegram_bot_token
    )
    token = normalize_bot_token(token)
    if not token:
        raise HTTPException(status_code=400, detail="Nenhum token configurado")
    try:
        info = await get_bot_info(token)
        return {"ok": True, "bot": info}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
