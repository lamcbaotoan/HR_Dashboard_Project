# backend/api/v1/api.py
from fastapi import APIRouter
from api.v1.endpoints import (
    login, employees, departments, positions,
    payroll, reports, users, notifications,
    shareholders, leave_requests, system # <-- Import mới
)

api_router = APIRouter()
api_router.include_router(login.router, prefix="/login", tags=["Login"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(employees.router, prefix="/employees", tags=["Employees"])
api_router.include_router(departments.router, prefix="/departments", tags=["Departments"])
api_router.include_router(positions.router, prefix="/positions", tags=["Positions"])
api_router.include_router(payroll.router, prefix="/payroll", tags=["Payroll"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(shareholders.router, prefix="/shareholders", tags=["Shareholders"])
api_router.include_router(leave_requests.router, prefix="/leave-requests", tags=["Leave Requests"])
api_router.include_router(system.router, prefix="/system", tags=["System Administration"])