# backend/api/v1/endpoints/notifications.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import schemas
from crud import crud_notification
from database import get_db_auth
from auth.auth import get_current_user # Cần user hiện tại

router = APIRouter()

@router.get("/", response_model=List[schemas.Notification])
def read_notifications_for_current_user(
    skip: int = 0,
    limit: int = 10, # Giới hạn số lượng trả về ban đầu
    include_read: bool = False, # Mặc định chỉ lấy chưa đọc
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_user)
):
    """Lấy danh sách thông báo cho người dùng đang đăng nhập."""
    notifications = crud_notification.get_notifications_for_user(
        db_auth, current_user=current_user, skip=skip, limit=limit, include_read=include_read
    )
    return notifications

@router.get("/unread-count", response_model=int)
def get_unread_count(
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_user)
):
    """Lấy số lượng thông báo chưa đọc."""
    count = crud_notification.get_unread_notification_count(db_auth, current_user)
    return count


@router.put("/{notification_id}/read", response_model=schemas.Notification)
def mark_notification_as_read(
    notification_id: int,
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_user)
):
    """Đánh dấu một thông báo cụ thể là đã đọc."""
    result = crud_notification.mark_notification_as_read(db_auth, notification_id, current_user)
    if result is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    if result == "Forbidden":
         raise HTTPException(status_code=403, detail="Not authorized to read this notification")
    return result

@router.put("/read-all", status_code=status.HTTP_200_OK)
def mark_all_user_notifications_as_read(
    db_auth: Session = Depends(get_db_auth),
    current_user: schemas.User = Depends(get_current_user)
):
    """Đánh dấu tất cả thông báo chưa đọc của user là đã đọc."""
    result = crud_notification.mark_all_notifications_as_read(db_auth, current_user)
    return result