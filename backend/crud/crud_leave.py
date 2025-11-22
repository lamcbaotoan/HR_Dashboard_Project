# backend/crud/crud_leave.py
from sqlalchemy.orm import Session
from models import LeaveRequest, EmployeeHR
import schemas
from datetime import datetime

def create_leave_request(db_auth: Session, request: schemas.LeaveRequestCreate, employee_id: int):
    db_request = LeaveRequest(
        employee_id=employee_id,
        leave_type=request.LeaveType,
        start_date=request.StartDate,
        end_date=request.EndDate,
        reason=request.Reason,
        status="Pending"
    )
    db_auth.add(db_request)
    db_auth.commit()
    db_auth.refresh(db_request)
    # Map sang schema trả về
    return _map_to_schema(db_request, employee_name="Me")

def get_leave_requests(db_auth: Session, db_hr: Session, employee_id: int = None):
    """Lấy danh sách nghỉ phép từ SQLite, join tên từ SQL Server."""
    query = db_auth.query(LeaveRequest)
    
    if employee_id:
        query = query.filter(LeaveRequest.employee_id == employee_id)
    
    results = query.order_by(LeaveRequest.created_at.desc()).all()
    
    if not results:
        return []

    # Lấy danh sách ID để query tên bên HR
    emp_ids = list(set([r.employee_id for r in results]))
    employees = db_hr.query(EmployeeHR).filter(EmployeeHR.EmployeeID.in_(emp_ids)).all()
    emp_map = {e.EmployeeID: e.FullName for e in employees}

    mapped = []
    for req in results:
        mapped.append(_map_to_schema(req, emp_map.get(req.employee_id, "Unknown")))
        
    return mapped

def update_leave_status(db_auth: Session, request_id: int, status: str, approver: str):
    req = db_auth.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if req:
        req.status = status
        req.approved_by = approver
        db_auth.commit()
        db_auth.refresh(req)
        return _map_to_schema(req, "Unknown") # Tên không quan trọng khi update
    return None

def _map_to_schema(db_obj, employee_name):
    return schemas.LeaveRequest(
        RequestID=db_obj.id,
        EmployeeID=db_obj.employee_id,
        EmployeeName=employee_name,
        DepartmentName="", # Có thể query thêm nếu cần
        LeaveType=db_obj.leave_type,
        StartDate=db_obj.start_date,
        EndDate=db_obj.end_date,
        Reason=db_obj.reason,
        Status=db_obj.status,
        CreatedAt=db_obj.created_at
    )