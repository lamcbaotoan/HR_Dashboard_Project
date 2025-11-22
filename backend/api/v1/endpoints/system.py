# backend/api/v1/endpoints/system.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import schemas
from crud import crud_system
from database import get_db_auth
from auth.auth import get_current_active_admin

router = APIRouter()

# --- AUDIT LOGS (Chỉ Admin) ---
@router.get("/logs", response_model=List[schemas.AuditLog])
def read_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_active_admin)
):
    """Xem nhật ký hoạt động hệ thống."""
    return crud_system.get_audit_logs(db_auth, skip=skip, limit=limit)

# --- SYSTEM CONFIG (Chỉ Admin) ---
@router.get("/config", response_model=List[schemas.SystemConfig])
def read_configs(
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_active_admin)
):
    return crud_system.get_all_configs(db_auth)

@router.put("/config/{key}", response_model=schemas.SystemConfig)
def update_config(
    key: str,
    config: schemas.SystemConfigUpdate,
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_active_admin)
):
    """Cập nhật tham số cấu hình (VD: ngưỡng cảnh báo)."""
    return crud_system.set_config(db_auth, key, config.value)