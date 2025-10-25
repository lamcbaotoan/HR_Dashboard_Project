# backend/api/v1/endpoints/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional # <-- Import Optional
import schemas
from crud import crud_user
from database import get_db_auth
from auth.auth import get_current_active_admin, get_current_user

router = APIRouter()

# --- SỬA HÀM NÀY ĐỂ NHẬN THAM SỐ LỌC/TÌM KIẾM ---
@router.get("/", response_model=List[schemas.UserInDB])
def read_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None, # Tham số tìm kiếm từ query URL
    role: Optional[str] = None,   # Tham số lọc vai trò từ query URL
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_active_admin) # Chỉ Admin
):
    """
    Lấy danh sách tài khoản từ CSDL Auth (dashboard_auth.db),
    hỗ trợ tìm kiếm và lọc.
    """
    users = crud_user.get_users(
        db_auth,
        skip=skip,
        limit=limit,
        search=search, # Truyền vào CRUD
        role=role      # Truyền vào CRUD
    )
    return users
# --- KẾT THÚC SỬA ---

@router.post("/", response_model=schemas.UserInDB, status_code=status.HTTP_201_CREATED)
def create_new_user_manual(
    # ... (giữ nguyên)
    user: schemas.UserCreate,
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_active_admin)
):
    # ... (giữ nguyên)
    db_user = crud_user.get_user_by_email(db_auth, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email đã tồn tại")
    return crud_user.create_user(db_auth, user)

@router.put("/{user_id}/role", response_model=schemas.UserInDB)
def update_user_role_endpoint(
    # ... (giữ nguyên)
    user_id: int,
    role_update: schemas.UserRoleUpdate,
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_active_admin)
):
    # ... (giữ nguyên logic kiểm tra self-update)
    if not hasattr(current_user, 'id'):
         active_admin_user = crud_user.get_user_by_email(db_auth, current_user.email)
         if not active_admin_user:
              raise HTTPException(status_code=403, detail="Could not verify admin identity.")
         current_admin_id = active_admin_user.id
    else:
         current_admin_id = current_user.id

    if current_admin_id == user_id:
         raise HTTPException(status_code=400, detail="Admin cannot change their own role.")

    db_user = crud_user.update_user_role(db_auth, user_id, role_update.role)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@router.put("/{user_id}/password", status_code=status.HTTP_204_NO_CONTENT)
def reset_user_password_endpoint(
    # ... (giữ nguyên)
    user_id: int,
    password_update: schemas.UserPasswordUpdate,
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_active_admin)
):
    # ... (giữ nguyên)
    db_user = crud_user.update_user_password(db_auth, user_id, password_update.new_password)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return None