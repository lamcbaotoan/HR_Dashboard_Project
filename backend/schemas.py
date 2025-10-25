# backend/schemas.py
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import date, datetime # Thêm datetime
from decimal import Decimal

# --- Schemas chung ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    emp_id: Optional[int] = None

class User(BaseModel):
    id: Optional[int] = None
    email: EmailStr
    role: str
    emp_id: Optional[int] = None

# --- Schemas cho User (CSDL Auth mới) ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    role: str
    employee_id_link: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserRoleUpdate(BaseModel):
    role: str

class UserPasswordUpdate(BaseModel):
    new_password: str

class UserInDB(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- Schemas cho HR (HUMAN_2025) ---
class DepartmentBase(BaseModel):
    DepartmentName: str

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    DepartmentName: Optional[str] = None

class Department(DepartmentBase):
    DepartmentID: int
    model_config = ConfigDict(from_attributes=True)

class PositionBase(BaseModel):
    PositionName: str

class PositionCreate(PositionBase):
    pass

class PositionUpdate(BaseModel):
    PositionName: Optional[str] = None

class Position(PositionBase):
    PositionID: int
    model_config = ConfigDict(from_attributes=True)


# --- Schemas cho Employee ---
class EmployeeBase(BaseModel):
    FullName: str
    Email: EmailStr
    DateOfBirth: date
    HireDate: date
    DepartmentID: int
    PositionID: int
    Status: str
    Gender: Optional[str] = None
    PhoneNumber: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    password: str

class EmployeeUpdate(BaseModel):
    FullName: Optional[str] = None
    DepartmentID: Optional[int] = None
    PositionID: Optional[int] = None
    Status: Optional[str] = None
    PhoneNumber: Optional[str] = None

class Employee(EmployeeBase):
    EmployeeID: int
    department: Optional[Department] = None
    position: Optional[Position] = None
    role: Optional[str] = None
    auth_user_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


# --- Schemas cho Payroll ---
class SalaryBase(BaseModel):
    SalaryMonth: date
    BaseSalary: Decimal
    Bonus: Decimal
    Deductions: Decimal
    NetSalary: Decimal

class Salary(SalaryBase):
    SalaryID: int
    model_config = ConfigDict(from_attributes=True)

class SalaryUpdate(BaseModel):
    BaseSalary: Optional[Decimal] = None
    Bonus: Optional[Decimal] = None
    Deductions: Optional[Decimal] = None

class Attendance(BaseModel):
    AttendanceID: int
    AttendanceMonth: date
    WorkDays: int
    AbsentDays: int
    LeaveDays: int
    model_config = ConfigDict(from_attributes=True)


class EmployeeFullProfile(Employee):
    salaries: List[Salary] = []
    attendances: List[Attendance] = []

# --- THÊM SCHEMAS CHO NOTIFICATION ---
class NotificationBase(BaseModel):
    message: str
    type: str
    is_read: bool = False
    created_at: Optional[datetime] = None # Sẽ được gán tự động
    user_id: Optional[int] = None
    role_target: Optional[str] = None
    related_employee_id: Optional[int] = None

class NotificationCreate(BaseModel): # Dùng để tạo thông báo mới
    message: str
    type: str
    user_id: Optional[int] = None
    role_target: Optional[str] = None
    related_employee_id: Optional[int] = None

class Notification(NotificationBase):
    id: int
    # Kế thừa created_at từ Base và đảm bảo nó không phải Optional khi đọc
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)