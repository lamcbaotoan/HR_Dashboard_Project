# backend/api/v1/endpoints/shareholders.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from decimal import Decimal
import schemas
import models
from crud import crud_shareholder
from database import get_db_sqlserver, get_db_auth
# [FIX] Import thêm get_current_active_hr_manager
from auth.auth import get_current_user, get_current_active_payroll_manager, get_current_active_hr_manager

router = APIRouter()

@router.get("/", response_model=List[schemas.Shareholder])
def get_shareholders(
    db_hr: Session = Depends(get_db_sqlserver),
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_user)
):
    """Lấy danh sách cổ đông (Data từ SQLite + SQL Server)."""
    return crud_shareholder.get_shareholders_real(db_auth, db_hr)

@router.post("/", response_model=schemas.Shareholder)
def create_shareholder(
    shareholder: schemas.ShareholderCreate,
    db_hr: Session = Depends(get_db_sqlserver),
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_active_hr_manager) # Chỉ HR/Admin
):
    """Thêm/Cập nhật cổ đông vào hệ thống."""
    result = crud_shareholder.create_shareholder(db_auth, db_hr, shareholder)
    if not result:
        raise HTTPException(status_code=404, detail="Nhân viên không tồn tại trong hệ thống HR")
    
    # Trả về format đầy đủ (cần query lại tên để hiển thị đẹp, ở đây trả về cơ bản để nhanh)
    return schemas.Shareholder(
        ShareholderID=result.id,
        EmployeeID=result.employee_id,
        FullName="Updated", # Frontend sẽ reload list để lấy tên đúng
        DepartmentName="",
        Shares=result.shares,
        SharePercentage=0,
        Status=result.status,
        UnpaidDividend=0
    )

@router.post("/pay-dividends")
def create_dividend_payment(
    payment: schemas.DividendPaymentCreate,
    current_user: schemas.User = Depends(get_current_active_payroll_manager)
):
    return {"message": f"Đã ghi nhận đợt chi trả '{payment.Title}' thành công."}

@router.post("/preview-payout", response_model=schemas.DividendPayoutPreview)
def preview_dividend_payout(
    request: schemas.DividendPreviewRequest,
    db_hr: Session = Depends(get_db_sqlserver),
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_active_payroll_manager)
):
    """
    Bước 2: Tính toán tỷ lệ và số tiền cổ tức (Chưa lưu DB).
    """
    # 1. Lấy danh sách cổ đông hiện tại từ Auth DB
    shareholders = db_auth.query(models.Shareholder).filter(models.Shareholder.status == "Active").all()
    
    if not shareholders:
        raise HTTPException(status_code=400, detail="Chưa có cổ đông nào trong hệ thống.")

    # 2. Tính tổng số cổ phần
    total_shares = sum(sh.shares for sh in shareholders)
    if total_shares == 0:
        raise HTTPException(status_code=400, detail="Tổng số cổ phần bằng 0, không thể chia.")

    # 3. Tính giá trị mỗi cổ phần (Dividend Per Share)
    # Làm tròn 2 chữ số thập phân
    dividend_per_share = request.total_profit / Decimal(total_shares)

    # 4. Lấy thông tin chi tiết nhân viên từ HR để hiển thị tên
    emp_ids = [sh.employee_id for sh in shareholders]
    employees_hr = db_hr.query(models.EmployeeHR).filter(models.EmployeeHR.EmployeeID.in_(emp_ids)).all()
    emp_map = {e.EmployeeID: {"name": e.FullName, "dept": e.department.DepartmentName if e.department else "N/A"} for e in employees_hr}

    # 5. Tạo danh sách chi trả
    payout_list = []
    for sh in shareholders:
        info = emp_map.get(sh.employee_id, {"name": f"NV {sh.employee_id}", "dept": "Unknown"})
        
        # Tính tiền nhận được
        amount = Decimal(sh.shares) * dividend_per_share
        percentage = (sh.shares / total_shares) * 100

        payout_list.append(schemas.DividendItem(
            employee_id=sh.employee_id,
            full_name=info["name"],
            department_name=info["dept"],
            shares=sh.shares,
            percentage=round(percentage, 2),
            dividend_amount=round(amount, 0) # Làm tròn số tiền
        ))

    return {
        "total_shares": total_shares,
        "dividend_per_share": round(dividend_per_share, 2),
        "payout_list": payout_list
    }

@router.post("/confirm-payout")
def confirm_dividend_payout(
    data: schemas.DividendPayoutConfirm,
    db_hr: Session = Depends(get_db_sqlserver),
    current_user: schemas.User = Depends(get_current_active_payroll_manager)
):
    """
    Bước 4: Lưu lịch sử chi trả vào HUMAN_2025 (SQL Server).
    """
    try:
        # Lưu vào bảng Dividends trong SQL Server
        new_records = []
        for item in data.payout_list:
            record = models.Dividend(
                EmployeeID=item.employee_id,
                DividendAmount=item.dividend_amount,
                DividendDate=data.payment_date
            )
            new_records.append(record)
        
        db_hr.add_all(new_records)
        db_hr.commit()
        
        return {"message": f"Đã lưu đợt chi trả '{data.title}' thành công cho {len(new_records)} cổ đông."}
        
    except Exception as e:
        db_hr.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi lưu dữ liệu: {str(e)}")