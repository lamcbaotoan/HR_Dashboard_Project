# backend/api/v1/endpoints/positions.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import schemas
from crud import crud_hr
from database import get_db_sqlserver, get_db_mysql
from auth.auth import get_current_active_hr_manager, get_current_active_admin

router = APIRouter()

@router.get("/", response_model=List[schemas.Position])
def read_positions(db_hr: Session = Depends(get_db_sqlserver), current_user: schemas.User = Depends(get_current_active_hr_manager)):
    return crud_hr.get_positions(db_hr)

@router.post("/", response_model=schemas.Position, status_code=status.HTTP_201_CREATED)
def create_position(pos: schemas.PositionCreate, db_hr: Session = Depends(get_db_sqlserver), db_payroll: Session = Depends(get_db_mysql), current_user: schemas.User = Depends(get_current_active_admin)):
    return crud_hr.create_position_synced(db_hr, db_payroll, pos)

@router.put("/{pos_id}", response_model=schemas.Position)
def update_position(pos_id: int, pos_update: schemas.PositionUpdate, db_hr: Session = Depends(get_db_sqlserver), db_payroll: Session = Depends(get_db_mysql), current_user: schemas.User = Depends(get_current_active_admin)):
    db_pos = crud_hr.update_position_synced(db_hr, db_payroll, pos_id, pos_update)
    if db_pos is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy chức vụ")
    return db_pos

@router.delete("/{pos_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_position(pos_id: int, db_hr: Session = Depends(get_db_sqlserver), db_payroll: Session = Depends(get_db_mysql), current_user: schemas.User = Depends(get_current_active_admin)):
    if not crud_hr.delete_position(db_hr, db_payroll, pos_id):
        raise HTTPException(status_code=400, detail="Không thể xóa chức vụ, vẫn còn nhân viên được gán")
    return None