# backend/api/v1/endpoints/employees.py
from fastapi import APIRouter, Depends, HTTPException, status as http_status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional

import schemas
from crud import crud_employee, crud_payroll, crud_user, crud_system
from database import get_db_sqlserver, get_db_mysql, get_db_auth
from auth.auth import get_current_user

router = APIRouter()

# --- HÀM PHỤ TRỢ: GHI LOG CHẠY NGẦM ---
def bg_audit_log(db_auth: Session, user_email: str, action: str, target: str, details: str):
    try:
        crud_system.create_audit_log(db_auth, user_email, action, target, details)
    except Exception as e:
        print(f"Lỗi ghi Audit Log: {e}")

# 1. HIỂN THỊ & TÌM KIẾM (Giữ nguyên)
@router.get("/", response_model=List[schemas.Employee])
def read_employees(
    skip: int = 0, limit: int = 100, search: Optional[str] = None,
    department_id: Optional[int] = None, position_id: Optional[int] = None, status: Optional[str] = None,
    db_hr: Session = Depends(get_db_sqlserver), db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_user)
):
    allowed_roles = ["Admin", "HR Manager", "Payroll Manager", "ADMIN"]
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Không đủ quyền truy cập.")

    return crud_employee.get_employees(db_hr, db_auth, skip, limit, search, department_id, position_id, status)

# 2. THÊM MỚI NHÂN VIÊN (Giữ nguyên)
@router.post("/", response_model=schemas.Employee, status_code=http_status.HTTP_201_CREATED)
def create_employee(
    employee: schemas.EmployeeCreate, background_tasks: BackgroundTasks,
    db_hr: Session = Depends(get_db_sqlserver), db_payroll: Session = Depends(get_db_mysql),
    db_auth: Session = Depends(get_db_auth), current_user: schemas.User = Depends(get_current_user)
):
    if current_user.role not in ["Admin", "HR Manager", "ADMIN"]:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Chỉ HR Manager/Admin mới được thêm nhân viên.")
    
    # ... (Validation code giữ nguyên) ...

    try:
        new_emp = crud_employee.create_employee_synced(db_hr, db_payroll, db_auth, employee)
        background_tasks.add_task(bg_audit_log, db_auth, current_user.email, "CREATE_EMPLOYEE", f"{new_emp.FullName}", "Thêm mới nhân viên")
        return new_emp
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# 3. XEM CHI TIẾT HỒ SƠ (Bảo mật quyền riêng tư)
@router.get("/{employee_id}", response_model=schemas.EmployeeFullProfile)
def read_employee_profile(
    employee_id: int,
    db_hr: Session = Depends(get_db_sqlserver),
    db_payroll: Session = Depends(get_db_mysql),
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_user)
):
    db_employee_hr = crud_employee.get_employee_by_id(db_hr, employee_id)
    if not db_employee_hr:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")

    # [Yêu cầu 3] Quyền riêng tư: Chỉ xem thông tin của chính mình
    if current_user.role == "Employee" and current_user.employee_id_link != employee_id:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN, 
            detail="⛔ Quyền truy cập bị từ chối: Bạn chỉ được phép xem phiếu lương và hồ sơ của chính mình."
        )
    
    # Quyền quản lý
    manager_roles = ["Admin", "HR Manager", "Payroll Manager", "ADMIN"]
    if current_user.role != "Employee" and current_user.role not in manager_roles:
         raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Không đủ quyền truy cập.")

    # [Yêu cầu 1] Lấy dữ liệu lương chi tiết từ Payroll
    salaries = crud_payroll.get_salary_history(db_payroll, employee_id)
    attendances = crud_payroll.get_attendance_data(db_payroll, employee_id)
    auth_user = crud_user.get_user_by_email(db_auth, email=db_employee_hr.Email)

    profile_data = schemas.EmployeeFullProfile.from_orm(db_employee_hr)
    profile_data.salaries = salaries
    profile_data.attendances = attendances
    if auth_user:
        profile_data.role = auth_user.role
        profile_data.auth_user_id = auth_user.id

    return profile_data

# 4. CẬP NHẬT THÔNG TIN (Đồng bộ HR -> Payroll)
@router.put("/{employee_id}", response_model=schemas.Employee)
def update_employee(
    employee_id: int,
    employee_update: schemas.EmployeeUpdate,
    background_tasks: BackgroundTasks,
    db_hr: Session = Depends(get_db_sqlserver),
    db_payroll: Session = Depends(get_db_mysql),
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_user)
):
    if current_user.role not in ["Admin", "HR Manager", "ADMIN"]:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền chỉnh sửa.")

    # ... (Validation code giữ nguyên) ...

    try:
        # [Yêu cầu 3] Cập nhật dữ liệu: Đồng bộ HR -> Payroll
        updated_emp = crud_employee.update_employee_synced(
            db_hr, db_payroll, db_auth, employee_id, employee_update
        )

        changes = []
        if employee_update.DepartmentID: changes.append("Phòng ban")
        if employee_update.PositionID: changes.append("Chức vụ")
        
        background_tasks.add_task(
            bg_audit_log, db_auth, current_user.email, 
            "UPDATE_EMPLOYEE", f"{updated_emp.FullName} ({employee_id})", 
            f"Cập nhật & Đồng bộ: {', '.join(changes)}" if changes else "Cập nhật thông tin"
        )
        return updated_emp
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# 5. XÓA NHÂN VIÊN (Giữ nguyên)
@router.delete("/{employee_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: int, background_tasks: BackgroundTasks,
    db_hr: Session = Depends(get_db_sqlserver), db_payroll: Session = Depends(get_db_mysql),
    db_auth: Session = Depends(get_db_auth), current_user: schemas.User = Depends(get_current_user)
):
    if current_user.role not in ["Admin", "HR Manager", "ADMIN"]:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Không đủ quyền xóa.")

    try:
        success = crud_employee.delete_employee_synced(db_hr, db_payroll, db_auth, employee_id)
        if success:
             background_tasks.add_task(bg_audit_log, db_auth, current_user.email, "DELETE_EMPLOYEE", f"ID {employee_id}", "Xóa hồ sơ nhân viên")
    except HTTPException as e:
        raise e 
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")
    
    return None