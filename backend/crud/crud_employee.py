# backend/crud/crud_employee.py
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from models import (
    EmployeeHR, EmployeePayroll, DepartmentPayroll, PositionPayroll,
    DepartmentHR, PositionHR, Salary, Attendance, Dividend,
    User as AuthUser, Shareholder # [UPDATE] Import Shareholder
)
import schemas
from auth.auth import get_user_role as get_role_from_hr
from . import crud_user
from typing import Optional

# --- GET HELPERS ---
def get_employee_by_id(db_hr: Session, employee_id: int):
    return db_hr.query(EmployeeHR).filter(EmployeeHR.EmployeeID == employee_id).first()

def get_employee_by_email(db_hr: Session, email: str):
    return db_hr.query(EmployeeHR).options(
        joinedload(EmployeeHR.department),
        joinedload(EmployeeHR.position)
    ).filter(EmployeeHR.Email == email).first()

# --- MAIN CRUD ---
def get_employees(
    db_hr: Session,
    db_auth: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    position_id: Optional[int] = None,
    status: Optional[str] = None
):
    """Query với Eager Loading và Filter."""
    query = db_hr.query(EmployeeHR).options(
        joinedload(EmployeeHR.department),
        joinedload(EmployeeHR.position)
    )

    if department_id: query = query.filter(EmployeeHR.DepartmentID == department_id)
    if position_id: query = query.filter(EmployeeHR.PositionID == position_id)
    if status: query = query.filter(EmployeeHR.Status == status)

    if search:
        st = f"%{search}%"
        query = query.outerjoin(DepartmentHR).outerjoin(PositionHR)
        filters = [
            EmployeeHR.FullName.ilike(st),
            EmployeeHR.Email.ilike(st),
            DepartmentHR.DepartmentName.ilike(st),
            PositionHR.PositionName.ilike(st)
        ]
        try:
            filters.append(EmployeeHR.EmployeeID == int(search))
        except: pass
        query = query.filter(or_(*filters))

    try:
        results = query.order_by(EmployeeHR.EmployeeID).offset(skip).limit(limit).all()
        
        # Map Auth Data
        emails = [e.Email for e in results if e.Email]
        auth_map = {}
        if emails:
            users = db_auth.query(AuthUser).filter(AuthUser.email.in_(emails)).all()
            auth_map = {u.email: u for u in users}

        mapped = []
        for e in results:
            s = schemas.Employee.from_orm(e)
            if e.Email in auth_map:
                s.role = auth_map[e.Email].role
                s.auth_user_id = auth_map[e.Email].id
            mapped.append(s)
        return mapped

    except Exception as e:
        print(f"Error fetching employees: {e}")
        return []

def create_employee_synced(db_hr: Session, db_payroll: Session, db_auth: Session, employee: schemas.EmployeeCreate):
    """Tạo HR -> Đồng bộ Payroll -> Tạo Auth."""
    # 1. HR
    emp_data = employee.dict(exclude={"password"})
    db_emp = EmployeeHR(**emp_data)
    db_hr.add(db_emp)
    try:
        db_hr.commit()
        db_hr.refresh(db_emp)
    except Exception as e:
        db_hr.rollback()
        raise Exception(f"Lỗi tạo HR: {e}")

    # 2. Payroll
    try:
        # Sync Dept/Pos if missing
        if not db_payroll.get(DepartmentPayroll, db_emp.DepartmentID):
            dept = db_hr.get(DepartmentHR, db_emp.DepartmentID)
            db_payroll.add(DepartmentPayroll(DepartmentID=dept.DepartmentID, DepartmentName=dept.DepartmentName))
        
        if not db_payroll.get(PositionPayroll, db_emp.PositionID):
            pos = db_hr.get(PositionHR, db_emp.PositionID)
            db_payroll.add(PositionPayroll(PositionID=pos.PositionID, PositionName=pos.PositionName))
            
        payroll_emp = EmployeePayroll(
            EmployeeID=db_emp.EmployeeID,
            FullName=db_emp.FullName,
            DepartmentID=db_emp.DepartmentID,
            PositionID=db_emp.PositionID,
            Status=db_emp.Status
        )
        db_payroll.add(payroll_emp)
        db_payroll.commit()
    except Exception as e:
        db_hr.delete(db_emp); db_hr.commit() # Rollback HR
        db_payroll.rollback()
        raise Exception(f"Lỗi đồng bộ Payroll: {e}")

    # 3. Auth
    try:
        # Lấy Role từ Logic HR
        # Cần query lại để lấy Department/Position object cho hàm get_role
        full_emp = db_hr.query(EmployeeHR).options(joinedload(EmployeeHR.department)).get(db_emp.EmployeeID)
        role = get_role_from_hr(full_emp)
        
        user_in = schemas.UserCreate(
            full_name=employee.FullName,
            email=employee.Email,
            password=employee.password,
            role=role,
            phone_number=employee.PhoneNumber,
            employee_id_link=db_emp.EmployeeID
        )
        crud_user.create_user(db_auth, user_in)
    except Exception as e:
        # Rollback Payroll & HR (Nghiêm ngặt)
        db_payroll.query(EmployeePayroll).filter(EmployeePayroll.EmployeeID==db_emp.EmployeeID).delete()
        db_payroll.commit()
        db_hr.delete(db_emp); db_hr.commit()
        raise Exception(f"Lỗi tạo tài khoản: {e}")

    return db_emp

