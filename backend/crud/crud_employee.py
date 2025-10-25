# backend/crud/crud_employee.py
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from models import (
    EmployeeHR, EmployeePayroll, DepartmentPayroll, PositionPayroll,
    DepartmentHR, PositionHR, Salary, Attendance, Dividend,
    User as AuthUser
)
import schemas
from auth.auth import get_user_role as get_role_from_hr
from . import crud_user
from core.security import get_password_hash
from typing import Optional

def get_employee_by_id(db_hr: Session, employee_id: int):
    """Lấy thông tin một nhân viên theo ID từ CSDL HR."""
    return db_hr.query(EmployeeHR).filter(EmployeeHR.EmployeeID == employee_id).first()

def get_employee_by_email(db_hr: Session, email: str):
    """Lấy thông tin một nhân viên theo email, join sẵn phòng ban và chức vụ."""
    return db_hr.query(EmployeeHR).options(
        joinedload(EmployeeHR.department),
        joinedload(EmployeeHR.position)
    ).filter(EmployeeHR.Email == email).first()

# --- HÀM ĐÃ SỬA ĐỂ FIX LỖI PYODBC ---
def get_employees(
    db_hr: Session,
    db_auth: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    position_id: Optional[int] = None,
    status: Optional[str] = None):
    """
    Lấy danh sách nhân viên HR, eager load, hỗ trợ tìm kiếm/lọc,
    và tối ưu hóa join với CSDL Auth, xử lý lỗi pyodbc.
    """
    # 1. Build query for HR DB (SQL Server)
    query = db_hr.query(EmployeeHR).options(
        joinedload(EmployeeHR.department),
        joinedload(EmployeeHR.position)
    )

    if department_id:
        query = query.filter(EmployeeHR.DepartmentID == department_id)
    if position_id:
        query = query.filter(EmployeeHR.PositionID == position_id)
    if status:
        query = query.filter(EmployeeHR.Status == status)

    if search:
        search_term_like = f"%{search}%"
        # Cần join ở đây để lọc theo tên Department/Position
        query = query.outerjoin(DepartmentHR).outerjoin(PositionHR) 
        search_filters = [
            EmployeeHR.FullName.ilike(search_term_like),
            EmployeeHR.Email.ilike(search_term_like),
            DepartmentHR.DepartmentName.ilike(search_term_like),
            PositionHR.PositionName.ilike(search_term_like)
        ]
        try:
            search_id = int(search)
            search_filters.append(EmployeeHR.EmployeeID == search_id)
        except ValueError:
            pass
        query = query.filter(or_(*search_filters))

    # Apply ordering, skip, limit
    query = query.order_by(EmployeeHR.EmployeeID).offset(skip).limit(limit)

    # 2. Execute HR query and *immediately* fetch all results into a list
    # Đây là bước quan trọng để fix lỗi pyodbc
    try:
        # Sử dụng .all() để trả về một list
        hr_employees = query.all()
    except Exception as e:
        # Log lỗi cụ thể khi fetch từ SQL Server
        print(f"ERROR fetching from SQL Server in get_employees: {e}")
        # Báo lỗi HTTPException để FastAPI xử lý
        raise HTTPException(status_code=500, detail=f"Database error fetching employee list: {e}")

    # 3. Lấy emails để truy vấn CSDL Auth
    emails = [emp.Email for emp in hr_employees if emp.Email]
    auth_map = {} # Khởi tạo map rỗng

    if emails:
        # 4. Truy vấn CSDL Auth (SQLite) riêng biệt
        try:
            # Lấy tất cả user khớp trong 1 lần query
            auth_users_list = db_auth.query(AuthUser).filter(AuthUser.email.in_(emails)).all()
            # Tạo một lookup map
            auth_map = {user.email: user for user in auth_users_list}
        except Exception as e:
            # Log lỗi khi fetch từ Auth DB nhưng có thể tiếp tục
            print(f"WARNING fetching from Auth DB in get_employees: {e}")
            # Tùy yêu cầu, bạn có thể raise HTTPException ở đây

    # 5. Kết hợp kết quả trong Python
    results = []
    for emp_hr in hr_employees:
        # Chuyển đổi HR employee sang Pydantic schema
        # Sẽ không lỗi lazy loading vì đã dùng joinedload
        try:
            emp_schema = schemas.Employee.from_orm(emp_hr)
        except Exception as e:
             print(f"ERROR converting EmployeeHR (ID: {emp_hr.EmployeeID}) to schema: {e}")
             # Bỏ qua nhân viên này hoặc xử lý lỗi
             continue

        # Tra cứu thông tin Auth user từ map
        auth_user = auth_map.get(emp_hr.Email)
        if auth_user:
            emp_schema.role = auth_user.role
            emp_schema.auth_user_id = auth_user.id
        
        results.append(emp_schema)

    return results
