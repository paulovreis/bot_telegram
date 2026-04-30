from fastapi import APIRouter, Cookie, HTTPException, Response, status

from ..config import settings
from ..schemas.auth import LoginRequest, TokenResponse
from ..services.auth import (
    create_access_token,
    create_refresh_token,
    verify_credentials,
    verify_refresh_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE = "refresh_token"
_COOKIE_OPTS: dict = {
    "httponly": True,
    "secure": True,
    "samesite": "lax",
    "max_age": settings.refresh_token_expire_days * 86_400,
    "path": "/",
}


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response):
    if not verify_credentials(body.username, body.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )
    payload = {"sub": body.username}
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)
    response.set_cookie(_COOKIE, refresh_token, **_COOKIE_OPTS)
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(None, alias=_COOKIE),
):
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Sem refresh token"
        )
    payload = verify_refresh_token(refresh_token)
    new_access = create_access_token({"sub": payload["sub"]})
    new_refresh = create_refresh_token({"sub": payload["sub"]})
    response.set_cookie(_COOKIE, new_refresh, **_COOKIE_OPTS)
    return TokenResponse(access_token=new_access)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(_COOKIE, path="/")
    return {"detail": "Sessão encerrada"}
