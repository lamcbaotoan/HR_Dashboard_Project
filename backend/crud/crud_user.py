# backend/crud/crud_user.py
from sqlalchemy.orm import Session
from sqlalchemy import or_
from models import User
import schemas
from core.security import get_password_hash
from typing import Optional # Make sure Optional is imported

def get_user_by_email(db_auth: Session, email: str):
    return db_auth.query(User).filter(User.email == email).first()

def get_user_by_id(db_auth: Session, user_id: int):
    return db_auth.query(User).filter(User.id == user_id).first()

# --- HÀM ĐÃ SỬA ---
def get_users(
    db_auth: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    role: Optional[str] = None # <-- Đảm bảo tham số 'role' ở đây
):
    query = db_auth.query(User)

    # Filter by search term
    if search:
        search_term_like = f"%{search}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_term_like),
                User.email.ilike(search_term_like)
            )
        )

    # Filter by role
    if role: # <-- Đảm bảo logic lọc ở đây
        query = query.filter(User.role == role)

    # Apply ordering, skip, and limit before fetching
    return query.order_by(User.id).offset(skip).limit(limit).all()
# --- KẾT THÚC HÀM SỬA ---

def create_user(db_auth: Session, user: schemas.UserCreate):
    # Ensure password hashing/storing logic is consistent (using plain text now)
    hashed_password = get_password_hash(user.password) # This should just return the plain password
    db_user = User(
        full_name=user.full_name,
        email=user.email,
        hashed_password=hashed_password, # Storing plain text password
        role=user.role,
        phone_number=user.phone_number,
        employee_id_link=user.employee_id_link
    )
    db_auth.add(db_user)
    db_auth.commit()
    db_auth.refresh(db_user)
    return db_user

def update_user_role(db_auth: Session, user_id: int, new_role: str):
    db_user = get_user_by_id(db_auth, user_id)
    if not db_user:
        return None
    db_user.role = new_role
    db_auth.add(db_user)
    db_auth.commit()
    db_auth.refresh(db_user)
    return db_user

def update_user_password(db_auth: Session, user_id: int, new_password: str):
    db_user = get_user_by_id(db_auth, user_id)
    if not db_user:
        return None

    # Ensure password hashing/storing logic is consistent
    db_user.hashed_password = get_password_hash(new_password) # Should return plain password
    db_auth.add(db_user)
    db_auth.commit()
    db_auth.refresh(db_user)
    return db_user