# --- KẾT THÚC HÀM SỬA ---


def create_employee_synced(db_hr: Session, db_payroll: Session, db_auth: Session, employee: schemas.EmployeeCreate):
    """Thêm nhân viên mới, đồng bộ sang PAYROLL và CSDL AUTH, xử lý giao dịch an toàn."""

    # 1. Tạo trong HR DB
    employee_data = employee.dict(exclude={"password"})
    db_employee_hr = EmployeeHR(**employee_data)
    db_hr.add(db_employee_hr)
    try:
        db_hr.commit()
        db_hr.refresh(db_employee_hr)
    except Exception as e:
        db_hr.rollback()
        raise HTTPException(status_code=400, detail=f"Lỗi khi tạo nhân viên trong HR DB: {e}")

    # 2. Đồng bộ sang Payroll DB
    db_employee_payroll = None
    try:
        # Đồng bộ Department và Position nếu chưa tồn tại
        dept_hr = db_hr.get(DepartmentHR, db_employee_hr.DepartmentID)
        if dept_hr and not db_payroll.get(DepartmentPayroll, dept_hr.DepartmentID):
            db_payroll.add(DepartmentPayroll(DepartmentID=dept_hr.DepartmentID, DepartmentName=dept_hr.DepartmentName))

        pos_hr = db_hr.get(PositionHR, db_employee_hr.PositionID)
        if pos_hr and not db_payroll.get(PositionPayroll, pos_hr.PositionID):
            db_payroll.add(PositionPayroll(PositionID=pos_hr.PositionID, PositionName=pos_hr.PositionName))

        db_employee_payroll = EmployeePayroll(
            EmployeeID=db_employee_hr.EmployeeID,
            FullName=db_employee_hr.FullName,
            DepartmentID=db_employee_hr.DepartmentID,
            PositionID=db_employee_hr.PositionID,
            Status=db_employee_hr.Status
        )
        db_payroll.add(db_employee_payroll)
        db_payroll.commit()
    except Exception as e_payroll:
        # Nếu Payroll lỗi, hoàn tác HR
        db_hr.delete(db_employee_hr)
        db_hr.commit()
        db_payroll.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi đồng bộ nhân viên sang Payroll DB: {e_payroll}. Thao tác đã được hoàn tác.")

    # 3. Đồng bộ sang Auth DB
    try:
        # SỬA: Cần lấy lại db_employee_hr với joinload để get_role_from_hr hoạt động
        db_employee_hr_joined = db_hr.query(EmployeeHR).options(
            joinedload(EmployeeHR.department),
            joinedload(EmployeeHR.position)
        ).filter(EmployeeHR.EmployeeID == db_employee_hr.EmployeeID).first()

        role = get_role_from_hr(db_employee_hr_joined) # Dùng bản đã join
        auth_user_in = schemas.UserCreate(
            full_name=employee.FullName,
            email=employee.Email,
            password=employee.password, # crud_user.create_user sẽ tự động băm
            role=role,
            phone_number=employee.PhoneNumber,
            employee_id_link=db_employee_hr.EmployeeID
        )
        # Dùng hàm create_user đã có sẵn logic băm mật khẩu
        crud_user.create_user(db_auth, auth_user_in)
    except Exception as e_auth:
        # Nếu Auth lỗi, hoàn tác cả HR và Payroll
        db_hr.delete(db_employee_hr)
        db_hr.commit()

        if db_employee_payroll:
            # Query lại employee payroll để xóa (nếu đã commit thành công)
            emp_payroll_to_delete = db_payroll.get(EmployeePayroll, db_employee_payroll.EmployeeID)
            if emp_payroll_to_delete:
                db_payroll.delete(emp_payroll_to_delete)
                db_payroll.commit()

        raise HTTPException(status_code=500, detail=f"Lỗi đồng bộ nhân viên sang Auth DB: {e_auth}. Mọi thao tác đã được hoàn tác.")

    # Trả về bản đã join
    return db_employee_hr_joined

