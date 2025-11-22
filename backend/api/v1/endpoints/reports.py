# backend/api/v1/endpoints/reports.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from database import get_db_sqlserver, get_db_mysql, get_db_auth
from auth.auth import get_current_user
import models
import schemas
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/dashboard-summary")
def get_dashboard_summary(
    db_hr: Session = Depends(get_db_sqlserver),
    db_payroll: Session = Depends(get_db_mysql),
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    API Tổng hợp dữ liệu Dashboard (HR + Payroll + Dividends).
    """
    try:
        # --- 1. NHÂN SỰ (HUMAN_2025) ---
        # [FIX] Thay .count() bằng func.count(...) để tránh lỗi cursor trên SQL Server
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

        # --- 2. TÀI CHÍNH & LƯƠNG (PAYROLL) ---
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
                func.sum(models.Salary.NetSalary)
            ).select_from(models.Salary)\
             .join(models.EmployeePayroll, models.Salary.EmployeeID == models.EmployeePayroll.EmployeeID)\
             .join(models.DepartmentPayroll, models.EmployeePayroll.DepartmentID == models.DepartmentPayroll.DepartmentID)\
             .filter(models.Salary.SalaryMonth == latest_salary_month)\
             .group_by(models.DepartmentPayroll.DepartmentName).all()
            
            salary_by_dept = [{"name": a[0], "value": float(a[1])} for a in dist_query]

            trend_query = db_payroll.query(
                models.Salary.SalaryMonth, func.sum(models.Salary.NetSalary)
            ).group_by(models.Salary.SalaryMonth)\
             .order_by(models.Salary.SalaryMonth.desc())\
             .limit(6).all()
            salary_trend_data = [{"name": str(t[0]), "value": float(t[1])} for t in reversed(trend_query)]

        # --- 3. CỔ TỨC (HUMAN_2025) ---
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
        # Trả về data rỗng để FE không crash
        return {
             "hr_metrics": {"total_employees": 0, "shareholder_count": 0, "department_distribution": [], "status_distribution": []},
             "payroll_metrics": {"current_month": None, "total_salary_budget": 0, "total_base_salary": 0, "total_bonus": 0, "salary_by_dept": [], "salary_trend": []},
             "financial_metrics": {"total_dividends": 0}
        }

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