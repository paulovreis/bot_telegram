from pydantic import BaseModel


class BotSettingsRequest(BaseModel):
    bot_token: str | None = None
    chat_id: str | None = None


class BotSettingsResponse(BaseModel):
    bot_token_set: bool
    chat_id: str
