from cryptography.fernet import Fernet
from ..config import settings

_cipher: Fernet | None = None


def _get_cipher() -> Fernet:
    global _cipher
    if _cipher is None:
        key = settings.encryption_key
        _cipher = Fernet(key.encode() if isinstance(key, str) else key)
    return _cipher


def encrypt(value: str) -> str:
    return _get_cipher().encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    return _get_cipher().decrypt(value.encode()).decode()
