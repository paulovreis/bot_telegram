from datetime import datetime, timezone
from sqlalchemy import Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base


class BotSettings(Base):
    __tablename__ = "bot_settings"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    bot_token_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    chat_id_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
