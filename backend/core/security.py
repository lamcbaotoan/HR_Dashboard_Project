# backend/core/security.py
from datetime import datetime, timedelta
from typing import Optional

from jose import jwt
# --- SỬA: BỎ PASSLIB ---
# from passlib.context import CryptContext 

from core.config import settings

# --- SỬA: BỎ PWD_CONTEXT ---
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, stored_password: str) -> bool:
    """
    (REVERTED) So sánh mật khẩu thuần.
    """
    return plain_password == stored_password # <-- SỬA: So sánh trực tiếp


def get_password_hash(password: str) -> str:
    """
    (REVERTED) Trả về mật khẩu thuần.
    """
    return password # <-- SỬA: Trả về mật khẩu gốc

# --- create_access_token function remains the same ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Create a new JWT access token.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt