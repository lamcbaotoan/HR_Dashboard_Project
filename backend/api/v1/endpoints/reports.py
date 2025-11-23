# backend/api/v1/endpoints/reports.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, extract, and_
from datetime import date, timedelta
from database import get_db_sqlserver, get_db_mysql, get_db_auth
from auth.auth import get_current_user
import models
import schemas
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# ... (Giữ nguyên API get_dashboard_summary cũ cho Admin/Manager) ...
@router.get("/dashboard-summary")
def get_dashboard_summary(
    db_hr: Session = Depends(get_db_sqlserver),
    db_payroll: Session = Depends(get_db_mysql),
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_user)
):
    # ... (Code cũ giữ nguyên) ...
    try:
        total_employees = db_hr.query(func.count(models.EmployeeHR.EmployeeID)).scalar() or 0
        shareholder_count = db_auth.query(models.Shareholder).filter(models.Shareholder.status == "Active").count()

        dept_dist = db_hr.query(
            models.DepartmentHR.DepartmentName, func.count(models.EmployeeHR.EmployeeID)
        ).select_from(models.EmployeeHR).join(
            models.DepartmentHR, models.EmployeeHR.DepartmentID == models.DepartmentHR.DepartmentID
        ).group_by(models.DepartmentHR.DepartmentName).all()
        dept_data = [{"name": d[0], "value": d[1]} for d in dept_dist]

        status_dist = db_hr.query(
            models.EmployeeHR.Status, func.count(models.EmployeeHR.EmployeeID)
        ).group_by(models.EmployeeHR.Status).all()
        status_data = [{"name": s[0] or "Unknown", "value": s[1]} for s in status_dist]

        latest_salary_month = db_payroll.query(func.max(models.Salary.SalaryMonth)).scalar()
        total_salary = 0
        total_base = 0 
        total_bonus = 0 
        salary_by_dept = [] 
        salary_trend_data = []
        
        if latest_salary_month:
            totals = db_payroll.query(
                func.sum(models.Salary.NetSalary),
                func.sum(models.Salary.BaseSalary),
                func.sum(models.Salary.Bonus)
            ).filter(models.Salary.SalaryMonth == latest_salary_month).first()
            
            total_salary = totals[0] or 0
            total_base = totals[1] or 0
            total_bonus = totals[2] or 0
            
            dist_query = db_payroll.query(
                models.DepartmentPayroll.DepartmentName, 
                func.avg(models.Salary.NetSalary) # Sửa thành AVG
            ).select_from(models.Salary)\
             .join(models.EmployeePayroll, models.Salary.EmployeeID == models.EmployeePayroll.EmployeeID)\
             .join(models.DepartmentPayroll, models.EmployeePayroll.DepartmentID == models.DepartmentPayroll.DepartmentID)\
             .filter(models.Salary.SalaryMonth == latest_salary_month)\
             .group_by(models.DepartmentPayroll.DepartmentName).all()
            
            salary_by_dept = [{"name": a[0], "value": int(a[1]) if a[1] else 0} for a in dist_query]

            trend_query = db_payroll.query(
                models.Salary.SalaryMonth, func.sum(models.Salary.NetSalary)
            ).group_by(models.Salary.SalaryMonth)\
             .order_by(models.Salary.SalaryMonth.desc())\
             .limit(6).all()
            salary_trend_data = [{"name": str(t[0]), "value": float(t[1])} for t in reversed(trend_query)]

        total_dividends = db_hr.query(func.sum(models.Dividend.DividendAmount)).scalar() or 0

        return {
            "hr_metrics": {
                "total_employees": total_employees,
                "shareholder_count": shareholder_count,
                "department_distribution": dept_data,
                "status_distribution": status_data
            },
            "payroll_metrics": {
                "current_month": latest_salary_month,
                "total_salary_budget": float(total_salary),
                "total_base_salary": float(total_base), 
                "total_bonus": float(total_bonus),       
                "salary_by_dept": salary_by_dept,
                "salary_trend": salary_trend_data
            },
            "financial_metrics": {
                "total_dividends": float(total_dividends)
            }
        }
    except Exception as e:
        logger.error(f"Dashboard Data Error: {e}")
        return {
             "hr_metrics": {"total_employees": 0, "shareholder_count": 0, "department_distribution": [], "status_distribution": []},
             "payroll_metrics": {"current_month": None, "total_salary_budget": 0, "total_base_salary": 0, "total_bonus": 0, "salary_by_dept": [], "salary_trend": []},
             "financial_metrics": {"total_dividends": 0}
        }

