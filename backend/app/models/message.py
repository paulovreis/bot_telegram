import uuid
import enum
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import String, Text, LargeBinary, DateTime, Boolean, JSON, Integer, ForeignKey
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
    # Soft delete: mensagem fica visível por 24h para permitir "Repetir envio"
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Referência ao template de origem (se criada a partir de um)
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )


class MessageTemplate(Base):
    __tablename__ = "message_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    message_type: Mapped[str] = mapped_column(String(20), nullable=False, default="text")
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    parse_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="HTML")
    media: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    media_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    media_mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    inline_keyboard: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    poll_data: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    disable_web_page_preview: Mapped[bool] = mapped_column(Boolean, default=False)
    # Recorrência: intervalo em minutos (null = não recorrente)
    recurrence_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Próximo envio agendado (null = inativo / recorrência desabilitada)
    next_send_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Data/hora limite para parar os envios recorrentes (null = sem fim)
    recurrence_end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
