from sqlalchemy.orm import Session
from models import Salary, Attendance, EmployeePayroll
import schemas
from datetime import date
from decimal import Decimal # Import Decimal

def get_salary_history(db_payroll: Session, employee_id: int):
    # Lấy lịch sử lương
    return db_payroll.query(Salary).filter(Salary.EmployeeID == employee_id).order_by(Salary.SalaryMonth.desc()).all()

def get_attendance_data(db_payroll: Session, employee_id: int):
    # Lấy dữ liệu chấm công
    return db_payroll.query(Attendance).filter(
        (Attendance.EmployeeID == employee_id)
    ).order_by(Attendance.AttendanceMonth.desc()).all()

# --- HÀM MỚI ---
def update_salary(db_payroll: Session, salary_id: int, salary_update: schemas.SalaryUpdate) -> Salary:
    """
    Cập nhật thông tin một bản ghi lương (ví dụ: Bonus, Deductions)
    """
    db_salary = db_payroll.get(Salary, salary_id)
    if not db_salary:
        return None

    update_data = salary_update.dict(exclude_unset=True)

    # Cập nhật các trường được cung cấp
    for key, value in update_data.items():
        setattr(db_salary, key, value)

    # Tự động tính toán lại NetSalary nếu các thành phần của nó thay đổi
    if 'BaseSalary' in update_data or 'Bonus' in update_data or 'Deductions' in update_data:
        base = db_salary.BaseSalary if db_salary.BaseSalary is not None else Decimal(0)
        bonus = db_salary.Bonus if db_salary.Bonus is not None else Decimal(0)
        deductions = db_salary.Deductions if db_salary.Deductions is not None else Decimal(0)
        db_salary.NetSalary = base + bonus - deductions

    db_payroll.add(db_salary)
    try:
        db_payroll.commit()
        db_payroll.refresh(db_salary)
    except Exception as e:
        db_payroll.rollback()
        raise e # Ném lỗi ra để endpoint xử lý và trả về cho client
        
    return db_salary