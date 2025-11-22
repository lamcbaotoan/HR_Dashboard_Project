# backend/crud/crud_system.py
from sqlalchemy.orm import Session
from models import AuditLog, SystemConfig
import schemas
from datetime import datetime

# --- AUDIT LOGS ---
# backend/crud/crud_system.py

def create_audit_log(db_auth: Session, user_email: str, action: str, target: str = None, details: str = None):
    """Ghi lại nhật ký hoạt động."""
    try:
        log = AuditLog(
            user_email=user_email,
            action=action,
            target=target,
            details=details,
            timestamp=datetime.now()
        )
        db_auth.add(log)
        db_auth.commit()
        print(f"📝 [AUDIT] {user_email} - {action} - {target}")
    except Exception as e:
        db_auth.rollback() # QUAN TRỌNG: Phải rollback nếu lỗi để không kẹt session
        print(f"❌ Error writing audit log (Ignored): {e}")

def get_audit_logs(db_auth: Session, skip: int = 0, limit: int = 100):
    """Lấy danh sách log (Mới nhất trước)."""
    return db_auth.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

# --- SYSTEM CONFIG ---
def get_config(db_auth: Session, key: str):
    return db_auth.query(SystemConfig).filter(SystemConfig.key == key).first()

def set_config(db_auth: Session, key: str, value: str, description: str = None):
    config = db_auth.query(SystemConfig).filter(SystemConfig.key == key).first()
    if config:
        config.value = value
    else:
        config = SystemConfig(key=key, value=value, description=description)
        db_auth.add(config)
    db_auth.commit()
    db_auth.refresh(config)
    return config

def get_all_configs(db_auth: Session):
    return db_auth.query(SystemConfig).all()