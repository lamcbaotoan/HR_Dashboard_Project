# backend/services/alert_service.py
from sqlalchemy.orm import Session
from sqlalchemy import extract, func, and_
from datetime import date
from models import EmployeeHR, Attendance, Salary
# --- THÊM IMPORTS ---
from database import SessionLocalAuth # Cần session để ghi vào Auth DB
from crud import crud_notification    # Cần CRUD để tạo notification
import schemas                        # Cần schema NotificationCreate
# --- KẾT THÚC THÊM ---
import smtplib # Thư viện gửi email (ví dụ)
from email.mime.text import MIMEText # Thư viện gửi email (ví dụ)

# --- THÊM HÀM HELPER ---
def _create_alert_notification(type: str, message: str, role_target: str = None, user_id: int = None, related_employee_id: int = None):
    """Hàm nội bộ để tạo thông báo trong Auth DB, xử lý session."""
    db_auth = SessionLocalAuth()
    try:
        notification_in = schemas.NotificationCreate(
            message=message,
            type=type,
            role_target=role_target,
            user_id=user_id,
            related_employee_id=related_employee_id
        )
        crud_notification.create_notification(db_auth, notification_in)
        print(f"NOTIFICATION CREATED: [{type}] {message} (Target: {role_target or user_id})") # Log ra console
    except Exception as e:
        print(f"!!! ERROR: Failed to create DB notification: {e}")
    finally:
        db_auth.close()
# --- KẾT THÚC HÀM HELPER ---


def check_work_anniversaries(db_hr: Session):
    """Kiểm tra kỷ niệm và tạo thông báo."""
    today = date.today()
    anniversary_years = [1, 3, 5, 10, 15, 20]

    employees = db_hr.query(EmployeeHR).filter(
        extract('month', EmployeeHR.HireDate) == today.month,
        extract('day', EmployeeHR.HireDate) == today.day
    ).all()

    for emp in employees:
        years_worked = today.year - emp.HireDate.year
        if years_worked in anniversary_years:
            message = f"Nhân viên {emp.FullName} (ID: {emp.EmployeeID}) kỷ niệm {years_worked} năm làm việc hôm nay!"
            # Tạo thông báo cho HR Manager và Admin
            _create_alert_notification(type="anniversary", message=message, role_target="HR Manager", related_employee_id=emp.EmployeeID)
            _create_alert_notification(type="anniversary", message=message, role_target="Admin", related_employee_id=emp.EmployeeID)

def check_excessive_leave(db_payroll: Session):
    """Kiểm tra nghỉ phép quá hạn và tạo thông báo."""
    MAX_LEAVE_DAYS = 12
    current_year = date.today().year

    excessive_leave_users = db_payroll.query(
        Attendance.EmployeeID,
        func.sum(Attendance.LeaveDays).label("total_leave")
    ).filter(
        extract('year', Attendance.AttendanceMonth) == current_year
    ).group_by(Attendance.EmployeeID).having(
        func.sum(Attendance.LeaveDays) > MAX_LEAVE_DAYS
    ).all()

    for emp_id, leave_days in excessive_leave_users:
        message = f"Nhân viên ID {emp_id} đã sử dụng {leave_days} ngày nghỉ phép năm {current_year} (vượt ngưỡng {MAX_LEAVE_DAYS})."
        # Tạo thông báo cho HR Manager và Admin
        _create_alert_notification(type="leave_warning", message=message, role_target="HR Manager", related_employee_id=emp_id)
        _create_alert_notification(type="leave_warning", message=message, role_target="Admin", related_employee_id=emp_id)

def check_payroll_discrepancies(db_payroll: Session):
    """Kiểm tra chênh lệch lương và tạo thông báo."""
    latest_salary_date = db_payroll.query(func.max(Salary.SalaryMonth)).scalar()
    if not latest_salary_date: 
        print("ALERT_SERVICE: Không có dữ liệu lương (Salary) để so sánh chênh lệch.")
        return

    previous_salary_date = db_payroll.query(func.max(Salary.SalaryMonth))\
        .filter(Salary.SalaryMonth < latest_salary_date)\
        .scalar()
    if not previous_salary_date: 
        print(f"ALERT_SERVICE: Chỉ có 1 tháng dữ liệu lương ({latest_salary_date}), không thể so sánh chênh lệch.")
        return

    total_latest = db_payroll.query(func.sum(Salary.NetSalary))\
        .filter(Salary.SalaryMonth == latest_salary_date).scalar() or 0
    total_previous = db_payroll.query(func.sum(Salary.NetSalary))\
        .filter(Salary.SalaryMonth == previous_salary_date).scalar() or 0

    message = None
    if total_previous == 0 and total_latest > 0:
        message = f"Tổng lương tháng {latest_salary_date} là {total_latest:,.0f} VNĐ (tháng trước là 0)."
    elif total_previous > 0:
        try:
            percentage_diff = ((float(total_latest) - float(total_previous)) / float(total_previous)) * 100
            THRESHOLD = 20.0
            if abs(percentage_diff) > THRESHOLD:
                trend = "tăng" if percentage_diff > 0 else "giảm"
                message = f"Chênh lệch lương lớn ({trend} {abs(percentage_diff):.1f}%)! Tháng {previous_salary_date}: {total_previous:,.0f} VNĐ -> Tháng {latest_salary_date}: {total_latest:,.0f} VNĐ."
        except ZeroDivisionError: pass

    if message:
        # Tạo thông báo cho Payroll Manager và Admin
        _create_alert_notification(type="payroll_discrepancy", message=message, role_target="Payroll Manager")
        _create_alert_notification(type="payroll_discrepancy", message=message, role_target="Admin")
    else:
        # Ghi log nếu không có chênh lệch đáng kể
        print(f"ALERT_SERVICE: Payroll discrepancy check OK between {previous_salary_date} and {latest_salary_date}.")


def send_monthly_payroll_emails(db_hr: Session, db_payroll: Session):
    """Gửi email lương hàng tháng (Giả lập). Không tạo thông báo trong CSDL."""
    # Lấy danh sách nhân viên active (giả sử 'Đang làm việc' là status active)
    active_employees = db_hr.query(EmployeeHR.EmployeeID, EmployeeHR.Email, EmployeeHR.FullName)\
        .filter(EmployeeHR.Status.ilike('Đang làm việc') | EmployeeHR.Status.ilike('Active'))\
        .all()
        
    # Lấy tháng lương gần nhất (giả định)
    latest_salary_date = db_payroll.query(func.max(Salary.SalaryMonth)).scalar()
    if not latest_salary_date:
        print("ALERT_SERVICE: Không có dữ liệu lương (Salary) để gửi email.")
        return
        
    print(f"SERVICE: Đang chuẩn bị gửi email lương tháng {latest_salary_date} cho {len(active_employees)} nhân viên...")
    
    # Vòng lặp gửi email (giả lập)
    for emp_id, email, full_name in active_employees:
        # Lấy lương của nhân viên này
        salary_record = db_payroll.query(Salary)\
            .filter(Salary.EmployeeID == emp_id, Salary.SalaryMonth == latest_salary_date)\
            .first()

        if salary_record:
            # (Logic giả lập gửi email giữ nguyên)
            print(f"  -> (Giả lập) Gửi email cho {email} (Lương: {salary_record.NetSalary})")
        else:
            print(f"  -> Bỏ qua {email} (Không tìm thấy bản ghi lương tháng {latest_salary_date})")
            
    print("SERVICE: Gửi email lương hàng tháng hoàn tất.")