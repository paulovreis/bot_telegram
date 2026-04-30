import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from .config import settings as app_settings
from .database import AsyncSessionLocal, init_db
from .models.bot_settings import BotSettings
from .routes import auth, messages, settings
from .services.encryption import encrypt
from .services.scheduler import scheduler_loop

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await _seed_default_settings()
    task = asyncio.create_task(scheduler_loop())
    logger.info("Aplicação iniciada.")
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    logger.info("Aplicação encerrada.")


async def _seed_default_settings() -> None:
    if not app_settings.telegram_bot_token:
        return
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(BotSettings).limit(1))
        existing = result.scalar_one_or_none()
        if existing:
            return
        s = BotSettings(id=1)
        s.bot_token_encrypted = encrypt(app_settings.telegram_bot_token)
        if app_settings.telegram_chat_id:
            s.chat_id_encrypted = encrypt(app_settings.telegram_chat_id)
        session.add(s)
        await session.commit()
        logger.info("Configurações padrão do bot salvas no banco.")


app = FastAPI(
    title="Telegram Bot Scheduler",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(messages.router)
app.include_router(settings.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
