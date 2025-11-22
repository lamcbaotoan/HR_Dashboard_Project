# backend/api/v1/endpoints/leave_requests.py
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
import schemas
from crud import crud_leave
from database import get_db_sqlserver, get_db_auth
from auth.auth import get_current_user, get_current_active_hr_manager

router = APIRouter()

@router.get("/", response_model=List[schemas.LeaveRequest])
def get_leave_requests(
    db_hr: Session = Depends(get_db_sqlserver),
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_user)
):
    if current_user.role == "Employee":
        return crud_leave.get_leave_requests(db_auth, db_hr, employee_id=current_user.emp_id)
    return crud_leave.get_leave_requests(db_auth, db_hr)

@router.post("/", response_model=schemas.LeaveRequest)
def create_leave_request(
    request: schemas.LeaveRequestCreate,
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_user)
):
    if not current_user.emp_id:
        raise HTTPException(status_code=400, detail="Tài khoản chưa liên kết nhân viên")
    return crud_leave.create_leave_request(db_auth, request, current_user.emp_id)

@router.put("/{request_id}/status", response_model=schemas.LeaveRequest)
def update_leave_status(
    request_id: int,
    update: schemas.LeaveRequestUpdate,
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_active_hr_manager)
):
    req = crud_leave.update_leave_status(db_auth, request_id, update.Status, current_user.email)
    if not req:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")
    return req