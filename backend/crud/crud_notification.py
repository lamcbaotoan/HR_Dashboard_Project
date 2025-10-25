# backend/crud/crud_notification.py
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from models import Notification, User as AuthUser
import schemas
from datetime import datetime, timedelta

def create_notification(db_auth: Session, notification: schemas.NotificationCreate):
    """Tạo một thông báo mới trong CSDL Auth."""
    db_notification = Notification(**notification.dict())
    db_auth.add(db_notification)
    db_auth.commit()
    db_auth.refresh(db_notification)
    return db_notification

def get_notifications_for_user(db_auth: Session, current_user: schemas.User, skip: int = 0, limit: int = 20, include_read: bool = False):
    """
    Lấy thông báo cho người dùng hiện tại dựa trên ID và vai trò của họ.
    Sắp xếp theo thời gian mới nhất trước.
    """
    query = db_auth.query(Notification).filter(
        or_(
            Notification.user_id == current_user.id,             # Gửi trực tiếp cho user này
            Notification.role_target == current_user.role        # Gửi cho vai trò của user này
            # Cân nhắc: Có nên thêm Notification.role_target == None không? (Thông báo toàn hệ thống)
        )
    )

    if not include_read:
        query = query.filter(Notification.is_read == False)

    # Lấy thông báo mới nhất trước
    return query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()

def mark_notification_as_read(db_auth: Session, notification_id: int, current_user: schemas.User):
    """Đánh dấu một thông báo là đã đọc, kiểm tra quyền truy cập."""
    db_notification = db_auth.query(Notification).filter(Notification.id == notification_id).first()

    if not db_notification:
        return None # Không tìm thấy

    # Kiểm tra xem user có quyền đọc thông báo này không
    can_read = (
        db_notification.user_id == current_user.id or
        db_notification.role_target == current_user.role
    )

    if not can_read:
         return "Forbidden" # User không có quyền

    if not db_notification.is_read:
        db_notification.is_read = True
        db_auth.add(db_notification)
        db_auth.commit()
        db_auth.refresh(db_notification)

    return db_notification

def mark_all_notifications_as_read(db_auth: Session, current_user: schemas.User):
    """Đánh dấu tất cả thông báo chưa đọc của user là đã đọc."""
    notifications_to_mark = db_auth.query(Notification).filter(
        or_(
            Notification.user_id == current_user.id,
            Notification.role_target == current_user.role
        ),
        Notification.is_read == False
    ).all()

    updated_count = 0
    for notification in notifications_to_mark:
        notification.is_read = True
        db_auth.add(notification)
        updated_count +=1

    if updated_count > 0:
        db_auth.commit()

    return {"marked_read_count": updated_count}

def get_unread_notification_count(db_auth: Session, current_user: schemas.User) -> int:
    """Đếm số lượng thông báo chưa đọc cho user hiện tại."""
    count = db_auth.query(Notification).filter(
        or_(
            Notification.user_id == current_user.id,
            Notification.role_target == current_user.role
        ),
        Notification.is_read == False
    ).count()
    return count