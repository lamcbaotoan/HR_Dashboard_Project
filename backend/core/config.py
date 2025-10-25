# backend/core/config.py
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine # Đã chuyển import create_engine về đây

load_dotenv()

class Settings:
    # SQL Server (CSDL Cũ 1)
    SQL_SERVER_DRIVER = os.getenv("SQL_SERVER_DRIVER", "ODBC Driver 17 for SQL Server")
    SQL_SERVER_SERVER = os.getenv("SQL_SERVER_SERVER", "(LocalDB)\\MSSQLLocalDB")
    SQL_SERVER_DATABASE = os.getenv("SQL_SERVER_DATABASE", "HUMAN_2025")
    SQL_SERVER_USER = os.getenv("SQL_SERVER_USER")
    SQL_SERVER_PASSWORD = os.getenv("SQL_SERVER_PASSWORD")

    _driver_formatted = SQL_SERVER_DRIVER.replace(' ', '+')

    if SQL_SERVER_USER:
        SQLALCHEMY_DATABASE_URI_SQLSERVER = (
            f"mssql+pyodbc://{SQL_SERVER_USER}:{SQL_SERVER_PASSWORD}@"
            f"{SQL_SERVER_SERVER}/{SQL_SERVER_DATABASE}?"
            f"driver={_driver_formatted}&charset=utf8&MARS_Connection=yes"
        )
    else:
        SQLALCHEMY_DATABASE_URI_SQLSERVER = (
            f"mssql+pyodbc://{SQL_SERVER_SERVER}/{SQL_SERVER_DATABASE}?"
            f"driver={_driver_formatted}&Trusted_Connection=yes&charset=utf8&MARS_Connection=yes"
        )

    # MySQL (CSDL Cũ 2) - KIỂM TRA LẠI PHẦN NÀY
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "payroll")
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "") # Đảm bảo đọc đúng biến

    SQLALCHEMY_DATABASE_URI_MYSQL = (
        f"mysql+mysqlconnector://{MYSQL_USER}:{MYSQL_PASSWORD}@"
        f"{MYSQL_HOST}/{MYSQL_DATABASE}?charset=utf8mb4"
    )
    # KẾT THÚC KIỂM TRA MYSQL

    # CSDL mới cho Dashboard Auth (SQLite)
    DASHBOARD_DB_URL = os.getenv("DASHBOARD_DB_URL", "sqlite:///./dashboard_auth.db")

    # JWT Settings
    SECRET_KEY = os.getenv("SECRET_KEY", "a_very_secret_key_that_is_long_and_secure")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

settings = Settings()
