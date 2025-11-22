# backend/crud/crud_hr.py
from fastapi import HTTPException
from sqlalchemy.orm import Session
from models import DepartmentHR, PositionHR, EmployeeHR, DepartmentPayroll, PositionPayroll
import schemas

# ==========================================
# QUẢN LÝ PHÒNG BAN (DEPARTMENTS)
# ==========================================

def get_departments(db_hr: Session):
    """Lấy danh sách từ HUMAN_2025"""
    return list(db_hr.query(DepartmentHR).all())

def create_department_synced(db_hr: Session, db_payroll: Session, dept: schemas.DepartmentCreate):
    # [cite_start]1. Tạo HR [cite: 1]
    db_dept = DepartmentHR(DepartmentName=dept.DepartmentName)
    db_hr.add(db_dept)
    try:
        db_hr.commit()
        db_hr.refresh(db_dept)
    except Exception as e:
        db_hr.rollback()
        raise HTTPException(status_code=400, detail=f"Lỗi tạo HR: {e}")

    # [cite_start]2. Đồng bộ Payroll (Integration Role) [cite: 4]
    try:
        db_p = DepartmentPayroll(DepartmentID=db_dept.DepartmentID, DepartmentName=db_dept.DepartmentName)
        db_payroll.add(db_p)
        db_payroll.commit()
    except:
        db_hr.delete(db_dept); db_hr.commit() # Rollback nếu sync lỗi
        raise HTTPException(status_code=500, detail="Lỗi đồng bộ Payroll")
    
    return db_dept

def update_department_synced(db_hr: Session, db_payroll: Session, dept_id: int, dept_update: schemas.DepartmentUpdate):
    db_dept = db_hr.get(DepartmentHR, dept_id)
    if not db_dept: return None
    
    # Update HR
    if dept_update.DepartmentName:
        db_dept.DepartmentName = dept_update.DepartmentName
        db_hr.commit()
        db_hr.refresh(db_dept)

        # Update Payroll (Mapping)
        p_dept = db_payroll.get(DepartmentPayroll, dept_id)
        if p_dept:
            p_dept.DepartmentName = dept_update.DepartmentName
            db_payroll.commit()
            
    return db_dept

def delete_department(db_hr: Session, db_payroll: Session, dept_id: int):
    """
    [cite_start]Xóa phòng ban với Ràng buộc dữ liệu[cite: 3].
    """
    # 1. KIỂM TRA RÀNG BUỘC: Có nhân viên nào thuộc phòng này không?
    has_employees = db_hr.query(EmployeeHR).filter(EmployeeHR.DepartmentID == dept_id).first()
    if has_employees:
        # Chặn hành động xóa
        raise HTTPException(
            status_code=400, 
            detail=f"Không thể xóa: Vẫn còn nhân viên đang thuộc phòng ban này (ID: {dept_id})."
        )

    # 2. Xóa Payroll trước (Khóa ngoại)
    if db_payroll.get(DepartmentPayroll, dept_id):
        db_payroll.query(DepartmentPayroll).filter(DepartmentPayroll.DepartmentID==dept_id).delete()
        db_payroll.commit()

    # 3. Xóa HR
    if db_hr.get(DepartmentHR, dept_id):
        db_hr.query(DepartmentHR).filter(DepartmentHR.DepartmentID==dept_id).delete()
        db_hr.commit()
        
    return True

# ==========================================
# QUẢN LÝ CHỨC VỤ (POSITIONS)
# ==========================================

def get_positions(db_hr: Session):
    return list(db_hr.query(PositionHR).all())

def create_position_synced(db_hr: Session, db_payroll: Session, pos: schemas.PositionCreate):
    # 1. HR
    db_pos = PositionHR(PositionName=pos.PositionName)
    db_hr.add(db_pos)
    try:
        db_hr.commit(); db_hr.refresh(db_pos)
    except Exception as e:
        db_hr.rollback(); raise HTTPException(status_code=400, detail=f"Lỗi HR: {e}")

    # 2. Payroll
    try:
        db_p = PositionPayroll(PositionID=db_pos.PositionID, PositionName=db_pos.PositionName)
        db_payroll.add(db_p); db_payroll.commit()
    except:
        db_hr.delete(db_pos); db_hr.commit()
        raise HTTPException(status_code=500, detail="Lỗi Payroll")
    return db_pos

def update_position_synced(db_hr: Session, db_payroll: Session, pos_id: int, update: schemas.PositionUpdate):
    db_pos = db_hr.get(PositionHR, pos_id)
    if not db_pos: return None
    
    if update.PositionName:
        db_pos.PositionName = update.PositionName
        db_hr.commit()
        
        p_pos = db_payroll.get(PositionPayroll, pos_id)
        if p_pos:
            p_pos.PositionName = update.PositionName
            db_payroll.commit()
    return db_pos

def delete_position(db_hr: Session, db_payroll: Session, pos_id: int):
    """
    [cite_start]Xóa chức vụ với Ràng buộc dữ liệu[cite: 3].
    """
    # 1. KIỂM TRA RÀNG BUỘC
    has_employees = db_hr.query(EmployeeHR).filter(EmployeeHR.PositionID == pos_id).first()
    if has_employees:
        raise HTTPException(
            status_code=400, 
            detail=f"Không thể xóa: Vẫn còn nhân viên giữ chức vụ này (ID: {pos_id})."
        )

    # 2. Delete Payroll & HR
    if db_payroll.get(PositionPayroll, pos_id):
        db_payroll.query(PositionPayroll).filter(PositionPayroll.PositionID==pos_id).delete()
        db_payroll.commit()
    if db_hr.get(PositionHR, pos_id):
        db_hr.query(PositionHR).filter(PositionHR.PositionID==pos_id).delete()
        db_hr.commit()
    return True