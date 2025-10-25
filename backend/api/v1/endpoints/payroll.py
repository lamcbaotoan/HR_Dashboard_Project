from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import schemas
from crud import crud_payroll
from database import get_db_mysql
from auth.auth import get_current_user, get_current_active_payroll_manager, get_current_active_admin

router = APIRouter()

@router.get("/{employee_id}/salaries", response_model=List[schemas.Salary])
def get_employee_salaries(
    employee_id: int,
    db_payroll: Session = Depends(get_db_mysql),
    current_user: schemas.User = Depends(get_current_user) # Cho phép người dùng đã đăng nhập xem
):
    """Xem lịch sử lương từ PAYROLL"""
    salaries = crud_payroll.get_salary_history(db_payroll, employee_id)
    return salaries

@router.get("/{employee_id}/attendance", response_model=List[schemas.Attendance])
def get_employee_attendance(
    employee_id: int,
    db_payroll: Session = Depends(get_db_mysql),
    current_user: schemas.User = Depends(get_current_user) # Cho phép người dùng đã đăng nhập xem
):
    """Xem lịch sử chấm công từ PAYROLL"""
    attendance = crud_payroll.get_attendance_data(db_payroll, employee_id)
    return attendance

# --- ENDPOINT MỚI ---
@router.put("/salaries/{salary_id}", response_model=schemas.Salary)
def update_salary_record(
    salary_id: int,
    salary_update: schemas.SalaryUpdate,
    db_payroll: Session = Depends(get_db_mysql),
    # Phân quyền: Chỉ Payroll Manager hoặc Admin được sửa
    current_user: schemas.User = Depends(get_current_active_payroll_manager)
):
    """Cập nhật một bản ghi lương (Bonus, Deductions, BaseSalary)"""
    db_salary = crud_payroll.update_salary(db_payroll, salary_id, salary_update)
    if db_salary is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi lương")
    return db_salary