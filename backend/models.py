# backend/models.py
from sqlalchemy import Column, Integer, String, Date, DateTime, DECIMAL, ForeignKey, NVARCHAR, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func # Thêm func
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


# --- Model cho DASHBOARD AUTH (SQLite) ---

class User(BaseAuth):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    phone_number = Column(String(15), unique=True, index=True, nullable=True)
    full_name = Column(String(100), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    employee_id_link = Column(Integer, unique=True, nullable=True)

# --- THÊM MODEL MỚI CHO THÔNG BÁO ---
class Notification(BaseAuth):
    __tablename__ = 'notifications'
    id = Column(Integer, primary_key=True, index=True)
    # ID của người dùng cụ thể nhận thông báo (NULL nếu là thông báo hệ thống/vai trò)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    # Vai trò mục tiêu (VD: "Admin", "HR Manager") - NULL nếu cho user_id cụ thể hoặc toàn hệ thống
    role_target = Column(String(50), nullable=True)
    # Nội dung thông báo
    message = Column(String(500), nullable=False)
    # Loại thông báo (để phân loại, VD: "anniversary", "leave_warning", "payroll_discrepancy")
    type = Column(String(50), nullable=False)
    # Trạng thái đã đọc
    is_read = Column(Boolean, default=False, nullable=False)
    # Thời gian tạo
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # ID của nhân viên liên quan (VD: ID nhân viên có kỷ niệm, ID nhân viên nghỉ quá phép)
    related_employee_id = Column(Integer, nullable=True)

    # (Không bắt buộc) Tạo quan hệ ngược lại với User nếu cần
    # user = relationship("User", back_populates="notifications")