# backend/api/v1/endpoints/login.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from database import get_db_auth
from core.config import settings
from core.security import create_access_token
from crud import crud_user, crud_system # Import ghi log
import schemas

router = APIRouter()

@router.post("", response_model=schemas.Token)
def login_for_access_token(
    db_auth: Session = Depends(get_db_auth),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    API Đăng nhập: Nhận username/password -> Trả về JWT Token.
    """
    # 1. Tìm user
    user = crud_user.get_user_by_email(db_auth, email=form_data.username)

    # 2. Kiểm tra mật khẩu (Plaintext theo yêu cầu hiện tại, nên hash trong thực tế)
    if not user or user.hashed_password != form_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sai tên đăng nhập hoặc mật khẩu",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Ghi Audit Log
    crud_system.create_audit_log(
        db_auth, 
        user_email=user.email, 
        action="LOGIN", 
        details="User logged in successfully"
    )

    # 4. Tạo Token (Chứa email, role, emp_id)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user.email,
            "role": user.role,           # Quan trọng cho Frontend phân quyền
            "emp_id": user.employee_id_link # Quan trọng cho Employee xem data mình
        },
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}