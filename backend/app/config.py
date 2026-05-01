from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Public URLs (Traefik/Easypanel)
    frontend_origin: str = "https://tl.painelderevenda.com.br"

    # Database
    database_url: str

    # JWT
    secret_key: str
    refresh_secret_key: str
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Encryption
    encryption_key: str

    # Admin
    admin_username: str
    admin_password_hash: str

    # Telegram defaults
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
