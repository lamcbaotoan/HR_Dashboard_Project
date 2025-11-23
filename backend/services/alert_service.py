# backend/services/alert_service.py
from sqlalchemy.orm import Session
from sqlalchemy import extract, func, or_
from datetime import date
import logging

# Import Models
from models import EmployeeHR, Attendance, Salary
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

# 1. Kỷ niệm làm việc (Giữ nguyên)
def check_work_anniversaries(db_hr: Session):
    today = date.today()
    milestones = [1, 3, 5, 10, 15, 20, 25, 30]
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

# 2. Quản lý Nghỉ phép (Từ MySQL)
def check_excessive_leave(db_payroll: Session):
    current_year = date.today().year
    MAX_LEAVE_DAYS = 12 
    MIN_USAGE_WARNING = 2 
    current_month = date.today().month
    
    try:
        query = db_payroll.query(
            Attendance.EmployeeID, 
            func.sum(Attendance.LeaveDays).label("total_leave")
        ).filter(
            extract('year', Attendance.AttendanceMonth) == current_year
        ).group_by(
            Attendance.EmployeeID
        ).all()

        for emp_id, total_leave in query:
            total_leave = total_leave or 0
            
            if total_leave > MAX_LEAVE_DAYS:
                exceeded = total_leave - MAX_LEAVE_DAYS
                msg_excess = (f"⚠️ Cảnh báo nghỉ phép: Nhân viên {emp_id} đã nghỉ {total_leave} ngày "
                              f"(Vượt quy định {exceeded} ngày). Vui lòng kiểm tra!")
                _create_alert("leave_warning", msg_excess, "HR Manager", emp_id)
                _create_alert("leave_warning", msg_excess, "Payroll Manager", emp_id)
                _create_alert("leave_warning", msg_excess, "Admin", emp_id)

            if current_month >= 10 and total_leave < MIN_USAGE_WARNING:
                unused = MAX_LEAVE_DAYS - total_leave
                msg_unused = (f"ℹ️ Tồn đọng phép: Nhân viên {emp_id} mới nghỉ {total_leave} ngày. "
                              f"Còn dư {unused} ngày chưa sử dụng. Hãy nhắc nhở nhân viên.")
                _create_alert("leave_info", msg_unused, "HR Manager", emp_id)

    except Exception as e:
        logger.error(f"Error checking excessive leave in MySQL: {e}")

# 3. Chênh lệch lương (Giữ nguyên)
def check_payroll_discrepancies(db_payroll: Session):
    months = db_payroll.query(Salary.SalaryMonth).distinct().order_by(Salary.SalaryMonth.desc()).limit(2).all()
    if len(months) < 2: return

    curr_month, prev_month = months[0][0], months[1][0]
    
    curr_total = db_payroll.query(func.sum(Salary.NetSalary)).filter(Salary.SalaryMonth == curr_month).scalar() or 0
    prev_total = db_payroll.query(func.sum(Salary.NetSalary)).filter(Salary.SalaryMonth == prev_month).scalar() or 0

    if prev_total > 0:
        diff_percent = ((curr_total - prev_total) / prev_total) * 100
        if abs(diff_percent) > 20:
            trend = "tăng" if diff_percent > 0 else "giảm"
            msg = f"💰 Lương bất thường: Tổng lương tháng {curr_month} {trend} {abs(diff_percent):.1f}% so với tháng trước."
            _create_alert("salary_alert", msg, "Payroll Manager")
            _create_alert("salary_alert", msg, "Admin")

# 4. [UPDATE] Gửi thông báo lương tự động
def send_monthly_payroll_emails(db_hr: Session, db_payroll: Session):
    """
    Job chạy định kỳ (Cronjob) để gửi thông báo lương.
    Logic: Tìm các bản ghi lương của tháng hiện tại và tạo thông báo 'Đã có phiếu lương'.
    """
    try:
        latest_salary = db_payroll.query(Salary).order_by(Salary.SalaryMonth.desc()).first()
        if not latest_salary:
            return

        target_month = latest_salary.SalaryMonth
        
        # Lấy tất cả bảng lương của tháng đó
        salaries = db_payroll.query(Salary).filter(Salary.SalaryMonth == target_month).all()
        
        count = 0
        for s in salaries:
            # 1. Lấy thông tin nhân viên
            emp = db_hr.query(EmployeeHR).filter(EmployeeHR.EmployeeID == s.EmployeeID).first()
            if emp:
                # 2. Tạo thông báo trong hệ thống (In-app Notification)
                msg = f"💰 Phiếu lương tháng {target_month.month}/{target_month.year} đã sẵn sàng. Thực nhận: {s.NetSalary:,.0f} VNĐ."
                
                # Gửi trực tiếp cho ID nhân viên (Alert Service sẽ lưu related_employee_id)
                # Frontend sẽ dùng ID này để lọc thông báo cho user
                _create_alert("salary_info", msg, related_id=s.EmployeeID)
                count += 1

        logger.info(f"✅ Đã gửi thông báo lương tháng {target_month} cho {count} nhân viên.")

    except Exception as e:
        logger.error(f"Error sending monthly payroll emails: {e}")