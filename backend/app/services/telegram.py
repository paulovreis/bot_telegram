import json
import re
from typing import Optional

import httpx
import logging

_API = "https://api.telegram.org/bot{token}/{method}"
_TIMEOUT = httpx.Timeout(120.0, connect=10.0)

logger = logging.getLogger(__name__)


_TOKEN_RE = re.compile(r"^\d+:[A-Za-z0-9_-]{20,}$")


def normalize_bot_token(raw: str) -> str:
    """Normalize common user-provided Telegram bot token formats.

    Accepts:
    - '<id>:<secret>'
    - 'bot<id>:<secret>'
    - 'https://api.telegram.org/bot<id>:<secret>/getMe' (or similar)
    """
    token = (raw or "").strip().strip('"').strip("'")
    if not token:
        return ""

    # Remove any whitespace (including hidden newlines) that can break auth.
    token = re.sub(r"\s+", "", token)

    # If user pasted a full Telegram API URL, extract the token.
    # We also support any string containing '/bot<token>/' for safety.
    idx = token.find("/bot")
    if idx != -1:
        rest = token[idx + 4 :]
        token = rest.split("/", 1)[0].strip()

    # If user pasted 'bot<token>' (common from URL examples), strip leading 'bot'
    low = token.lower()
    if low.startswith("bot"):
        candidate = token[3:].strip()
        if _TOKEN_RE.match(candidate):
            token = candidate

    return token


async def _post(token: str, method: str, **kwargs) -> dict:
    token = normalize_bot_token(token)
    url = _API.format(token=token, method=method)
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        # Telegram Bot API accepts both GET and POST, but GET is safer for methods
        # with no payload (e.g., getMe).
        if kwargs:
            resp = await client.post(url, **kwargs)
        else:
            resp = await client.get(url)
        data = resp.json()
    if not data.get("ok"):
        code = data.get("error_code")
        desc = data.get("description", "Erro desconhecido")
        msg = f"Telegram API [{method}]: {desc}"
        if code is not None:
            msg = f"{msg} (error_code={code})"
        if code == 401:
            msg = f"{msg}. Dica: verifique se o token está no formato '<id>:<segredo>' (sem 'bot' e sem URL)."
        # Avoid leaking token in logs; include only non-secret metadata.
        token_bot_id = token.split(":", 1)[0] if ":" in token else ""
        logger.warning(
            "telegram_api_error",
            extra={
                "method": method,
                "status_code": resp.status_code,
                "error_code": code,
                "token_bot_id": token_bot_id,
                "token_length": len(token),
            },
        )
        raise RuntimeError(msg)
    return data["result"]


def _markup_json(inline_keyboard: Optional[dict]) -> Optional[dict]:
    # When using application/json requests, Telegram expects reply_markup as an object.
    return inline_keyboard if inline_keyboard else None


def _markup_form(inline_keyboard: Optional[dict]) -> Optional[str]:
    # When using multipart/form-data, Telegram expects reply_markup as a JSON-serialized string.
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
    mk = _markup_json(inline_keyboard)
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
    mk = _markup_form(inline_keyboard)
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
