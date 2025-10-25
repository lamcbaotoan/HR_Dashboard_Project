from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db_sqlserver, get_db_mysql
from auth.auth import get_current_user
import models
import schemas
import logging

# Thiết lập logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/hr_summary")
def get_hr_report(
    db_hr: Session = Depends(get_db_sqlserver),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Báo cáo nhân sự từ database HUMAN_2025.
    """
    try:
        total_employees = db_hr.query(models.EmployeeHR).count()

        # Tạo query để lấy số lượng nhân viên theo phòng ban
        distribution_query = db_hr.query(
            models.DepartmentHR.DepartmentName,
            func.count(models.EmployeeHR.EmployeeID)
        ).join(
            models.EmployeeHR, models.EmployeeHR.DepartmentID == models.DepartmentHR.DepartmentID
        ).group_by(models.DepartmentHR.DepartmentName)

        # Duyệt qua kết quả để tránh lỗi SQLGetData với một số driver
        distribution_data = {}
        for name, count in distribution_query:
            distribution_data[name] = count

    except Exception as e:
        logger.error(f"Error getting HR report: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch HR report data.")

    return {
        "total_employees": total_employees,
        "distribution_by_dept": distribution_data
    }

@router.get("/payroll_summary")
def get_payroll_report(
    db_payroll: Session = Depends(get_db_mysql),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Báo cáo lương từ database PAYROLL.
    """
    try:
        total_budget = db_payroll.query(func.sum(models.Salary.NetSalary)).scalar()

        # Query để lấy lương trung bình theo phòng ban
        avg_salary_query = db_payroll.query(
            models.DepartmentPayroll.DepartmentName,
            func.avg(models.Salary.NetSalary)
        ).join(
            models.EmployeePayroll, models.Salary.EmployeeID == models.EmployeePayroll.EmployeeID
        ).join(
            models.DepartmentPayroll, models.EmployeePayroll.DepartmentID == models.DepartmentPayroll.DepartmentID
        ).group_by(models.DepartmentPayroll.DepartmentName)

        # Duyệt qua kết quả và chuyển đổi Decimal sang float
        avg_salary_data = {}
        for name, avg in avg_salary_query:
            avg_salary_data[name] = float(avg) if avg is not None else 0.0
            
    except Exception as e:
        logger.error(f"Error getting Payroll report: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch Payroll report data.")

    return {
        "total_salary_budget": float(total_budget) if total_budget is not None else 0.0,
        "avg_salary_by_dept": avg_salary_data
    }

@router.get("/dividend_summary")
def get_dividend_report(
    db_hr: Session = Depends(get_db_sqlserver),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Báo cáo cổ tức từ database HUMAN_2025.
    """
    try:
        total_dividends = db_hr.query(func.sum(models.Dividend.DividendAmount)).scalar()
        employee_shareholders = db_hr.query(models.Dividend.EmployeeID).distinct().count()

    except Exception as e:
        logger.error(f"Error getting Dividend report: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch Dividend report data.")

    return {
        "total_dividend_amount": float(total_dividends) if total_dividends is not None else 0.0,
        "employee_shareholders": employee_shareholders
    }