def update_employee_synced(db_hr: Session, db_payroll: Session, db_auth: Session, employee_id: int, employee_update: schemas.EmployeeUpdate):
    db_emp = db_hr.query(EmployeeHR).get(employee_id)
    if not db_emp: return None

    data = employee_update.dict(exclude_unset=True)
    
    # Update HR
    for k, v in data.items():
        setattr(db_emp, k, v)
    
    try:
        db_hr.commit()
        db_hr.refresh(db_emp)
    except Exception as e:
        db_hr.rollback()
        raise Exception(f"Lỗi update HR: {e}")

    # Sync Payroll (Chỉ khi có thay đổi liên quan lương/thông tin cơ bản)
    if any(k in data for k in ['DepartmentID', 'PositionID', 'Status', 'FullName']):
        p_emp = db_payroll.query(EmployeePayroll).filter(EmployeePayroll.EmployeeID == employee_id).first()
        if p_emp:
            try:
                for k in ['DepartmentID', 'PositionID', 'Status', 'FullName']:
                    if k in data: setattr(p_emp, k, data[k])
                db_payroll.commit()
            except: db_payroll.rollback()

    # Sync Auth (Role, Name)
    if any(k in data for k in ['DepartmentID', 'PositionID', 'FullName', 'PhoneNumber']):
        a_user = db_auth.query(AuthUser).filter(AuthUser.employee_id_link == employee_id).first()
        if a_user:
            try:
                if 'FullName' in data: a_user.full_name = data['FullName']
                if 'PhoneNumber' in data: a_user.phone_number = data['PhoneNumber']
                # Recalculate Role
                if 'DepartmentID' in data or 'PositionID' in data:
                    # Cần refresh object để lấy quan hệ mới
                    db_hr.refresh(db_emp, attribute_names=['department']) 
                    a_user.role = get_role_from_hr(db_emp)
                db_auth.commit()
            except: db_auth.rollback()

    return db_emp

def delete_employee_synced(db_hr: Session, db_payroll: Session, db_auth: Session, employee_id: int):
    """
    Xóa nhân viên với kiểm tra ràng buộc.
    """
    # [UPDATE] RÀNG BUỘC CỔ ĐÔNG (Quan trọng cho HR Manager)
    is_shareholder = db_auth.query(Shareholder).filter(
        Shareholder.employee_id == employee_id, 
        Shareholder.shares > 0
    ).first()
    if is_shareholder:
        raise HTTPException(
            status_code=400, 
            detail=f"KHÔNG THỂ XÓA: Nhân viên đang là Cổ đông ({is_shareholder.shares} CP). Vui lòng thu hồi cổ phần trước."
        )

    # 1. RÀNG BUỘC 1: CỔ TỨC (HUMAN)
    if db_hr.query(Dividend).filter(Dividend.EmployeeID == employee_id).first():
        raise HTTPException(status_code=400, detail=f"KHÔNG THỂ XÓA: Nhân viên có lịch sử nhận Cổ tức.")

    # 2. RÀNG BUỘC 2: LƯƠNG (PAYROLL)
    if db_payroll.query(Salary).filter(Salary.EmployeeID == employee_id).first():
         raise HTTPException(status_code=400, detail=f"KHÔNG THỂ XÓA: Nhân viên có dữ liệu Lương.")

    # 3. Tiến hành xóa (Auth -> Payroll -> HR)
    try:
        # Auth
        db_auth.query(AuthUser).filter(AuthUser.employee_id_link == employee_id).delete()
        db_auth.query(Shareholder).filter(Shareholder.employee_id == employee_id).delete() # Xóa record cổ đông rỗng nếu có
        db_auth.commit()

        # Payroll
        db_payroll.query(Attendance).filter(Attendance.EmployeeID == employee_id).delete()
        db_payroll.query(EmployeePayroll).filter(EmployeePayroll.EmployeeID == employee_id).delete()
        db_payroll.commit()

        # HR
        db_hr.query(EmployeeHR).filter(EmployeeHR.EmployeeID == employee_id).delete()
        db_hr.commit()
        
    except Exception as e:
        print(f"Error deleting employee {employee_id}: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi xóa dữ liệu.")

    return True