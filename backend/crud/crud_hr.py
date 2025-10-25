# backend/crud/crud_hr.py
from fastapi import HTTPException
from sqlalchemy.orm import Session
from models import DepartmentHR, PositionHR, EmployeeHR, DepartmentPayroll, PositionPayroll
import schemas

# --- Logic CRUD cho Department ---
def get_departments(db_hr: Session):
    try:
        query = db_hr.query(DepartmentHR).order_by(DepartmentHR.DepartmentID)
        # SỬA: Duyệt qua kết quả để tránh lỗi SQLGetData/Sequence Error
        results = list(query.all()) 
        return results
    except Exception as e:
        print(f"Lỗi khi lấy danh sách phòng ban: {e}")
        # Trả về lỗi thay vì list rỗng để frontend biết
        raise HTTPException(status_code=500, detail=f"Lỗi khi truy vấn phòng ban: {e}")

def create_department_synced(db_hr: Session, db_payroll: Session, dept: schemas.DepartmentCreate):
    db_dept_hr = DepartmentHR(DepartmentName=dept.DepartmentName)
    db_hr.add(db_dept_hr)
    try:
        db_hr.commit(); db_hr.refresh(db_dept_hr)
    except Exception as e:
        db_hr.rollback(); raise HTTPException(status_code=400, detail=f"Lỗi khi tạo phòng ban trong HR DB: {e}")
    
    db_dept_payroll = DepartmentPayroll(DepartmentID=db_dept_hr.DepartmentID, DepartmentName=db_dept_hr.DepartmentName)
    db_payroll.add(db_dept_payroll)
    try:
        db_payroll.commit()
    except Exception as e:
        db_payroll.rollback(); db_hr.delete(db_dept_hr); db_hr.commit()
        raise HTTPException(status_code=500, detail=f"Lỗi đồng bộ phòng ban sang Payroll DB: {e}")
    return db_dept_hr

def update_department_synced(db_hr: Session, db_payroll: Session, dept_id: int, dept_update: schemas.DepartmentUpdate):
    db_dept_hr = db_hr.get(DepartmentHR, dept_id)
    if not db_dept_hr: return None

    update_data = dept_update.dict(exclude_unset=True)
    for key, value in update_data.items(): setattr(db_dept_hr, key, value)
    
    db_hr.add(db_dept_hr)
    try:
        db_hr.commit(); db_hr.refresh(db_dept_hr)
    except Exception as e:
        db_hr.rollback(); raise HTTPException(status_code=400, detail=f"Lỗi khi cập nhật phòng ban HR DB: {e}")

    db_dept_payroll = db_payroll.get(DepartmentPayroll, dept_id)
    if db_dept_payroll and 'DepartmentName' in update_data:
        db_dept_payroll.DepartmentName = update_data['DepartmentName']
        db_payroll.add(db_dept_payroll)
        try:
            db_payroll.commit()
        except Exception as e:
            db_payroll.rollback(); print(f"CẢNH BÁO: Lỗi đồng bộ cập nhật phòng ban sang Payroll: {e}")
    return db_dept_hr

def delete_department(db_hr: Session, db_payroll: Session, dept_id: int):
    if db_hr.query(EmployeeHR).filter(EmployeeHR.DepartmentID == dept_id).first(): return False
    
    payroll_dept = db_payroll.get(DepartmentPayroll, dept_id)
    if payroll_dept:
        db_payroll.delete(payroll_dept)
        try: db_payroll.commit()
        except Exception as e: db_payroll.rollback(); raise HTTPException(status_code=500, detail=f"Lỗi xóa phòng ban từ Payroll DB: {e}")
    
    db_dept_hr = db_hr.get(DepartmentHR, dept_id)
    if db_dept_hr:
        db_hr.delete(db_dept_hr)
        try: db_hr.commit()
        except Exception as e: db_hr.rollback(); raise HTTPException(status_code=500, detail=f"Lỗi xóa phòng ban từ HR DB: {e}")
    return True

# --- Logic CRUD cho Position ---
# --- ĐẢM BẢO HÀM NÀY ĐÚNG NHƯ SAU ---
def get_positions(db_hr: Session):
    try:
        query = db_hr.query(PositionHR).order_by(PositionHR.PositionID)
        # SỬA: Duyệt qua kết quả để tránh lỗi
        results = list(query.all())
        return results
    except Exception as e:
        print(f"Lỗi khi lấy danh sách chức vụ: {e}")
        # Quan trọng: Ném lỗi ra để FastAPI xử lý và trả về 500
        raise HTTPException(status_code=500, detail=f"Lỗi khi truy vấn chức vụ: {e}")
# --- KẾT THÚC KIỂM TRA ---

def create_position_synced(db_hr: Session, db_payroll: Session, pos: schemas.PositionCreate):
    db_pos_hr = PositionHR(PositionName=pos.PositionName)
    db_hr.add(db_pos_hr)
    try:
        db_hr.commit(); db_hr.refresh(db_pos_hr)
    except Exception as e:
        db_hr.rollback(); raise HTTPException(status_code=400, detail=f"Lỗi khi tạo chức vụ trong HR DB: {e}")
    
    db_pos_payroll = PositionPayroll(PositionID=db_pos_hr.PositionID, PositionName=db_pos_hr.PositionName)
    db_payroll.add(db_pos_payroll)
    try:
        db_payroll.commit()
    except Exception as e:
        db_payroll.rollback(); db_hr.delete(db_pos_hr); db_hr.commit()
        raise HTTPException(status_code=500, detail=f"Lỗi đồng bộ chức vụ sang Payroll DB: {e}")
    return db_pos_hr

def update_position_synced(db_hr: Session, db_payroll: Session, pos_id: int, pos_update: schemas.PositionUpdate):
    db_pos_hr = db_hr.get(PositionHR, pos_id)
    if not db_pos_hr: return None

    update_data = pos_update.dict(exclude_unset=True)
    for key, value in update_data.items(): setattr(db_pos_hr, key, value)
    
    db_hr.add(db_pos_hr)
    try:
        db_hr.commit(); db_hr.refresh(db_pos_hr)
    except Exception as e:
        db_hr.rollback(); raise HTTPException(status_code=400, detail=f"Lỗi khi cập nhật chức vụ HR DB: {e}")

    db_pos_payroll = db_payroll.get(PositionPayroll, pos_id)
    if db_pos_payroll and 'PositionName' in update_data:
        db_pos_payroll.PositionName = update_data['PositionName']
        db_payroll.add(db_pos_payroll)
        try:
            db_payroll.commit()
        except Exception as e:
            db_payroll.rollback(); print(f"CẢNH BÁO: Lỗi đồng bộ cập nhật chức vụ sang Payroll: {e}")
    return db_pos_hr

def delete_position(db_hr: Session, db_payroll: Session, pos_id: int):
    if db_hr.query(EmployeeHR).filter(EmployeeHR.PositionID == pos_id).first(): return False
    
    payroll_pos = db_payroll.get(PositionPayroll, pos_id)
    if payroll_pos:
        db_payroll.delete(payroll_pos)
        try: db_payroll.commit()
        except Exception as e: db_payroll.rollback(); raise HTTPException(status_code=500, detail=f"Lỗi xóa chức vụ từ Payroll DB: {e}")
        
    db_pos_hr = db_hr.get(PositionHR, pos_id)
    if db_pos_hr:
        db_hr.delete(db_pos_hr)
        try: db_hr.commit()
        except Exception as e: db_hr.rollback(); raise HTTPException(status_code=500, detail=f"Lỗi xóa chức vụ từ HR DB: {e}")
    return True