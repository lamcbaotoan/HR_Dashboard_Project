# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from contextlib import asynccontextmanager
import atexit
from sqlalchemy.orm import joinedload 

from api.v1.api import api_router
from database import SessionLocalSQLServer, SessionLocalMySQL, SessionLocalAuth, engine_auth, BaseAuth
from services.alert_service import (
    check_work_anniversaries,
    check_excessive_leave,
    send_monthly_payroll_emails,
    check_payroll_discrepancies
)
# Sửa import: Lấy EmployeeHR trực tiếp từ models
from models import User as AuthUser, EmployeeHR
# [CẬP NHẬT] Thêm crud_shareholder vào import
from crud import crud_user, crud_shareholder
import schemas 
from core.security import get_password_hash 
from auth.auth import get_user_role as get_role_from_hr
from database import engine_mysql, BaseMySQL

def run_alert_jobs():
    """Các hàm chạy dịch vụ cảnh báo (chạy hàng ngày)"""
    print("Scheduler running daily jobs...")
    db_hr = SessionLocalSQLServer()
    db_payroll = SessionLocalMySQL()
    try:
        check_work_anniversaries(db_hr)
        check_excessive_leave(db_payroll)
        check_payroll_discrepancies(db_payroll)
    except Exception as e:
        print(f"Lỗi khi chạy các job hàng ngày: {e}")
    finally:
        if db_hr: db_hr.close()
        if db_payroll: db_payroll.close()


def run_monthly_email_job():
    """Hàm wrapper để chạy job gửi email lương hàng tháng"""
    print("Scheduler running monthly email job...")
    db_hr = SessionLocalSQLServer()
    db_payroll = SessionLocalMySQL()
    try:
        send_monthly_payroll_emails(db_hr, db_payroll)
    except Exception as e:
        print(f"Lỗi khi chạy job email hàng tháng: {e}")
    finally:
        if db_hr: db_hr.close()
        if db_payroll: db_payroll.close()


def initial_sync_and_setup():
    """
    Hàm này chạy một lần khi server khởi động:
    1. Tạo CSDL auth nếu chưa có (bao gồm cả bảng shareholders, leave_requests).
    2. Tạo/Kiểm tra tài khoản ADMIN mặc định.
    3. Đồng bộ nhân viên từ HR_DB sang Auth_DB.
    4. [MỚI] Đồng bộ danh sách Cổ đông từ HR sang Auth DB.
    """
    print("--- BẮT ĐẦU KHỞI TẠO VÀ ĐỒNG BỘ ---")
    db_auth = SessionLocalAuth()
    db_hr = SessionLocalSQLServer()
    try:
        # 1. Tạo bảng trong CSDL Auth (Users, Shareholders, LeaveRequests...)
        print("1. Đang kiểm tra và tạo bảng trong dashboard_auth.db...")
        BaseAuth.metadata.create_all(bind=engine_auth)

        # 2. Tạo/Kiểm tra tài khoản DEV (BỎ QUA)
        print("2. (Đã bỏ qua) Tạo tài khoản DEV...")
        
        # --- TẠO/KIỂM TRA TÀI KHOẢN ADMIN ---
        print("3. Đang kiểm tra và tạo tài khoản ADMIN...")
        admin_email = "admin@company.vn"
        admin_user = crud_user.get_user_by_email(db_auth, email=admin_email)
        if not admin_user:
            admin_schema = schemas.UserCreate(
                full_name="Admin Dashboard",
                email=admin_email,
                password="adminpassword123", # Mật khẩu gốc sẽ được băm
                role="Admin",
                phone_number="0000000000" 
            )
            crud_user.create_user(db_auth, admin_schema)
            print("   -> Đã tạo tài khoản ADMIN thành công.")
        else:
            print("   -> Tài khoản ADMIN đã tồn tại.")
        # --- KẾT THÚC ---

        # 4. Đồng bộ nhân viên từ HR sang Auth (User Accounts)
        print("4. Bắt đầu đồng bộ tài khoản nhân viên từ HUMAN_2025 sang Auth DB...")
        hr_employees_query = db_hr.query(EmployeeHR).options(
             joinedload(EmployeeHR.department), # Eager load 
             joinedload(EmployeeHR.position)    # Eager load 
        )
        try:
             hr_employees = list(hr_employees_query.all()) 
        except Exception as e_hr:
             print(f"!!! LỖI khi lấy danh sách nhân viên từ HR DB: {e_hr}")
             hr_employees = [] 
        
        synced_count = 0
        for emp in hr_employees:
            if not emp.Email:
                continue

            auth_user = crud_user.get_user_by_email(db_auth, email=emp.Email)
            if not auth_user:
                role = get_role_from_hr(emp) 
                user_schema = schemas.UserCreate(
                    full_name=emp.FullName,
                    email=emp.Email,
                    password="password123", 
                    role=role,
                    phone_number=emp.PhoneNumber,
                    employee_id_link=emp.EmployeeID
                )
                try:
                    crud_user.create_user(db_auth, user_schema)
                    synced_count += 1
                except Exception as e_sync:
                    print(f"   -> LỖI đồng bộ user {emp.Email}: {e_sync}")

        print(f"   -> Đồng bộ tài khoản hoàn tất. Đã thêm {synced_count} nhân viên mới vào Auth DB.")

        # 5. [MỚI] Đồng bộ danh sách Cổ đông (Shareholders)
        print("5. Đang đồng bộ danh sách Cổ đông từ Nhân sự...")
        try:
            crud_shareholder.sync_all_employees_to_shareholders(db_auth, db_hr)
        except Exception as e_sh:
            print(f"!!! LỖI khi đồng bộ Cổ đông: {e_sh}")

    except Exception as e:
        print(f"!!! LỖI TRONG QUÁ TRÌNH KHỞI TẠO CHUNG: {e}")
    finally:
        if db_auth: db_auth.close()
        if db_hr: db_hr.close()
    print("--- KẾT THÚC KHỞI TẠO VÀ ĐỒNG BỘ ---\n")


# Khởi tạo scheduler
scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    initial_sync_and_setup()

    scheduler.add_job(run_alert_jobs, 'interval', days=1, id="daily_check")
    scheduler.add_job(run_monthly_email_job, 'cron', day=1, hour=9, id="monthly_payroll")
    scheduler.start()
    print("Scheduler started...")
    yield
    scheduler.shutdown()
    print("Scheduler stopped.")

app = FastAPI(
    title="HRM & Payroll Integrated Dashboard API",
    description="API tích hợp HUMAN_2025 (SQL Server) và PAYROLL (MySQL)",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Integrated Dashboard API"}

atexit.register(lambda: scheduler.shutdown(wait=False))