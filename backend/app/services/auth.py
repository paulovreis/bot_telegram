import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import HTTPException, status

from ..config import settings

_ALGORITHM = "HS256"


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def verify_credentials(username: str, password: str) -> bool:
    if not secrets.compare_digest(username, settings.admin_username):
        return False
    return verify_password(password, settings.admin_password_hash)


def _encode(payload: dict, key: str, expire: timedelta) -> str:
    payload = payload.copy()
    payload["exp"] = datetime.now(timezone.utc) + expire
    payload["iat"] = datetime.now(timezone.utc)
    return jwt.encode(payload, key, algorithm=_ALGORITHM)


def create_access_token(data: dict) -> str:
    return _encode(
        {**data, "type": "access"},
        settings.secret_key,
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(data: dict) -> str:
    return _encode(
        {**data, "type": "refresh"},
        settings.refresh_secret_key,
        timedelta(days=settings.refresh_token_expire_days),
    )


def _decode(token: str, key: str, expected_type: str) -> dict:
    try:
        payload = jwt.decode(token, key, algorithms=[_ALGORITHM])
        if payload.get("type") != expected_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Tipo de token inválido"
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expirado"
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido"
        )


def verify_access_token(token: str) -> dict:
    return _decode(token, settings.secret_key, "access")


def verify_refresh_token(token: str) -> dict:
    return _decode(token, settings.refresh_secret_key, "refresh")
