# backend/auth/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from pydantic import ValidationError
from typing import TYPE_CHECKING, Optional

from core.config import settings
from database import get_db_auth
from models import User as AuthUser
import schemas
from crud import crud_user

if TYPE_CHECKING:
    from models import EmployeeHR

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/login")

# --- Logic phân quyền (Giữ nguyên) ---
def get_user_role(db_user: 'EmployeeHR') -> str:
    if not db_user:
        return "Employee"
    if db_user.PositionID == 5: # Giám đốc
        return "Admin"
    elif db_user.DepartmentID == 1: # Nhân sự
        return "HR Manager"
    elif db_user.DepartmentID == 2: # Kế toán
        return "Payroll Manager"
    else:
        return "Employee"

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db_auth)
) -> schemas.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email: str = payload.get("sub")
        role: str = payload.get("role")
        emp_id: Optional[int] = payload.get("emp_id")

        user_in_db = crud_user.get_user_by_email(db, email=email)
        if not user_in_db:
             raise credentials_exception
        user_id = user_in_db.id

        if email is None or role is None:
            raise credentials_exception

        token_data = schemas.TokenData(email=email, role=role, emp_id=emp_id)

    except (JWTError, ValidationError):
        raise credentials_exception

    # Lấy lại user từ DB để đảm bảo user vẫn tồn tại
    user = crud_user.get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception

    return schemas.User(id=user.id, email=user.email, role=token_data.role, emp_id=token_data.emp_id)


# --- Dependency phân quyền ---
def get_current_active_admin(current_user: schemas.User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized: Admins only")
    return current_user

# --- SỬA HÀM NÀY ---
def get_current_active_hr_manager(current_user: schemas.User = Depends(get_current_user)):
    # CHO PHÉP CẢ Payroll Manager TRUY CẬP CÁC ENDPOINT DÙNG DEPENDENCY NÀY
    allowed_roles = ["Admin", "HR Manager", "Payroll Manager"]
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Not authorized: HR, Payroll, or Admins only") # Cập nhật thông báo lỗi
    return current_user
# --- KẾT THÚC SỬA ---

# --- SỬA HÀM NÀY (Đã bao gồm trong thay đổi ở trên, nhưng để rõ ràng) ---
def get_current_active_payroll_manager(current_user: schemas.User = Depends(get_current_user)):
    # Dependency này vẫn giữ nguyên, chỉ cho Admin và Payroll Manager
    if current_user.role not in ["Admin", "Payroll Manager"]:
        raise HTTPException(status_code=403, detail="Not authorized: Payroll or Admins only")
    return current_user
# --- KẾT THÚC SỬA ---