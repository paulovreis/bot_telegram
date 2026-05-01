import uuid
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel


class TemplateResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    message_type: str
    text: Optional[str]
    parse_mode: str
    media_filename: Optional[str]
    media_mime_type: Optional[str]
    inline_keyboard: Any
    poll_data: Any
    disable_web_page_preview: bool
    recurrence_minutes: Optional[int]
    next_send_at: Optional[datetime]
    recurrence_end_at: Optional[datetime]
    created_at: datetime


class TemplateList(BaseModel):
    templates: list[TemplateResponse]
