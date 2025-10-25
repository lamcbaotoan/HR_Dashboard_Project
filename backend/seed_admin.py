# backend/seed_admin.py
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from database import engine_auth, BaseAuth, SessionLocalAuth
    from models import User
    # --- SỬA: BỎ IMPORT GET_PASSWORD_HASH ---
    # from core.security import get_password_hash
except ImportError as e:
    print(f"Lỗi import: {e}")
    sys.exit(1)

ADMIN_FULLNAME = "Admin Dashboard"
ADMIN_EMAIL = "admin@company.vn"
ADMIN_PASSWORD = "adminpassword123" # Plain password
ADMIN_ROLE = "Admin"
ADMIN_PHONE = "0000000000"

def create_admin_user():
    print("Đang tạo bảng 'users' trong dashboard_auth.db (nếu chưa có)...")
    BaseAuth.metadata.create_all(bind=engine_auth)
    print("Tạo bảng hoàn tất.")

    db = SessionLocalAuth()

    try:
        existing_admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()

        if existing_admin:
            print(f"Người dùng với email '{ADMIN_EMAIL}' đã tồn tại. Bỏ qua việc tạo mới.")
            return

        # --- SỬA: BỎ HASHING ---
        # hashed_password = get_password_hash(ADMIN_PASSWORD)

        admin_user = User(
            full_name=ADMIN_FULLNAME,
            email=ADMIN_EMAIL,
            phone_number=ADMIN_PHONE,
            hashed_password=ADMIN_PASSWORD, # <-- SỬA: Lưu mật khẩu gốc
            role=ADMIN_ROLE,
            employee_id_link=None
        )

        db.add(admin_user)
        db.commit()

        print("\n--- TẠO ADMIN THÀNH CÔNG! (Mật khẩu KHÔNG mã hóa) ---")
        print(f"  CSDL: dashboard_auth.db")
        print(f"  Email: {ADMIN_EMAIL}")
        print(f"  Password: {ADMIN_PASSWORD} (Plain Text)")
        print("---------------------------------")

    except Exception as e:
        db.rollback()
        print(f"Đã xảy ra lỗi: {e}")
    finally:
        if db: db.close()


if __name__ == "__main__":
    create_admin_user()