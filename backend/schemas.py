# backend/schemas.py
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal

# ==========================================
# 1. AUTHENTICATION & USER MANAGEMENT
# ==========================================
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    emp_id: Optional[int] = None

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    role: str
    employee_id_link: Optional[int] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class UserInDB(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class UserRoleUpdate(BaseModel):
    role: str

class UserPasswordUpdate(BaseModel):
    new_password: str

# ==========================================
# 2. HR MANAGEMENT (HUMAN_2025)
# ==========================================
# --- Department ---
class DepartmentBase(BaseModel):
    DepartmentName: str

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    DepartmentName: Optional[str] = None

class Department(DepartmentBase):
    DepartmentID: int
    model_config = ConfigDict(from_attributes=True)

# --- Position ---
class PositionBase(BaseModel):
    PositionName: str

class PositionCreate(PositionBase):
    pass

class PositionUpdate(BaseModel):
    PositionName: Optional[str] = None

class Position(PositionBase):
    PositionID: int
    model_config = ConfigDict(from_attributes=True)

# --- Employee ---
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

# ==========================================
# 3. PAYROLL MANAGEMENT (MYSQL)
# ==========================================
class Salary(BaseModel):
    SalaryID: int
    SalaryMonth: date
    BaseSalary: Decimal
    Bonus: Decimal
    Deductions: Decimal
    NetSalary: Decimal
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

# ==========================================
# 4. SHAREHOLDER & DIVIDEND MANAGEMENT
# ==========================================
class ShareholderBase(BaseModel):
    EmployeeID: int
    Shares: int
    Status: str = "Active"

class ShareholderCreate(ShareholderBase):
    pass

class Shareholder(ShareholderBase):
    ShareholderID: int
    FullName: Optional[str] = "Unknown"
    DepartmentName: Optional[str] = "Unknown"
    SharePercentage: float = 0.0
    UnpaidDividend: Optional[Decimal] = 0
    model_config = ConfigDict(from_attributes=True)

class DividendPaymentCreate(BaseModel):
    Title: str
    TotalAmount: Decimal
    PaymentDate: date

# --- Dividend Payout Helper Schemas ---
class DividendPreviewRequest(BaseModel):
    total_profit: Decimal # Tổng lợi nhuận phân phối

class DividendItem(BaseModel):
    employee_id: int
    full_name: str
    department_name: str
    shares: int
    percentage: float
    dividend_amount: Decimal # Số tiền nhận được

class DividendPayoutPreview(BaseModel):
    total_shares: int
    dividend_per_share: Decimal
    payout_list: List[DividendItem]

class DividendPayoutConfirm(BaseModel):
    title: str
    payment_date: date
    payout_list: List[DividendItem]

# ==========================================
# 5. LEAVE REQUESTS (NGHỈ PHÉP)
# ==========================================
class LeaveRequestCreate(BaseModel):
    LeaveType: str 
    StartDate: date
    EndDate: date
    Reason: str

class LeaveRequestUpdate(BaseModel):
    Status: str # 'Approved', 'Rejected'
    RejectionReason: Optional[str] = None

class LeaveRequest(BaseModel):
    RequestID: int
    EmployeeID: int
    EmployeeName: Optional[str] = "Unknown"
    DepartmentName: Optional[str] = None
    LeaveType: str
    StartDate: date
    EndDate: date
    Reason: str
    Status: str
    CreatedAt: datetime
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 6. SYSTEM ADMIN & SECURITY (AUDIT & CONFIG)
# ==========================================
class AuditLog(BaseModel):
    id: int
    user_email: str
    action: str
    target: Optional[str] = None
    details: Optional[str] = None
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class SystemConfigBase(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

class SystemConfigUpdate(BaseModel):
    value: str

class SystemConfig(SystemConfigBase):
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 7. NOTIFICATIONS (THÔNG BÁO)
# ==========================================
class NotificationBase(BaseModel):
    message: str
    type: str
    is_read: bool = False
    created_at: Optional[datetime] = None
    user_id: Optional[int] = None
    role_target: Optional[str] = None
    related_employee_id: Optional[int] = None

class NotificationCreate(BaseModel):
    message: str
    type: str
    user_id: Optional[int] = None
    role_target: Optional[str] = None
    related_employee_id: Optional[int] = None

class Notification(NotificationBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)