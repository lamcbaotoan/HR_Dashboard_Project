# backend/api/v1/endpoints/login.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from database import get_db_auth
from core.config import settings
# --- SỬA: BỎ VERIFY_PASSWORD ---
from core.security import create_access_token # Bỏ verify_password
from crud import crud_user
import schemas

router = APIRouter()

@router.post("", response_model=schemas.Token)
def login_for_access_token(
    db_auth: Session = Depends(get_db_auth),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    (REVERTED) Xác thực người dùng bằng mật khẩu thuần.
    """
    user = crud_user.get_user_by_email(db_auth, email=form_data.username)

    # --- SỬA: SO SÁNH TRỰC TIẾP ---
    if not user or user.hashed_password != form_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token (remains the same)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user.email,
            "role": user.role,
            "emp_id": user.employee_id_link
        },
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}