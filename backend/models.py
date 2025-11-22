# backend/models.py
from sqlalchemy import Column, Integer, String, Date, DateTime, DECIMAL, ForeignKey, NVARCHAR, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import BaseSQLServer, BaseMySQL, BaseAuth

# --- Models cho HUMAN_2025 (SQL Server) ---

class DepartmentHR(BaseSQLServer):
    __tablename__ = 'Departments'
    DepartmentID = Column(Integer, primary_key=True, index=True)
    DepartmentName = Column(NVARCHAR(100), nullable=False)
    employees = relationship("EmployeeHR", back_populates="department")

class PositionHR(BaseSQLServer):
    __tablename__ = 'Positions'
    PositionID = Column(Integer, primary_key=True, index=True)
    PositionName = Column(NVARCHAR(100), nullable=False)
    employees = relationship("EmployeeHR", back_populates="position")

class EmployeeHR(BaseSQLServer):
    __tablename__ = 'Employees'
    EmployeeID = Column(Integer, primary_key=True, index=True)
    FullName = Column(NVARCHAR(100), nullable=False)
    DateOfBirth = Column(Date, nullable=False)
    Gender = Column(NVARCHAR(10))
    PhoneNumber = Column(NVARCHAR(15))
    Email = Column(NVARCHAR(100), unique=True)
    HireDate = Column(Date, nullable=False)
    DepartmentID = Column(Integer, ForeignKey('Departments.DepartmentID'))
    PositionID = Column(Integer, ForeignKey('Positions.PositionID'))
    Status = Column(NVARCHAR(50))

    department = relationship("DepartmentHR", back_populates="employees")
    position = relationship("PositionHR", back_populates="employees")
    
    dividends = relationship("Dividend", back_populates="employee")

class Dividend(BaseSQLServer):
    __tablename__ = 'Dividends'
    DividendID = Column(Integer, primary_key=True, index=True)
    EmployeeID = Column(Integer, ForeignKey('Employees.EmployeeID'))
    DividendAmount = Column(DECIMAL(12, 2), nullable=False)
    DividendDate = Column(Date, nullable=False)

    employee = relationship("EmployeeHR", back_populates="dividends")


# --- Models cho PAYROLL (MySQL) ---

class EmployeePayroll(BaseMySQL):
    __tablename__ = 'employees'
    EmployeeID = Column(Integer, primary_key=True, index=True)
    FullName = Column(String(100), nullable=False)
    DepartmentID = Column(Integer, ForeignKey('departments.DepartmentID'))
    PositionID = Column(Integer, ForeignKey('positions.PositionID'))
    Status = Column(String(50))

    salaries = relationship("Salary", back_populates="employee")
    attendances = relationship("Attendance", back_populates="employee")
    leave_requests = relationship("LeaveRequestPayroll", back_populates="employee")

class DepartmentPayroll(BaseMySQL):
    __tablename__ = 'departments'
    DepartmentID = Column(Integer, primary_key=True, index=True)
    DepartmentName = Column(String(100), nullable=False)

class PositionPayroll(BaseMySQL):
    __tablename__ = 'positions'
    PositionID = Column(Integer, primary_key=True, index=True)
    PositionName = Column(String(100), nullable=False)

class Salary(BaseMySQL):
    __tablename__ = 'salaries'
    SalaryID = Column(Integer, primary_key=True, index=True)
    EmployeeID = Column(Integer, ForeignKey('employees.EmployeeID'))
    SalaryMonth = Column(Date, nullable=False)
    BaseSalary = Column(DECIMAL(12, 2), nullable=False)
    Bonus = Column(DECIMAL(12, 2), default=0.00)
    Deductions = Column(DECIMAL(12, 2), default=0.00)
    NetSalary = Column(DECIMAL(12, 2), nullable=False)

    employee = relationship("EmployeePayroll", back_populates="salaries")

class Attendance(BaseMySQL):
    __tablename__ = 'attendance'
    AttendanceID = Column(Integer, primary_key=True, index=True)
    EmployeeID = Column(Integer, ForeignKey('employees.EmployeeID'))
    WorkDays = Column(Integer, nullable=False)
    AbsentDays = Column(Integer, default=0)
    LeaveDays = Column(Integer, default=0)
    AttendanceMonth = Column(Date, nullable=False)

    employee = relationship("EmployeePayroll", back_populates="attendances")

# (Optional) Model LeaveRequest nếu muốn lưu ở MySQL
class LeaveRequestPayroll(BaseMySQL):
    __tablename__ = 'leave_requests'
    RequestID = Column(Integer, primary_key=True, index=True)
    EmployeeID = Column(Integer, ForeignKey('employees.EmployeeID'))
    LeaveType = Column(String(50))
    StartDate = Column(Date, nullable=False)
    EndDate = Column(Date, nullable=False)
    Reason = Column(String(255))
    Status = Column(String(50), default='Pending')
    ApprovedBy = Column(String(100), nullable=True)
    CreatedAt = Column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("EmployeePayroll", back_populates="leave_requests")


# --- Models cho DASHBOARD AUTH (SQLite) ---

class User(BaseAuth):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    phone_number = Column(String(15), unique=True, index=True, nullable=True)
    full_name = Column(String(100), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    employee_id_link = Column(Integer, unique=True, nullable=True)

class Notification(BaseAuth):
    __tablename__ = 'notifications'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    role_target = Column(String(50), nullable=True)
    message = Column(String(500), nullable=False)
    type = Column(String(50), nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    related_employee_id = Column(Integer, nullable=True)

class Shareholder(BaseAuth):
    __tablename__ = 'shareholders'
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, unique=True, index=True, nullable=False)
    shares = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="Active")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class LeaveRequest(BaseAuth):
    __tablename__ = 'leave_requests_auth' # Đổi tên bảng để tránh trùng nếu có
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, index=True, nullable=False)
    leave_type = Column(String(50), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(String(255))
    status = Column(String(50), default='Pending')
    approved_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AuditLog(BaseAuth):
    __tablename__ = 'audit_logs'
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(100), nullable=False)
    action = Column(String(50), nullable=False)
    target = Column(String(100), nullable=True)
    details = Column(String(255), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class SystemConfig(BaseAuth):
    __tablename__ = 'system_configs'
    key = Column(String(50), primary_key=True)
    value = Column(String(255))
    description = Column(String(255), nullable=True)