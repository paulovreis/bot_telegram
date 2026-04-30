import json
from typing import Optional

import httpx

_API = "https://api.telegram.org/bot{token}/{method}"
_TIMEOUT = httpx.Timeout(120.0, connect=10.0)


async def _post(token: str, method: str, **kwargs) -> dict:
    url = _API.format(token=token, method=method)
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(url, **kwargs)
        data = resp.json()
    if not data.get("ok"):
        raise RuntimeError(f"Telegram API [{method}]: {data.get('description', 'Erro desconhecido')}")
    return data["result"]


def _markup(inline_keyboard: Optional[dict]) -> Optional[str]:
    return json.dumps(inline_keyboard) if inline_keyboard else None


async def send_text(
    token: str,
    chat_id: str,
    text: str,
    parse_mode: str = "HTML",
    inline_keyboard: Optional[dict] = None,
    disable_web_page_preview: bool = False,
) -> dict:
    payload: dict = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": disable_web_page_preview,
    }
    mk = _markup(inline_keyboard)
    if mk:
        payload["reply_markup"] = mk
    return await _post(token, "sendMessage", json=payload)


async def _send_media(
    token: str,
    method: str,
    field: str,
    chat_id: str,
    media: bytes,
    filename: str,
    mime_type: str,
    caption: Optional[str],
    parse_mode: str,
    inline_keyboard: Optional[dict],
) -> dict:
    files = {field: (filename, media, mime_type)}
    data: dict = {"chat_id": chat_id, "parse_mode": parse_mode}
    if caption:
        data["caption"] = caption
    mk = _markup(inline_keyboard)
    if mk:
        data["reply_markup"] = mk
    return await _post(token, method, files=files, data=data)


async def send_photo(
    token: str, chat_id: str, media: bytes, filename: str, mime_type: str,
    caption: Optional[str] = None, parse_mode: str = "HTML",
    inline_keyboard: Optional[dict] = None,
) -> dict:
    return await _send_media(token, "sendPhoto", "photo", chat_id, media, filename, mime_type, caption, parse_mode, inline_keyboard)


async def send_video(
    token: str, chat_id: str, media: bytes, filename: str, mime_type: str,
    caption: Optional[str] = None, parse_mode: str = "HTML",
    inline_keyboard: Optional[dict] = None,
) -> dict:
    return await _send_media(token, "sendVideo", "video", chat_id, media, filename, mime_type, caption, parse_mode, inline_keyboard)


async def send_document(
    token: str, chat_id: str, media: bytes, filename: str, mime_type: str,
    caption: Optional[str] = None, parse_mode: str = "HTML",
    inline_keyboard: Optional[dict] = None,
) -> dict:
    return await _send_media(token, "sendDocument", "document", chat_id, media, filename, mime_type, caption, parse_mode, inline_keyboard)


async def send_audio(
    token: str, chat_id: str, media: bytes, filename: str, mime_type: str,
    caption: Optional[str] = None, parse_mode: str = "HTML",
    inline_keyboard: Optional[dict] = None,
) -> dict:
    return await _send_media(token, "sendAudio", "audio", chat_id, media, filename, mime_type, caption, parse_mode, inline_keyboard)


async def send_animation(
    token: str, chat_id: str, media: bytes, filename: str, mime_type: str,
    caption: Optional[str] = None, parse_mode: str = "HTML",
    inline_keyboard: Optional[dict] = None,
) -> dict:
    return await _send_media(token, "sendAnimation", "animation", chat_id, media, filename, mime_type, caption, parse_mode, inline_keyboard)


async def send_voice(
    token: str, chat_id: str, media: bytes, filename: str, mime_type: str,
    caption: Optional[str] = None, parse_mode: str = "HTML",
    inline_keyboard: Optional[dict] = None,
) -> dict:
    return await _send_media(token, "sendVoice", "voice", chat_id, media, filename, mime_type, caption, parse_mode, inline_keyboard)


async def send_poll(token: str, chat_id: str, poll_data: dict) -> dict:
    payload = {"chat_id": chat_id, **poll_data}
    return await _post(token, "sendPoll", json=payload)


async def get_bot_info(token: str) -> dict:
    return await _post(token, "getMe")
