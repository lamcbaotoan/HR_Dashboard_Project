# backend/crud/crud_payroll.py
from sqlalchemy.orm import Session
from models import Salary, Attendance, EmployeePayroll
import schemas
from decimal import Decimal

def get_salary_history(db_payroll: Session, employee_id: int):
    """Lấy lịch sử lương của nhân viên (Sắp xếp tháng mới nhất trước)."""
    return db_payroll.query(Salary).filter(Salary.EmployeeID == employee_id).order_by(Salary.SalaryMonth.desc()).all()

def get_attendance_data(db_payroll: Session, employee_id: int):
    """
    [Data Source: MySQL]
    Lấy dữ liệu chấm công chi tiết (Ngày công, nghỉ phép, vắng mặt).
    """
    return db_payroll.query(Attendance).filter(
        (Attendance.EmployeeID == employee_id)
    ).order_by(Attendance.AttendanceMonth.desc()).all()

def update_salary(db_payroll: Session, salary_id: int, salary_update: schemas.SalaryUpdate) -> Salary:
    """
    Cập nhật lương thủ công bởi Payroll Manager.
    Logic: NetSalary = BaseSalary + Bonus - Deductions
    """
    db_salary = db_payroll.get(Salary, salary_id)
    if not db_salary:
        return None

    update_data = salary_update.dict(exclude_unset=True)

    # Cập nhật các trường được gửi lên
    for key, value in update_data.items():
        setattr(db_salary, key, value)

    # [LOGIC TÍNH TOÁN] Tự động cập nhật Lương thực nhận (NetSalary)
    # Lấy giá trị mới (nếu có update) hoặc giữ giá trị cũ
    base = update_data.get('BaseSalary', db_salary.BaseSalary) or Decimal(0)
    bonus = update_data.get('Bonus', db_salary.Bonus) or Decimal(0)
    deductions = update_data.get('Deductions', db_salary.Deductions) or Decimal(0)
    
    # Công thức tính lương (Cơ bản)
    db_salary.NetSalary = base + bonus - deductions

    db_payroll.add(db_salary)
    try:
        db_payroll.commit()
        db_payroll.refresh(db_salary)
    except Exception as e:
        db_payroll.rollback()
        raise e 
        
    return db_salary