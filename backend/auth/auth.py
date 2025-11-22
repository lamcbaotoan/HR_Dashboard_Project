# backend/auth/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from typing import Optional

from core.config import settings
from database import get_db_auth
from crud import crud_user
import schemas

# Endpoint để lấy token (Swagger UI sẽ dùng link này)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/login")

# --- HÀM XÁC THỰC TOKEN ---
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db_auth)
) -> schemas.User:
    """
    Giải mã JWT Token để lấy thông tin user.
    Nếu token sai hoặc hết hạn -> Trả về 401 Unauthorized.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Giải mã token
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        emp_id: Optional[int] = payload.get("emp_id")

        if email is None or role is None:
            raise credentials_exception
        
        token_data = schemas.TokenData(email=email, role=role, emp_id=emp_id)
    except JWTError:
        raise credentials_exception

    # Kiểm tra user có tồn tại trong DB không (tránh trường hợp user bị xóa nhưng token vẫn còn hạn)
    user = crud_user.get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    
    # Trả về User object (bao gồm role và emp_id để phân quyền)
    return schemas.User(
        id=user.id, 
        email=user.email, 
        role=user.role, # Quan trọng: Role lấy từ DB (mới nhất) hoặc từ Token
        emp_id=user.employee_id_link
    )

# --- DEPENDENCIES PHÂN QUYỀN (RBAC) ---

def get_current_active_admin(current_user: schemas.User = Depends(get_current_user)):
    """Chỉ Admin mới được phép truy cập."""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Không đủ quyền: Chỉ dành cho Admin")
    return current_user

def get_current_active_hr_manager(current_user: schemas.User = Depends(get_current_user)):
    """HR Manager (và Admin) được phép truy cập."""
    if current_user.role not in ["Admin", "HR Manager"]:
        raise HTTPException(status_code=403, detail="Không đủ quyền: Chỉ dành cho HR Manager")
    return current_user

def get_current_active_payroll_manager(current_user: schemas.User = Depends(get_current_user)):
    """Payroll Manager (và Admin) được phép truy cập."""
    if current_user.role not in ["Admin", "Payroll Manager"]:
        raise HTTPException(status_code=403, detail="Không đủ quyền: Chỉ dành cho Payroll Manager")
    return current_user

# Helper logic: Tự động xác định Role dựa trên vị trí (dùng khi đồng bộ từ HR)
def get_user_role(db_emp_hr) -> str:
    """Logic business để map từ vị trí/phòng ban sang Role hệ thống."""
    if not db_emp_hr: return "Employee"
    
    # Giả định logic (Bạn có thể sửa theo dữ liệu thực tế của HUMAN_2025)
    # Ví dụ: PositionID 5 là Giám đốc -> Admin
    if db_emp_hr.PositionID == 5: return "Admin"
    # Phòng Nhân sự (ID 1) -> HR Manager
    elif db_emp_hr.DepartmentID == 1: return "HR Manager"
    # Phòng Kế toán (ID 2) -> Payroll Manager
    elif db_emp_hr.DepartmentID == 2: return "Payroll Manager"
    
    return "Employee"