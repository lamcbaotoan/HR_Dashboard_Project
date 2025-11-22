# backend/services/alert_service.py
from sqlalchemy.orm import Session
from sqlalchemy import extract, func, or_
from datetime import date
import logging

# Import Models
from models import EmployeeHR, Attendance, Salary
# Import Session & CRUD cho Notification
from database import SessionLocalAuth 
from crud import crud_notification
import schemas

logger = logging.getLogger(__name__)
def _create_alert(type: str, message: str, role_target: str = None, related_id: int = None):
    """Helper để ghi thông báo vào Auth DB (SQLite)."""
    db_auth = SessionLocalAuth()
    try:
        noti = schemas.NotificationCreate(
            message=message, type=type, role_target=role_target, related_employee_id=related_id
        )
        crud_notification.create_notification(db_auth, noti)
        logger.info(f"ALERT: {message}")
    except Exception as e:
        logger.error(f"Failed to create alert: {e}")
    finally:
        db_auth.close()

# 1. Kỷ niệm làm việc (Anniversary)
def check_work_anniversaries(db_hr: Session):
    today = date.today()
    milestones = [1, 3, 5, 10, 15, 20, 25, 30] # Năm
    
    employees = db_hr.query(EmployeeHR).filter(
        extract('month', EmployeeHR.HireDate) == today.month,
        extract('day', EmployeeHR.HireDate) == today.day,
        or_(EmployeeHR.Status == 'Đang làm việc', EmployeeHR.Status == 'Active')
    ).all()

    for emp in employees:
        years = today.year - emp.HireDate.year
        if years in milestones:
            msg = f"🎉 Kỷ niệm: {emp.FullName} (ID: {emp.EmployeeID}) tròn {years} năm làm việc hôm nay!"
            _create_alert("anniversary", msg, "HR Manager", emp.EmployeeID)
            _create_alert("anniversary", msg, "Admin", emp.EmployeeID)

# 2. Nghỉ quá phép (Excessive Leave)
def check_excessive_leave(db_payroll: Session):
    """
    Quét dữ liệu từ PAYROLL (MySQL) để tìm nhân viên nghỉ quá hạn mức.
    Logic: Tổng LeaveDays trong năm > 12.
    """
    current_year = date.today().year
    MAX_LEAVE_DAYS = 12 
    
    try:
        # 1. Thực hiện Query Aggregation trên MySQL
        # Tương đương SQL: 
        # SELECT EmployeeID, SUM(LeaveDays) FROM attendance 
        # WHERE YEAR(AttendanceMonth) = 2025 
        # GROUP BY EmployeeID HAVING SUM(LeaveDays) > 12;
        
        query = db_payroll.query(
            Attendance.EmployeeID, 
            func.sum(Attendance.LeaveDays).label("total_leave")
        ).filter(
            extract('year', Attendance.AttendanceMonth) == current_year
        ).group_by(
            Attendance.EmployeeID
        ).having(
            func.sum(Attendance.LeaveDays) > MAX_LEAVE_DAYS
        ).all()

        # 2. Tạo cảnh báo cho từng trường hợp vi phạm
        for emp_id, total_leave in query:
            # Tính số ngày vượt
            exceeded = total_leave - MAX_LEAVE_DAYS
            message = (f"⚠️ Cảnh báo nghỉ phép: Nhân viên {emp_id} đã nghỉ {total_leave} ngày "
                       f"(Vượt quy định {exceeded} ngày). Vui lòng kiểm tra!")
            
            # Gửi cho HR Manager và Admin
            _create_alert("leave_warning", message, "HR Manager", emp_id)
            _create_alert("leave_warning", message, "Admin", emp_id)

    except Exception as e:
        logger.error(f"Error checking excessive leave in MySQL: {e}")

# 3. Chênh lệch lương (Payroll Discrepancy)
def check_payroll_discrepancies(db_payroll: Session):
    months = db_payroll.query(Salary.SalaryMonth).distinct().order_by(Salary.SalaryMonth.desc()).limit(2).all()
    if len(months) < 2: return

    curr_month, prev_month = months[0][0], months[1][0]
    
    curr_total = db_payroll.query(func.sum(Salary.NetSalary)).filter(Salary.SalaryMonth == curr_month).scalar() or 0
    prev_total = db_payroll.query(func.sum(Salary.NetSalary)).filter(Salary.SalaryMonth == prev_month).scalar() or 0

    if prev_total > 0:
        diff_percent = ((curr_total - prev_total) / prev_total) * 100
        if abs(diff_percent) > 20: # Ngưỡng 20%
            trend = "tăng" if diff_percent > 0 else "giảm"
            msg = f"💰 Lương bất thường: Tổng lương tháng {curr_month} {trend} {abs(diff_percent):.1f}% so với tháng trước."
            _create_alert("salary_alert", msg, "Payroll Manager")
            _create_alert("salary_alert", msg, "Admin")

# 4. Gửi Email (Giữ nguyên placeholder)
def send_monthly_payroll_emails(db_hr: Session, db_payroll: Session):
    pass