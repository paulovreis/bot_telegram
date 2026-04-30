import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel


class MessageResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    message_type: str
    text: str | None
    parse_mode: str
    media_filename: str | None
    media_mime_type: str | None
    inline_keyboard: Any | None
    poll_data: Any | None
    disable_web_page_preview: bool
    scheduled_at: datetime
    status: str
    error_message: str | None
    created_at: datetime


class MessageList(BaseModel):
    messages: list[MessageResponse]
