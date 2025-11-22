# backend/api/v1/endpoints/employees.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

import schemas
from crud import crud_employee, crud_payroll, crud_user, crud_system # [IMPORT QUAN TRỌNG]
from database import get_db_sqlserver, get_db_mysql, get_db_auth
from auth.auth import get_current_user, get_current_active_hr_manager, get_current_active_admin

router = APIRouter()

# 1. HIỂN THỊ & TÌM KIẾM (HR Manager & Admin)
@router.get("/", response_model=List[schemas.Employee])
def read_employees(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    position_id: Optional[int] = None,
    status: Optional[str] = None,
    db_hr: Session = Depends(get_db_sqlserver),
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_active_hr_manager)
):
    """
    Lấy danh sách nhân viên từ HUMAN_2025.
    Hỗ trợ tìm kiếm theo: ID, Tên, Phòng ban, Chức vụ.
    """
    employees = crud_employee.get_employees(
        db_hr=db_hr, 
        db_auth=db_auth, 
        skip=skip, 
        limit=limit, 
        search=search,
        department_id=department_id,
        position_id=position_id,
        status=status
    )
    return employees

# 2. THÊM MỚI NHÂN VIÊN (HR Manager)
@router.post("/", response_model=schemas.Employee, status_code=status.HTTP_201_CREATED)
def create_employee(
    employee: schemas.EmployeeCreate,
    db_hr: Session = Depends(get_db_sqlserver),
    db_payroll: Session = Depends(get_db_mysql),
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_active_hr_manager)
):
    """
    Thêm nhân viên vào HUMAN_2025 -> Đồng bộ sang PAYROLL -> Tạo tài khoản Auth.
    Ghi Audit Log.
    """
    # Kiểm tra trùng lặp
    if crud_employee.get_employee_by_email(db_hr, email=employee.Email):
        raise HTTPException(status_code=400, detail="Email nhân viên đã tồn tại trong HUMAN_2025.")
    
    if crud_user.get_user_by_email(db_auth, email=employee.Email):
         raise HTTPException(status_code=400, detail="Tài khoản (Email) đã tồn tại trong hệ thống.")

    try:
        # Thực hiện tạo và đồng bộ
        new_emp = crud_employee.create_employee_synced(db_hr, db_payroll, db_auth, employee)

        # [GHI LOG]
        crud_system.create_audit_log(
            db_auth,
            user_email=current_user.email,
            action="CREATE_EMPLOYEE",
            target=f"{new_emp.FullName} ({new_emp.EmployeeID})",
            details=f"Thêm mới nhân viên vào phòng {new_emp.DepartmentID}"
        )
        return new_emp
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# 3. XEM CHI TIẾT (Employee xem chính mình, HR xem tất cả)
@router.get("/{employee_id}", response_model=schemas.EmployeeFullProfile)
def read_employee_profile(
    employee_id: int,
    db_hr: Session = Depends(get_db_sqlserver),
    db_payroll: Session = Depends(get_db_mysql),
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_user)
):
    # Lấy thông tin cơ bản từ HR
    db_employee_hr = crud_employee.get_employee_by_id(db_hr, employee_id)
    if not db_employee_hr:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")

    # Phân quyền: Employee chỉ xem được của mình
    if current_user.role == "Employee" and employee_id != current_user.emp_id:
        raise HTTPException(status_code=403, detail="Bạn chỉ được phép xem hồ sơ của chính mình.")

    # Lấy dữ liệu Lương & Chấm công từ PAYROLL
    salaries = crud_payroll.get_salary_history(db_payroll, employee_id)
    attendances = crud_payroll.get_attendance_data(db_payroll, employee_id)
    
    # Lấy thông tin tài khoản từ Auth
    auth_user = crud_user.get_user_by_email(db_auth, email=db_employee_hr.Email)

    # Gộp dữ liệu
    profile_data = schemas.EmployeeFullProfile.from_orm(db_employee_hr)
    profile_data.salaries = salaries
    profile_data.attendances = attendances
    if auth_user:
        profile_data.role = auth_user.role
        profile_data.auth_user_id = auth_user.id

    return profile_data

# 4. CẬP NHẬT THÔNG TIN (HR Manager)
@router.put("/{employee_id}", response_model=schemas.Employee)
def update_employee(
    employee_id: int,
    employee_update: schemas.EmployeeUpdate,
    db_hr: Session = Depends(get_db_sqlserver),
    db_payroll: Session = Depends(get_db_mysql),
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_active_hr_manager)
):
    """
    Cập nhật thông tin trên HUMAN_2025.
    Nếu thay đổi Phòng ban/Chức vụ -> Đồng bộ sang PAYROLL & Auth.
    Ghi Audit Log.
    """
    # Lấy thông tin cũ để ghi log chi tiết thay đổi
    old_emp = crud_employee.get_employee_by_id(db_hr, employee_id)
    if not old_emp:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")

    try:
        updated_emp = crud_employee.update_employee_synced(
            db_hr, db_payroll, db_auth, employee_id, employee_update
        )

        # [GHI LOG]
        changes = []
        if employee_update.DepartmentID: changes.append("Phòng ban")
        if employee_update.PositionID: changes.append("Chức vụ")
        if employee_update.Status: changes.append("Trạng thái")
        
        crud_system.create_audit_log(
            db_auth,
            user_email=current_user.email,
            action="UPDATE_EMPLOYEE",
            target=f"{updated_emp.FullName} ({employee_id})",
            details=f"Cập nhật: {', '.join(changes)}" if changes else "Cập nhật thông tin chung"
        )
        return updated_emp
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# 5. XÓA NHÂN VIÊN (Admin & HR Manager)
@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: int,
    db_hr: Session = Depends(get_db_sqlserver),
    db_payroll: Session = Depends(get_db_mysql),
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_active_hr_manager) # Cho phép HR xóa
):
    """
    Xóa nhân viên (Kiểm tra ràng buộc Lương & Cổ tức trước).
    Ghi Audit Log.
    """
    # Hàm này trong crud_employee đã có logic check ràng buộc và raise HTTPException
    try:
        success = crud_employee.delete_employee_synced(db_hr, db_payroll, db_auth, employee_id)
        
        if success:
            # [GHI LOG]
            crud_system.create_audit_log(
                db_auth,
                user_email=current_user.email,
                action="DELETE_EMPLOYEE",
                target=f"ID {employee_id}",
                details="Xóa hồ sơ nhân viên vĩnh viễn"
            )
    except HTTPException as e:
        raise e # Re-raise lỗi ràng buộc (400) để Frontend hiển thị
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")
    
    return None