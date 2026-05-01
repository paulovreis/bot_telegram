import uuid
import enum
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import String, Text, LargeBinary, DateTime, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from ..database import Base


class MessageStatus(str, enum.Enum):
    pending = "pending"
    sending = "sending"
    sent = "sent"
    failed = "failed"


class ScheduledMessage(Base):
    __tablename__ = "scheduled_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    message_type: Mapped[str] = mapped_column(String(20), nullable=False, default="text")
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    parse_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="HTML")
    media: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    media_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    media_mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    inline_keyboard: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    poll_data: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    disable_web_page_preview: Mapped[bool] = mapped_column(Boolean, default=False)
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=MessageStatus.pending
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
