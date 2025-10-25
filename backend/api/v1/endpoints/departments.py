# backend/api/v1/endpoints/departments.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import schemas
from crud import crud_hr
from database import get_db_sqlserver, get_db_mysql
from auth.auth import get_current_active_hr_manager, get_current_active_admin

router = APIRouter()

@router.get("/", response_model=List[schemas.Department])
def read_departments(db_hr: Session = Depends(get_db_sqlserver), current_user: schemas.User = Depends(get_current_active_hr_manager)):
    return crud_hr.get_departments(db_hr)

@router.post("/", response_model=schemas.Department, status_code=status.HTTP_201_CREATED)
def create_department(dept: schemas.DepartmentCreate, db_hr: Session = Depends(get_db_sqlserver), db_payroll: Session = Depends(get_db_mysql), current_user: schemas.User = Depends(get_current_active_admin)):
    return crud_hr.create_department_synced(db_hr, db_payroll, dept)

@router.put("/{dept_id}", response_model=schemas.Department)
def update_department(dept_id: int, dept_update: schemas.DepartmentUpdate, db_hr: Session = Depends(get_db_sqlserver), db_payroll: Session = Depends(get_db_mysql), current_user: schemas.User = Depends(get_current_active_admin)):
    db_dept = crud_hr.update_department_synced(db_hr, db_payroll, dept_id, dept_update)
    if db_dept is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng ban")
    return db_dept

@router.delete("/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(dept_id: int, db_hr: Session = Depends(get_db_sqlserver), db_payroll: Session = Depends(get_db_mysql), current_user: schemas.User = Depends(get_current_active_admin)):
    if not crud_hr.delete_department(db_hr, db_payroll, dept_id):
        raise HTTPException(status_code=400, detail="Không thể xóa phòng ban, vẫn còn nhân viên được gán")
    return None