def update_employee_synced(db_hr: Session, db_payroll: Session, db_auth: Session, employee_id: int, employee_update: schemas.EmployeeUpdate):
    """Cập nhật nhân viên, đồng bộ sang PAYROLL và AUTH."""

    # 1. Cập nhật HR DB
    # SỬA: Query có joinedload
    db_employee_hr = db_hr.query(EmployeeHR).options(
        joinedload(EmployeeHR.department),
        joinedload(EmployeeHR.position)
    ).filter(EmployeeHR.EmployeeID == employee_id).first()

    if not db_employee_hr:
        return None

    update_data = employee_update.dict(exclude_unset=True)
    payroll_sync_needed = any(key in ["DepartmentID", "PositionID", "Status", "FullName"] for key in update_data)

    for key, value in update_data.items():
        setattr(db_employee_hr, key, value)
    db_hr.add(db_employee_hr)
    try:
        db_hr.commit()
        # Refresh là quan trọng để cập nhật relationships nếu chúng thay đổi
        db_hr.refresh(db_employee_hr, attribute_names=['department', 'position'])
    except Exception as e:
        db_hr.rollback()
        raise HTTPException(status_code=400, detail=f"Lỗi khi cập nhật nhân viên trong HR DB: {e}")

    # 2. Đồng bộ Payroll DB (Không làm gián đoạn nếu lỗi)
    if payroll_sync_needed:
        db_employee_payroll = db_payroll.query(EmployeePayroll).filter(EmployeePayroll.EmployeeID == employee_id).first()
        if db_employee_payroll:
            try:
                for key in ["DepartmentID", "PositionID", "Status", "FullName"]:
                    if key in update_data:
                        setattr(db_employee_payroll, key, update_data[key])
                db_payroll.add(db_employee_payroll)
                db_payroll.commit()
            except Exception as e:
                db_payroll.rollback()
                print(f"CẢNH BÁO: Lỗi đồng bộ cập nhật sang Payroll DB: {e}. Dữ liệu HR đã được cập nhật.")

    # 3. Đồng bộ Auth DB (Không làm gián đoạn nếu lỗi)
    auth_user = db_auth.query(AuthUser).filter(AuthUser.employee_id_link == employee_id).first()
    if auth_user:
        try:
            # Cập nhật các trường có thể thay đổi
            if 'FullName' in update_data:
                auth_user.full_name = update_data['FullName']
            if 'PhoneNumber' in update_data:
                auth_user.phone_number = update_data['PhoneNumber']

            # Cập nhật vai trò nếu phòng ban/chức vụ thay đổi
            if "DepartmentID" in update_data or "PositionID" in update_data:
                # db_employee_hr đã được refresh sau khi commit HR
                auth_user.role = get_role_from_hr(db_employee_hr)

            db_auth.add(auth_user)
            db_auth.commit()
        except Exception as e:
            db_auth.rollback()
            print(f"CẢNH BÁO: Lỗi đồng bộ cập nhật sang Auth DB: {e}.")

    return db_employee_hr

def delete_employee_synced(db_hr: Session, db_payroll: Session, db_auth: Session, employee_id: int):
    """Xóa nhân viên ở cả 3 CSDL, có kiểm tra ràng buộc dữ liệu."""

    # 1. Kiểm tra ràng buộc dữ liệu quan trọng
    has_dividends = db_hr.query(Dividend).filter(Dividend.EmployeeID == employee_id).first()
    has_salaries = db_payroll.query(Salary).filter(Salary.EmployeeID == employee_id).first()
    if has_dividends or has_salaries:
        # Nếu có lương hoặc cổ tức, không cho phép xóa
        return False

    # 2. Xóa khỏi CSDL Auth (Nếu lỗi sẽ dừng)
    auth_user = db_auth.query(AuthUser).filter(AuthUser.employee_id_link == employee_id).first()
    if auth_user:
        try:
            db_auth.delete(auth_user)
            db_auth.commit()
        except Exception as e:
            db_auth.rollback()
            raise HTTPException(status_code=500, detail=f"Lỗi khi xóa nhân viên từ Auth DB: {e}")

    # 3. Xóa khỏi CSDL Payroll (Xóa dữ liệu phụ thuộc trước)
    try:
        # Xóa các bản ghi chấm công liên quan
        db_payroll.query(Attendance).filter(Attendance.EmployeeID == employee_id).delete(synchronize_session=False)
        # Xóa bản ghi nhân viên
        db_payroll.query(EmployeePayroll).filter(EmployeePayroll.EmployeeID == employee_id).delete(synchronize_session=False)
        db_payroll.commit()
    except Exception as e:
        db_payroll.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa nhân viên từ Payroll DB: {e}")

    # 4. Xóa khỏi CSDL HR (Xóa cuối cùng)
    db_employee_hr = get_employee_by_id(db_hr, employee_id)
    if db_employee_hr:
        try:
            db_hr.delete(db_employee_hr)
            db_hr.commit()
        except Exception as e:
            db_hr.rollback()
            # Nếu đến bước này mà lỗi (ví dụ do ràng buộc khóa ngoại chưa xử lý),
            # Giao dịch Auth và Payroll vẫn thành công, nhưng cần báo lỗi
            raise HTTPException(status_code=500, detail=f"Lỗi khi xóa nhân viên từ HR DB: {e}")

    return True