# ... (Giữ nguyên API dividend_summary) ...
@router.get("/dividend_summary")
def get_dividend_report(
    db_hr: Session = Depends(get_db_sqlserver),
    db_auth: Session = Depends(get_db_auth), 
    current_user: schemas.User = Depends(get_current_user)
):
    try:
        total_dividends = db_hr.query(func.sum(models.Dividend.DividendAmount)).scalar() or 0
        shareholder_count = db_auth.query(models.Shareholder).count()

        top_shareholders = db_hr.query(
            models.EmployeeHR.FullName,
            func.sum(models.Dividend.DividendAmount).label("total")
        ).join(models.Dividend, models.EmployeeHR.EmployeeID == models.Dividend.EmployeeID)\
         .group_by(models.EmployeeHR.FullName)\
         .order_by(func.sum(models.Dividend.DividendAmount).desc())\
         .limit(5).all()

        top_list = [{"name": name, "total": float(amount)} for name, amount in top_shareholders]

        if not top_list:
            top_shares = db_auth.query(models.Shareholder).order_by(desc(models.Shareholder.shares)).limit(5).all()
            emp_ids = [s.employee_id for s in top_shares]
            employees = db_hr.query(models.EmployeeHR).filter(models.EmployeeHR.EmployeeID.in_(emp_ids)).all()
            emp_map = {e.EmployeeID: e.FullName for e in employees}
            top_list = [{"name": emp_map.get(s.employee_id, f"NV {s.employee_id}"), "total": s.shares} for s in top_shares]

    except Exception as e:
        logger.error(f"Error getting Dividend report: {e}")
        return {"total_dividend_amount": 0, "employee_shareholders": 0, "top_shareholders": []}

    return {
        "total_dividend_amount": float(total_dividends),
        "employee_shareholders": shareholder_count,
        "employee_shareholders_count": shareholder_count,
        "top_shareholders": top_list
    }

# [NEW] API Dashboard dành riêng cho Employee
@router.get("/my-dashboard-summary")
def get_my_dashboard_summary(
    db_hr: Session = Depends(get_db_sqlserver),
    db_payroll: Session = Depends(get_db_mysql),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    API tổng hợp dữ liệu cho Dashboard cá nhân của nhân viên.
    Nguồn: HUMAN_2025 (Info) + PAYROLL (Attendance, Salary).
    """
    if not current_user.employee_id_link:
        raise HTTPException(status_code=400, detail="Tài khoản chưa liên kết hồ sơ nhân viên.")

    emp_id = current_user.employee_id_link
    today = date.today()
    
    # --- 1. THÔNG TIN CÁ NHÂN (Nguồn: HUMAN_2025) ---
    emp_info = db_hr.query(models.EmployeeHR).options(
        joinedload(models.EmployeeHR.position)
    ).filter(models.EmployeeHR.EmployeeID == emp_id).first()
    
    position_name = emp_info.position.PositionName if emp_info and emp_info.position else "N/A"

    # --- 2. NGÀY CÔNG THÁNG HIỆN TẠI (Nguồn: PAYROLL - Attendance) ---
    # Lấy bản ghi chấm công tháng này
    attendance_curr = db_payroll.query(models.Attendance).filter(
        models.Attendance.EmployeeID == emp_id,
        extract('month', models.Attendance.AttendanceMonth) == today.month,
        extract('year', models.Attendance.AttendanceMonth) == today.year
    ).first()
    
    work_days = attendance_curr.WorkDays if attendance_curr else 0
    standard_days = 22 # Giả định công chuẩn là 22
    
    # --- 3. PHÉP NĂM (Nguồn: PAYROLL - Tính tổng LeaveDays trong năm) ---
    total_leave_used = db_payroll.query(func.sum(models.Attendance.LeaveDays)).filter(
        models.Attendance.EmployeeID == emp_id,
        extract('year', models.Attendance.AttendanceMonth) == today.year
    ).scalar() or 0
    
    MAX_LEAVE = 12
    leave_remaining = MAX_LEAVE - int(total_leave_used)

    # --- 4. LƯƠNG THÁNG TRƯỚC (Nguồn: PAYROLL - Salaries) ---
    # Tìm tháng trước (Logic đơn giản: Lấy bản ghi mới nhất không phải tháng này, hoặc mới nhất)
    salary_prev = db_payroll.query(models.Salary).filter(
        models.Salary.EmployeeID == emp_id
    ).order_by(models.Salary.SalaryMonth.desc()).first()
    
    net_salary = float(salary_prev.NetSalary) if salary_prev else 0
    salary_month_str = str(salary_prev.SalaryMonth) if salary_prev else "N/A"

    # --- 5. THÔNG BÁO (Logic tổng hợp) ---
    notifications = []
    
    # Check Sinh nhật (Từ HR)
    if emp_info and emp_info.DateOfBirth:
        if emp_info.DateOfBirth.month == today.month and emp_info.DateOfBirth.day == today.day:
            notifications.append({"type": "gift", "message": "🎂 Chúc mừng sinh nhật bạn! Công ty gửi lời chúc tốt đẹp nhất."})
            
    # Check Quên chấm công (Từ Payroll - Absent > 0 trong tháng này)
    if attendance_curr and attendance_curr.AbsentDays > 0:
        notifications.append({"type": "alert", "message": f"⚠️ Bạn có {attendance_curr.AbsentDays} ngày vắng mặt tháng này. Vui lòng giải trình."})

    return {
        "personal_info": {
            "full_name": emp_info.FullName if emp_info else current_user.full_name,
            "position": position_name
        },
        "attendance": {
            "current_work_days": work_days,
            "standard_days": standard_days,
            "progress_percent": (work_days / standard_days) * 100
        },
        "leave": {
            "total": MAX_LEAVE,
            "used": int(total_leave_used),
            "remaining": leave_remaining
        },
        "salary": {
            "month": salary_month_str,
            "net_amount": net_salary
        },
        "notifications": notifications
    }