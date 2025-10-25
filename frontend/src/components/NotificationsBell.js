// frontend/src/components/NotificationsBell.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Icon Chuông SVG (có thể thay bằng icon từ thư viện)
const BellIcon = ({ hasUnread }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    {/* Chấm đỏ nhỏ hơn */}
    {hasUnread && <circle cx="19.5" cy="5.5" r="3" fill="#ff4d4f" stroke="#fff" strokeWidth="1"/>}
  </svg>
);

const NotificationsBell = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null); // Để đóng dropdown khi click ra ngoài

    // Hàm fetch, dùng useCallback để ổn định
    const fetchNotifications = useCallback(async (includeRead = false) => {
        if (!user) return;
        setLoading(true);
        try {
            // Lấy cả count và list chưa đọc (hoặc cả đã đọc nếu includeRead=true)
            const countRes = await api.get('/notifications/unread-count');
            setUnreadCount(countRes.data);

            const listRes = await api.get('/notifications/', { params: { limit: 10, include_read: includeRead } });
            setNotifications(listRes.data);

        } catch (error) {
            console.error("Failed to fetch notifications", error);
            // Có thể thêm state lỗi để hiển thị
        } finally {
            setLoading(false);
        }
    }, [user]); // Chỉ phụ thuộc vào user

    // Fetch lần đầu và đặt interval
    useEffect(() => {
        if (user) {
            fetchNotifications();
            const intervalId = setInterval(() => fetchNotifications(), 60000); // Poll mỗi phút
            return () => clearInterval(intervalId);
        }
    }, [fetchNotifications, user]); // Gọi lại fetchNotifications nếu nó thay đổi (do user thay đổi)

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggleDropdown = () => {
        setIsOpen(!isOpen);
        // Nếu mở ra, fetch lại để cập nhật (có thể fetch cả đã đọc)
        if (!isOpen) {
             fetchNotifications(true); // Lấy cả thông báo đã đọc
        }
    };

    const handleMarkAsRead = async (notificationId) => {
        // Đánh dấu ở backend
        try {
            await api.put(`/notifications/${notificationId}/read`);
            // Cập nhật UI ngay lập tức
            setNotifications(prev => prev.map(n =>
                n.id === notificationId ? { ...n, is_read: true } : n
            ));
            // Giảm count nếu nó chưa đọc
            const wasUnread = notifications.find(n => n.id === notificationId)?.is_read === false;
            if (wasUnread) {
                 setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    };

     const handleMarkAllRead = async () => {
        try {
            await api.put(`/notifications/read-all`);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    if (!user) return null;

    return (
        <div style={styles.bellContainer} ref={dropdownRef}>
            <button onClick={handleToggleDropdown} style={styles.bellButton} title="Thông báo">
                <BellIcon hasUnread={unreadCount > 0} />
                {unreadCount > 0 && <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {isOpen && (
                <div style={styles.dropdown}>
                    <div style={styles.dropdownHeader}>
                        <span>Thông báo</span>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} style={styles.markAllReadButton}>
                                Đánh dấu tất cả đã đọc
                            </button>
                        )}
                    </div>
                    <div style={styles.dropdownContent}>
                        {loading && <p style={styles.dropdownItem}>Đang tải...</p>}
                        {!loading && notifications.length === 0 && (
                            <p style={styles.dropdownItem}>Không có thông báo nào.</p>
                        )}
                        {!loading && notifications.map((notification) => (
                            <div
                                key={notification.id}
                                style={notification.is_read ? styles.dropdownItemRead : styles.dropdownItem}
                            >
                                <p style={{ margin: '0 0 5px 0' }}>{notification.message}</p>
                                <div style={styles.itemFooter}>
                                    <small style={{ color: '#888' }}>
                                        {new Date(notification.created_at).toLocaleString('vi-VN')}
                                    </small>
                                    {!notification.is_read && (
                                        <button
                                            onClick={() => handleMarkAsRead(notification.id)}
                                            style={styles.markReadButton}
                                            title="Đánh dấu đã đọc"
                                        >
                                            ✔️
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Có thể thêm link Xem tất cả ở đây */}
                </div>
            )}
        </div>
    );
};

// --- CSS Styles ---
const styles = {
    bellContainer: { position: 'relative', marginLeft: '15px', },
    bellButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '5px', position: 'relative', color: '#333', },
    badge: {
        position: 'absolute', top: '0px', right: '0px', background: '#ff4d4f',
        color: 'white', borderRadius: '50%', padding: '1px 5px', fontSize: '0.7em',
        fontWeight: 'bold', minWidth: '16px', height: '16px', display: 'flex',
        justifyContent: 'center', alignItems: 'center', lineHeight: '1'
    },
    dropdown: {
        position: 'absolute', top: 'calc(100% + 5px)', right: 0, width: '380px',
        backgroundColor: 'white', boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
        borderRadius: '4px', zIndex: 1100, border: '1px solid #ddd',
    },
    dropdownHeader: {
        padding: '12px 15px', borderBottom: '1px solid #eee', fontWeight: 'bold',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
    dropdownContent: { maxHeight: '350px', overflowY: 'auto' }, // Thêm cuộn
    dropdownItem: { padding: '12px 15px', borderBottom: '1px solid #eee', fontSize: '0.9em', cursor: 'default', '&:last-child': { borderBottom: 'none' } },
    dropdownItemRead: { padding: '12px 15px', borderBottom: '1px solid #eee', fontSize: '0.9em', backgroundColor: '#f9f9f9', color: '#777', '&:last-child': { borderBottom: 'none' } },
    itemFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' },
    markReadButton: { background: 'none', border: 'none', color: '#1890ff', cursor: 'pointer', fontSize: '1.1em', padding: '0', },
    markAllReadButton: { background: 'none', border: 'none', color: '#1890ff', cursor: 'pointer', fontSize: '0.8em', padding: '0', fontWeight: 'normal', },
};

export default NotificationsBell;