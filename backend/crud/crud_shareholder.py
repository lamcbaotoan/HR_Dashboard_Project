# backend/crud/crud_shareholder.py
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import Shareholder, EmployeeHR, DepartmentHR, Dividend
import schemas
from decimal import Decimal

def get_shareholders_real(db_auth: Session, db_hr: Session):
    """
    Lấy danh sách cổ đông.
    1. Lấy dữ liệu cổ phần từ dashboard_auth.db (SQLite).
    2. Lấy thông tin nhân viên từ HUMAN_2025 (SQL Server).
    3. Ghép lại để hiển thị.
    """
    # 1. Lấy danh sách cổ đông đã lưu trong Auth DB
    shareholders_db = db_auth.query(Shareholder).all()
    
    if not shareholders_db:
        return []

    # Lấy list ID để query SQL Server 1 lần
    emp_ids = [s.employee_id for s in shareholders_db]

    # 2. Query thông tin nhân viên từ HR DB
    employees_hr = db_hr.query(
        EmployeeHR.EmployeeID, 
        EmployeeHR.FullName, 
        DepartmentHR.DepartmentName
    ).join(
        DepartmentHR, EmployeeHR.DepartmentID == DepartmentHR.DepartmentID
    ).filter(
        EmployeeHR.EmployeeID.in_(emp_ids)
    ).all()

    # Tạo map để tra cứu nhanh: ID -> {Name, Dept}
    emp_map = {e.EmployeeID: {"name": e.FullName, "dept": e.DepartmentName} for e in employees_hr}

    # 3. Tính tổng cổ tức đã nhận (từ SQL Server)
    dividends = db_hr.query(
        Dividend.EmployeeID,
        func.sum(Dividend.DividendAmount).label("total")
    ).filter(
        Dividend.EmployeeID.in_(emp_ids)
    ).group_by(Dividend.EmployeeID).all()
    
    div_map = {d.EmployeeID: d.total for d in dividends}

    # 4. Ghép dữ liệu
    result = []
    total_shares_company = 1000000 # Giả định tổng cổ phần công ty để tính %

    for sh in shareholders_db:
        info = emp_map.get(sh.employee_id, {"name": "Unknown", "dept": "Unknown"})
        total_div = div_map.get(sh.employee_id, Decimal(0))
        
        percent = (sh.shares / total_shares_company) * 100

        result.append(schemas.Shareholder(
            ShareholderID=sh.id,
            EmployeeID=sh.employee_id,
            FullName=info["name"],
            DepartmentName=info["dept"],
            Shares=sh.shares,
            SharePercentage=round(percent, 4),
            Status=sh.status,
            UnpaidDividend=total_div # Hiển thị tổng đã nhận hoặc logic khác tùy business
        ))
    
    return result

# --- [THÊM MỚI] Hàm này sẽ chạy khi khởi động server ---
def sync_all_employees_to_shareholders(db_auth: Session, db_hr: Session):
    """
    Tự động quét toàn bộ nhân viên từ HR (SQL Server).
    Nếu nhân viên chưa có trong bảng Shareholders (SQLite), sẽ tự động thêm vào.
    """
    try:
        # 1. Lấy tất cả nhân viên đang làm việc từ HR
        employees = db_hr.query(EmployeeHR).all()
        
        added_count = 0
        for emp in employees:
            # Kiểm tra xem đã có trong bảng Shareholder chưa
            exists = db_auth.query(Shareholder).filter(Shareholder.employee_id == emp.EmployeeID).first()
            
            if not exists:
                # Logic giả định số cổ phần ban đầu dựa trên chức vụ
                # 5: Giám đốc, 4: Trưởng phòng... (Dựa trên data mẫu của bạn)
                initial_shares = 0
                if emp.PositionID == 5: initial_shares = 5000
                elif emp.PositionID == 4: initial_shares = 2000
                elif emp.PositionID == 3: initial_shares = 1000
                else: initial_shares = 100 # Nhân viên thường tặng 100 cổ phần tượng trưng

                new_sh = Shareholder(
                    employee_id=emp.EmployeeID,
                    shares=initial_shares,
                    status="Active" if emp.Status == "Đang làm việc" else "Inactive"
                )
                db_auth.add(new_sh)
                added_count += 1
        
        if added_count > 0:
            db_auth.commit()
            print(f"✅ [AUTO-SYNC] Đã đồng bộ thêm {added_count} nhân viên vào danh sách Cổ đông.")
        else:
            print("✅ [AUTO-SYNC] Danh sách cổ đông đã đồng bộ (không có nhân viên mới).")
            
    except Exception as e:
        db_auth.rollback()
        print(f"❌ [AUTO-SYNC ERROR] Lỗi đồng bộ cổ đông: {e}")
        
def create_shareholder(db_auth: Session, db_hr: Session, shareholder_in: schemas.ShareholderCreate):
    """Thêm cổ đông mới vào SQLite, kiểm tra ID tồn tại bên HR."""
    # Kiểm tra nhân viên có tồn tại bên HR không
    emp = db_hr.query(EmployeeHR).filter(EmployeeHR.EmployeeID == shareholder_in.EmployeeID).first()
    if not emp:
        return None # Hoặc raise Exception

    # Kiểm tra đã tồn tại trong bảng Shareholder chưa
    existing = db_auth.query(Shareholder).filter(Shareholder.employee_id == shareholder_in.EmployeeID).first()
    if existing:
        # Update nếu đã có
        existing.shares = shareholder_in.Shares
        existing.status = shareholder_in.Status
        db_auth.commit()
        db_auth.refresh(existing)
        return existing

    # Tạo mới
    db_obj = Shareholder(
        employee_id=shareholder_in.EmployeeID,
        shares=shareholder_in.Shares,
        status=shareholder_in.Status
    )
    db_auth.add(db_obj)
    db_auth.commit()
    db_auth.refresh(db_obj)
    return db_obj