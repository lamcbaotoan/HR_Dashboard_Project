# backend/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
from core.config import settings

# --- Thiết lập 3 Engines và 3 Bases ---

# 1. SQL Server (HUMAN_2025)
engine_sqlserver = create_engine(
    settings.SQLALCHEMY_DATABASE_URI_SQLSERVER,
    # --- THÊM CẤU HÌNH POOL ---
    pool_size=10,         # Tăng số kết nối cơ bản
    max_overflow=20,      # Tăng số kết nối dự phòng
    pool_timeout=30,      # Giữ nguyên timeout chờ kết nối
    # pool_recycle=1800   # Có thể thêm nếu SQL Server của bạn đóng kết nối nhàn rỗi
    # --------------------------
)
SessionLocalSQLServer = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine_sqlserver))
BaseSQLServer = declarative_base()

# 2. MySQL (PAYROLL)
engine_mysql = create_engine(
    settings.SQLALCHEMY_DATABASE_URI_MYSQL,
    # --- THÊM CẤU HÌNH POOL ---
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=3600    # Rất nên có cho MySQL để tránh lỗi connection closed
    # --------------------------
)
SessionLocalMySQL = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine_mysql))
BaseMySQL = declarative_base()

# 3. SQLite (DASHBOARD AUTH)
engine_auth = create_engine(
    settings.DASHBOARD_DB_URL,
    connect_args={"check_same_thread": False}, # Bắt buộc cho SQLite
    # --- THÊM CẤU HÌNH POOL CHO SQLITE ---
    # SQLite thường không cần pool phức tạp, nhưng QueuePool là mặc định
    # Tăng giới hạn nếu cần, nhưng vấn đề SQLite thường là ghi đồng thời
    pool_size=10,         # Tăng nhẹ
    max_overflow=20       # Tăng nhẹ
    # pool_timeout=30     # Mặc định thường là đủ
    # ------------------------------------
)
SessionLocalAuth = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine_auth))
BaseAuth = declarative_base()


# --- Dependencies cho 3 CSDL (Giữ nguyên) ---
def get_db_sqlserver():
    db = SessionLocalSQLServer()
    try:
        yield db
    finally:
        SessionLocalSQLServer.remove()

def get_db_mysql():
    db = SessionLocalMySQL()
    try:
        yield db
    finally:
        SessionLocalMySQL.remove()

def get_db_auth():
    db = SessionLocalAuth()
    try:
        yield db
    finally:
        SessionLocalAuth.remove()