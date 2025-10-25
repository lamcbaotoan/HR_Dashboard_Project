# backend/api/v1/endpoints/employees.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

import schemas
from crud import crud_employee, crud_payroll, crud_user # Thêm crud_user
# Sửa import: Thêm get_db_auth
from database import get_db_sqlserver, get_db_mysql, get_db_auth
from auth.auth import get_current_user, get_current_active_hr_manager, get_current_active_admin

router = APIRouter()

# --- SỬA HÀM NÀY ĐỂ NHẬN THAM SỐ LỌC ---
@router.get("/", response_model=List[schemas.Employee])
def read_employees(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    department_id: Optional[int] = None, # Tham số lọc mới
    position_id: Optional[int] = None,   # Tham số lọc mới
    status: Optional[str] = None,        # Tham số lọc mới
    db_hr: Session = Depends(get_db_sqlserver),
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_active_hr_manager)
):
    """
    Lấy danh sách nhân viên, hỗ trợ tìm kiếm và lọc theo phòng ban, chức vụ, trạng thái.
    """
    employees = crud_employee.get_employees(
        db_hr=db_hr, 
        db_auth=db_auth, 
        skip=skip, 
        limit=limit, 
        search=search,
        department_id=department_id, # Truyền tham số vào CRUD
        position_id=position_id,     # Truyền tham số vào CRUD
        status=status                # Truyền tham số vào CRUD
    )
    return employees
# --- KẾT THÚC SỬA ---


@router.post("/", response_model=schemas.Employee, status_code=status.HTTP_201_CREATED)
def create_employee(
    employee: schemas.EmployeeCreate,
    db_hr: Session = Depends(get_db_sqlserver),
    db_payroll: Session = Depends(get_db_mysql),
    db_auth: Session = Depends(get_db_auth), # <-- THÊM CSDL Auth
    current_user: schemas.User = Depends(get_current_active_hr_manager)
):
    """
    Thêm nhân viên mới, đồng bộ 3 CSDL.
    """
    db_employee = crud_employee.get_employee_by_email(db_hr, email=employee.Email)
    if db_employee:
        raise HTTPException(status_code=400, detail="Email nhân viên đã tồn tại trong CSDL HR")
    
    # Kiểm tra email trong CSDL Auth luôn cho chắc
    auth_user = crud_user.get_user_by_email(db_auth, email=employee.Email)
    if auth_user:
         raise HTTPException(status_code=400, detail="Email đã tồn tại trong hệ thống tài khoản")

    # Truyền db_auth vào hàm crud
    return crud_employee.create_employee_synced(db_hr, db_payroll, db_auth, employee)

@router.get("/{employee_id}", response_model=schemas.EmployeeFullProfile)
def read_employee_profile(
    employee_id: int,
    db_hr: Session = Depends(get_db_sqlserver),
    db_payroll: Session = Depends(get_db_mysql),
    db_auth: Session = Depends(get_db_auth), # <-- THÊM CSDL Auth
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Lấy hồ sơ chi tiết của nhân viên từ cả 3 CSDL.
    """
    db_employee_hr = crud_employee.get_employee_by_id(db_hr, employee_id)
    if not db_employee_hr:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")

    # Kiểm tra quyền Employee xem của chính mình (đã đúng)
    if current_user.role == "Employee" and employee_id != current_user.emp_id:
        raise HTTPException(status_code=403, detail="Không có quyền xem hồ sơ này")

    salaries = crud_payroll.get_salary_history(db_payroll, employee_id)
    attendances = crud_payroll.get_attendance_data(db_payroll, employee_id)

    # Lấy thông tin role từ Auth DB
    auth_user = crud_user.get_user_by_email(db_auth, email=db_employee_hr.Email)

    # Chuyển đổi sang schema và thêm thông tin
    profile_data = schemas.EmployeeFullProfile.from_orm(db_employee_hr)
    profile_data.salaries = salaries
    profile_data.attendances = attendances
    if auth_user:
        profile_data.role = auth_user.role # Gán vai trò vào profile
        profile_data.auth_user_id = auth_user.id

    return profile_data

@router.put("/{employee_id}", response_model=schemas.Employee)
def update_employee(
    employee_id: int,
    employee_update: schemas.EmployeeUpdate,
    db_hr: Session = Depends(get_db_sqlserver),
    db_payroll: Session = Depends(get_db_mysql),
    db_auth: Session = Depends(get_db_auth), # <-- THÊM CSDL Auth
    current_user: schemas.User = Depends(get_current_active_hr_manager)
):
    """
    Cập nhật thông tin nhân viên, đồng bộ 3 CSDL.
    """
    # Truyền db_auth vào hàm crud
    db_employee = crud_employee.update_employee_synced(
        db_hr, db_payroll, db_auth, employee_id, employee_update
    )
    if db_employee is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")

    # Convert lại sang schema Employee để trả về (bao gồm cả role)
    result_schema = schemas.Employee.from_orm(db_employee)
    auth_user = crud_user.get_user_by_email(db_auth, email=db_employee.Email)
    if auth_user:
        result_schema.role = auth_user.role
        result_schema.auth_user_id = auth_user.id
    return result_schema


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: int,
    db_hr: Session = Depends(get_db_sqlserver),
    db_payroll: Session = Depends(get_db_mysql),
    db_auth: Session = Depends(get_db_auth), # <-- THÊM CSDL Auth
    current_user: schemas.User = Depends(get_current_active_admin)
):
    """
    Xóa nhân viên, đồng bộ 3 CSDL (chỉ Admin).
    """
    # Truyền db_auth vào hàm crud
    success = crud_employee.delete_employee_synced(db_hr, db_payroll, db_auth, employee_id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Không thể xóa nhân viên do có dữ liệu liên quan (lương hoặc cổ tức)."
        )
    return None