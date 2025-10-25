# backend/api/v1/api.py
from fastapi import APIRouter
# --- THÊM notifications ---
from api.v1.endpoints import (
    login, employees, departments, positions,
    payroll, reports, users, notifications
)

api_router = APIRouter()
api_router.include_router(login.router, prefix="/login", tags=["Login"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
# --- THÊM DÒNG NÀY ---
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
# --- KẾT THÚC THÊM ---
api_router.include_router(employees.router, prefix="/employees", tags=["Employees"])
api_router.include_router(departments.router, prefix="/departments", tags=["Departments"])
api_router.include_router(positions.router, prefix="/positions", tags=["Positions"])
api_router.include_router(payroll.router, prefix="/payroll", tags=["Payroll"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])