// frontend/src/pages/UserManagement.js
import React, { useState, useEffect, useCallback, useRef } from 'react'; // Thêm useRef
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import SetRoleModal from '../components/SetRoleModal';
import ResetPasswordModal from '../components/ResetPasswordModal';

// --- Thêm danh sách vai trò để lọc ---
const ROLES_OPTIONS = ["Admin", "HR Manager", "Payroll Manager", "Employee"];

// --- Skeleton Row Component ---
const SkeletonRow = ({ columns }) => (
    <tr>
        {Array.from({ length: columns }).map((_, index) => (
            <td key={index} style={styles.tableCell}>
                <div style={styles.skeletonCell} className="skeletonCell"></div>
            </td>
        ))}
    </tr>
);

function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user: currentUser } = useAuth();

    // --- Thêm state cho tìm kiếm và lọc ---
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState(''); // State cho dropdown lọc
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm); // State cho debounce

    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // --- Sửa fetchUsers để nhận tham số ---
    const fetchUsers = useCallback(async (search = '', role = '') => {
        setLoading(true);
        try {
            const params = {
                search: search || undefined, // Gửi undefined nếu rỗng
                role: role || undefined,     // Gửi undefined nếu rỗng
                limit: 200 // Lấy nhiều hơn để demo, có thể thêm phân trang sau
            };
            const response = await api.get('/users/', { params });
            setUsers(response.data);
             if (response.data.length === 0 && (search || role)) {
                toast.info("Không tìm thấy tài khoản nào khớp.");
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
            toast.error("Không thể tải danh sách tài khoản.");
        }
        setLoading(false);
    }, []);

    // --- useEffect để debounce searchTerm ---
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500); // Đợi 500ms

        return () => { clearTimeout(handler); };
    }, [searchTerm]);

     // --- useEffect để fetch khi filter thay đổi ---
    const isFirstRun = useRef(true);
    useEffect(() => {
        // Bỏ qua lần chạy đầu tiên (vì fetchUsers() ban đầu đã chạy)
        if (isFirstRun.current) {
            isFirstRun.current = false;
            fetchUsers(); // Fetch lần đầu không cần filter
            return;
        }
        // Chỉ fetch khi debouncedSearchTerm hoặc selectedRoleFilter thay đổi
        fetchUsers(debouncedSearchTerm, selectedRoleFilter);
    }, [debouncedSearchTerm, selectedRoleFilter, fetchUsers]);


    // --- Handlers cho filter ---
    const handleSearchChange = (e) => setSearchTerm(e.target.value);
    const handleRoleFilterChange = (e) => setSelectedRoleFilter(e.target.value);
    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedRoleFilter('');
        // Không cần gọi fetchUsers() ở đây, vì useEffect sẽ tự động chạy khi state thay đổi
    };

    // --- Modal Handlers (Giữ nguyên) ---
    const handleOpenRoleModal = (user) => {
        setSelectedUser(user);
        setIsRoleModalOpen(true);
    };
    const handleCloseRoleModal = () => {
        setSelectedUser(null);
        setIsRoleModalOpen(false);
    };
    const handleRoleUpdateSuccess = () => {
        handleCloseRoleModal();
        toast.success("Cập nhật vai trò thành công!");
        // Fetch lại với filter hiện tại
        fetchUsers(debouncedSearchTerm, selectedRoleFilter); 
    };
    const handleOpenPasswordModal = (user) => {
        setSelectedUser(user);
        setIsPasswordModalOpen(true);
    };
    const handleClosePasswordModal = () => {
        setSelectedUser(null);
        setIsPasswordModalOpen(false);
    };
    const handlePasswordResetSuccess = () => {
        handleClosePasswordModal();
        toast.success(`Đã đặt lại mật khẩu cho ${selectedUser?.email}.`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ padding: '20px', color: 'var(--text-color)' }} // Sửa padding
        >
            <h2 style={{ color: 'var(--text-color)' }}>Quản lý Tài khoản (Auth DB)</h2>
            <p style={{ color: 'var(--text-color-secondary)' }}>Quản lý vai trò và mật khẩu truy cập hệ thống.</p>

            {/* --- Thêm Filter UI --- */}
            <div style={styles.filterContainer}>
                <div style={styles.filterItem}>
                    <label style={styles.filterLabel}>Tìm kiếm (ID, Tên, Email)</label>
                    <input
                        type="text"
                        placeholder="Nhập từ khóa..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        style={styles.filterInput}
                        className="filter-input"
                    />
                </div>
                <div style={styles.filterItem}>
                    <label style={styles.filterLabel}>Lọc theo Vai trò</label>
                    <select
                        value={selectedRoleFilter}
                        onChange={handleRoleFilterChange}
                        style={styles.filterSelect}
                        className="filter-select"
                    >
                        <option value="">Tất cả vai trò</option>
                        {ROLES_OPTIONS.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                </div>
                 <div style={{ ...styles.filterItem, alignSelf: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={handleClearFilters}
                        disabled={loading}
                        style={{ ...styles.filterButtonClear }}
                        className="filterButtonClear"
                    >
                        Xóa bộ lọc
                    </button>
                </div>
            </div>
            {/* --- Kết thúc Filter UI --- */}


            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>ID (Auth)</th>
                            <th style={styles.th}>Họ tên</th>
                            <th style={styles.th}>Email (Tên đăng nhập)</th>
                            <th style={styles.th}>Vai trò</th>
                            <th style={styles.th}>Employee ID (Link)</th>
                            <th style={styles.th}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} columns={6} />)
                        ) : users.length > 0 ? (
                            users.map(user => {
                                const isCurrentUser = user.email === currentUser.email;

                                return (
                                    <tr key={user.id}>
                                        <td style={styles.tableCell}>{user.id}</td>
                                        <td style={styles.tableCell}>{user.full_name}</td>
                                        <td style={styles.tableCell}>{user.email}</td>
                                        <td style={styles.tableCell}>
                                            <span style={styles.roleBadge}>{user.role}</span>
                                        </td>
                                        <td style={styles.tableCell}>{user.employee_id_link || 'N/A'}</td>
                                        <td style={styles.tableCell}>
                                            {isCurrentUser ? (
                                                <span style={styles.annotation}>(Tài khoản của bạn)</span>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleOpenRoleModal(user)}
                                                        className="action-button role-button"
                                                        disabled={isCurrentUser}
                                                    >
                                                        Đặt vai trò
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenPasswordModal(user)}
                                                        className="action-button password-button"
                                                    >
                                                        Đặt lại MK
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan={6} style={styles.emptyCell}>Không tìm thấy tài khoản nào.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {isRoleModalOpen && selectedUser && (
                    <SetRoleModal
                        isOpen={isRoleModalOpen}
                        onClose={handleCloseRoleModal}
                        onSuccess={handleRoleUpdateSuccess}
                        userData={selectedUser}
                    />
                )}
                {isPasswordModalOpen && selectedUser && (
                    <ResetPasswordModal
                        isOpen={isPasswordModalOpen}
                        onClose={handleClosePasswordModal}
                        onSuccess={handlePasswordResetSuccess}
                        userData={selectedUser}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// --- STYLES (Thêm style cho Filter) ---
const styles = {
    // --- Thêm Filter Styles ---
    filterContainer: {
        marginBottom: '20px', padding: '15px',
        border: '1px solid var(--border-color)', borderRadius: '8px',
        background: 'var(--card-bg)', display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', // Responsive grid
        gap: '15px', alignItems: 'flex-end',
    },
    filterItem: { display: 'flex', flexDirection: 'column' },
    filterLabel: { marginBottom: '5px', fontSize: '0.85em', fontWeight: 'bold', color: 'var(--text-color-secondary)' },
    filterInput: { padding: '8px 10px', border: '1px solid var(--input-border-color)', borderRadius: '4px', width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--input-bg)', color: 'var(--text-color)' },
    filterSelect: { padding: '8px 10px', border: '1px solid var(--input-border-color)', borderRadius: '4px', width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text-color)' },
    filterButtonClear: {
        padding: '8px 15px', cursor: 'pointer', border: '1px solid var(--border-color)',
        backgroundColor: 'var(--button-bg)', color: 'var(--button-text)',
        borderRadius: '4px', transition: 'background-color 0.2s', whiteSpace: 'nowrap',
        height: '34px' // Căn chỉnh chiều cao với input/select
    },
    
    // --- Styles cũ ---
    tableContainer: {
        overflowX: 'auto',
        marginTop: '15px',
        backgroundColor: 'var(--card-bg)', 
        border: '1px solid var(--table-border-color)', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.9em',
    },
    th: {
        padding: '10px 12px',
        textAlign: 'left',
        backgroundColor: 'var(--table-header-bg)', 
        borderBottom: '2px solid var(--table-border-color)', 
        whiteSpace: 'nowrap',
        color: 'var(--text-color)', 
    },
    tableCell: {
        padding: '10px 12px',
        borderBottom: '1px solid var(--table-row-border-color)', 
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
        color: 'var(--text-color)', 
    },
    emptyCell: {
        textAlign: 'center',
        padding: '20px',
        color: 'var(--text-color-secondary)' 
    },
    skeletonCell: {
        height: '20px',
        backgroundColor: '#e0e0e0', // Màu cơ bản
        borderRadius: '4px',
        animation: 'pulse 1.5s infinite ease-in-out'
    },
    annotation: {
        fontSize: '0.9em',
        color: 'var(--text-color-secondary)', 
        fontStyle: 'italic',
    },
    roleBadge: { 
        padding: '2px 8px',
        borderRadius: '10px',
        fontWeight: 'bold',
        fontSize: '0.9em',
        backgroundColor: '#e6f7ff',
        border: '1px solid #91d5ff',
        color: '#096dd9',
    }
};

// --- CSS ĐỘNG (Thêm focus style cho filter) ---
(function() {
    const styleId = 'user-management-styles';
    if (document.getElementById(styleId)) {
        // Cập nhật thay vì xóa và thêm lại để tránh nhấp nháy
        // (Trong ví dụ này, chúng ta xóa và thêm lại cho đơn giản)
        document.getElementById(styleId).remove();
    }
    const styleSheet = document.createElement("style");
    styleSheet.id = styleId;
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        @keyframes pulse {
            0% { background-color: #e0e0e0; }
            50% { background-color: #f0f0f0; }
            100% { background-color: #e0e0e0; }
        }
        body.theme-dark .skeletonCell {
            background-color: #333;
            opacity: 0.5;
            animation-name: pulse-dark;
        }
        @keyframes pulse-dark {
            0%{background-color:#333;opacity:.5}
            50%{background-color:#444;opacity:.7}
            100%{background-color:#333;opacity:.5}
        }
        
        .action-button {
            padding: 3px 6px; margin-right: 4px; border-radius: 3px;
            border: 1px solid var(--border-color); 
            background-color: var(--button-bg); 
            color: var(--button-text); 
            cursor: pointer; font-size: 0.9em;
            transition: background-color 0.2s, border-color 0.2s;
            white-space: nowrap;
        }
        .action-button:hover:not(:disabled) {
            border-color: #aaa;
            background-color: var(--border-color) !important; 
        }
        .action-button:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }
        .role-button:hover { background-color: #f6ffed !important; border-color: #b7eb8f !important; }
        .password-button:hover { background-color: #fffbe6 !important; border-color: #ffe58f !important; }

        /* Thêm focus styles cho filter inputs/selects */
        .filter-input:focus, .filter-select:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
            outline: none;
        }
        /* Hover cho nút clear */
        .filterButtonClear:hover {
            background-color: var(--border-color) !important;
        }
        /* Table border fix */
        thead th:last-child, tbody tr td:last-child {
            border-right: none;
        }
    `;
    document.head.appendChild(styleSheet);
})();

export default UserManagement;