# backend/api/v1/endpoints/payroll.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import schemas
from crud import crud_payroll, crud_system # [MỚI] Import crud_system để ghi log
from database import get_db_mysql, get_db_auth # [MỚI] Cần db_auth để ghi log
from auth.auth import get_current_user, get_current_active_payroll_manager

router = APIRouter()

# ... (Các API GET cũ giữ nguyên) ...
@router.get("/{employee_id}/salaries", response_model=List[schemas.Salary])
def get_employee_salaries(employee_id: int, db_payroll: Session = Depends(get_db_mysql), current_user: schemas.User = Depends(get_current_user)):
    return crud_payroll.get_salary_history(db_payroll, employee_id)

@router.get("/{employee_id}/attendance", response_model=List[schemas.Attendance])
def get_employee_attendance(employee_id: int, db_payroll: Session = Depends(get_db_mysql), current_user: schemas.User = Depends(get_current_user)):
    return crud_payroll.get_attendance_data(db_payroll, employee_id)

@router.put("/salaries/{salary_id}", response_model=schemas.Salary)
def update_salary_record(
    salary_id: int,
    salary_update: schemas.SalaryUpdate,
    db_payroll: Session = Depends(get_db_mysql),
    db_auth: Session = Depends(get_db_auth), # [MỚI] Inject DB Auth
    current_user: schemas.User = Depends(get_current_active_payroll_manager)
):
    db_salary = crud_payroll.update_salary(db_payroll, salary_id, salary_update)
    if db_salary is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi lương")
    
    # [GHI LOG] Cập nhật lương
    crud_system.create_audit_log(
        db_auth,
        user_email=current_user.email,
        action="UPDATE_SALARY",
        target=f"SalaryID: {salary_id}",
        details=f"Updated Base: {salary_update.BaseSalary}, Bonus: {salary_update.Bonus}"
    )
    return db_salary

# --- [MỚI] API CHỐT LƯƠNG (CÓ GHI LOG) ---
@router.post("/finalize")
def finalize_payroll(
    month: int,
    year: int,
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_active_payroll_manager)
):
    """
    Giả lập hành động chốt lương và GHI LOG AUDIT.
    """
    # Trong thực tế: Update status = 'Finalized' trong DB Payroll
    
    # Ghi Log Audit
    crud_system.create_audit_log(
        db_auth,
        user_email=current_user.email,
        action="FINALIZE_PAYROLL",
        target=f"Period: {month}/{year}",
        details="Locked salary data for the period."
    )
    return {"message": f"Đã chốt bảng lương tháng {month}/{year} thành công"}

# --- [MỚI] API GỬI PHIẾU LƯƠNG (CÓ GHI LOG) ---
@router.post("/{salary_id}/send-email")
def send_single_payslip(
    salary_id: int,
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_active_payroll_manager)
):
    """
    Giả lập gửi email 1 phiếu lương cụ thể và GHI LOG AUDIT.
    """
    # Trong thực tế: Gọi service gửi email
    
    # Ghi Log Audit
    crud_system.create_audit_log(
        db_auth,
        user_email=current_user.email,
        action="SEND_PAYSLIP",
        target=f"SalaryID: {salary_id}",
        details="Sent payslip via email manually."
    )
    return {"message": f"Đã gửi email phiếu lương #{salary_id}"}