// frontend/src/pages/EmployeeDetail.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

// Import các modal
import EditEmployeeModal from '../components/EditEmployeeModal';
import SetRoleModal from '../components/SetRoleModal';
import ResetPasswordModal from '../components/ResetPasswordModal';

// --- Skeleton Component ---
const SkeletonProfile = () => (
    // Đã thêm padding 20px cho Skeleton để nhất quán
    <div style={styles.skeletonContainer}>
        <div style={styles.skeletonCard}>
            <div style={{ ...styles.skeletonItem, height: '60px', width: '60px', borderRadius: '50%', margin: '0 auto 15px auto' }} className="skeletonItem"></div>
            <div style={{ ...styles.skeletonItem, height: '24px', width: '70%', margin: '0 auto 10px auto' }} className="skeletonItem"></div>
            <div style={{ ...styles.skeletonItem, height: '18px', width: '50%', margin: '0 auto 20px auto' }} className="skeletonItem"></div>
            <div style={{ ...styles.skeletonItem, height: '16px', width: '90%', margin: '0 auto 5px auto' }} className="skeletonItem"></div>
            <div style={{ ...styles.skeletonItem, height: '16px', width: '90%', margin: '0 auto 20px auto' }} className="skeletonItem"></div>
            <div style={{ ...styles.skeletonItem, height: '30px', width: '100%', margin: '5px auto' }} className="skeletonItem"></div>
        </div>
        <div style={styles.skeletonDetails}>
            <div style={styles.skeletonInfoCard}>
                <div style={{ ...styles.skeletonItem, height: '20px', width: '40%', marginBottom: '20px' }} className="skeletonItem"></div>
                <div style={{ ...styles.skeletonItem, height: '16px', width: '90%', marginBottom: '10px' }} className="skeletonItem"></div>
                <div style={{ ...styles.skeletonItem, height: '16px', width: '80%', marginBottom: '10px' }} className="skeletonItem"></div>
                <div style={{ ...styles.skeletonItem, height: '16px', width: '85%', marginBottom: '10px' }} className="skeletonItem"></div>
            </div>
            <div style={styles.skeletonInfoCard}>
                <div style={{ ...styles.skeletonItem, height: '20px', width: '50%', marginBottom: '20px' }} className="skeletonItem"></div>
                <div style={{ ...styles.skeletonItem, height: '40px', width: '100%', marginBottom: '10px' }} className="skeletonItem"></div>
                <div style={{ ...styles.skeletonItem, height: '40px', width: '100%', marginBottom: '10px' }} className="skeletonItem"></div>
            </div>
        </div>
    </div>
);


function EmployeeDetail() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'Admin';
    const isHrManager = currentUser?.role === 'HR Manager';

    // State quản lý Modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get(`/employees/${id}`);
            setProfile(response.data);
        } catch (error) {
            console.error('Failed to fetch employee profile', error);
            toast.error("Không thể tải hồ sơ nhân viên.");
            if (error.response?.status === 403) {
                navigate("/");
            }
        }
        setLoading(false);
    }, [id, navigate]);

    useEffect(() => {
        fetchProfile();
    }, [id, fetchProfile]);

    // --- Modal Handlers ---
    const handleOpenEditModal = () => setIsEditModalOpen(true);
    const handleCloseEditModal = () => setIsEditModalOpen(false);
    const handleUpdateSuccess = () => {
        handleCloseEditModal();
        toast.success("Cập nhật thông tin (HR) thành công!");
        fetchProfile();
    };

    const handleOpenRoleModal = () => setIsRoleModalOpen(true);
    const handleCloseRoleModal = () => setIsRoleModalOpen(false);
    const handleRoleUpdateSuccess = () => {
        handleCloseRoleModal();
        toast.success("Cập nhật vai trò thành công!");
        fetchProfile();
    };

    const handleOpenPasswordModal = () => setIsPasswordModalOpen(true);
    const handleClosePasswordModal = () => setIsPasswordModalOpen(false);
    const handlePasswordResetSuccess = () => {
        handleClosePasswordModal();
        toast.success(`Đã đặt lại mật khẩu cho ${profile?.Email}.`);
    };

    // --- Render Logic ---
    if (loading) return <SkeletonProfile />;
    if (!profile) return <p>Không tìm thấy nhân viên.</p>;

    const userDataForModal = profile.auth_user_id ? {
        id: profile.auth_user_id,
        email: profile.Email,
        role: profile.role
    } : null;

    return (
        <div style={styles.pageContainer}>
            <Link to="/employees" style={styles.backLink}>{"<"} Quay lại Danh sách</Link>

            <div style={styles.layoutGrid}>
                {/* === CỘT TRÁI: PROFILE CARD & ACTIONS === */}
                <div style={styles.profileCard}>
                    <h2 style={{ marginTop: 0, color: 'var(--text-color)' }}>{profile.FullName}</h2>
                    <p style={styles.profilePosition}>{profile.position?.PositionName || 'Chưa có chức vụ'}</p>

                    <div style={styles.profileInfoItem}>
                        <span style={styles.infoLabel}>Email (Tài khoản):</span>
                        <span>{profile.Email}</span>
                    </div>
                    <div style={styles.profileInfoItem}>
                        <span style={styles.infoLabel}>Vai trò (Auth):</span>
                        <span style={styles.roleBadge}>{profile.role || 'Chưa có TK'}</span>
                    </div>
                    <div style={styles.profileInfoItem}>
                        <span style={styles.infoLabel}>SĐT:</span>
                        <span>{profile.PhoneNumber || 'Chưa cập nhật'}</span>
                    </div>

                    <hr style={styles.divider} />

                    <h4 style={{ color: 'var(--text-color)' }}>Hành động</h4>
                    <div style={styles.actionButtonsContainer}>
                        {(isAdmin || isHrManager) && (
                            <button onClick={handleOpenEditModal} className="action-button-profile edit-button-profile">
                                Sửa thông tin (HR)
                            </button>
                        )}
                        {isAdmin && userDataForModal && currentUser?.email !== profile.Email && (
                            <>
                                <button onClick={handleOpenRoleModal} className="action-button-profile role-button-profile">
                                    Đặt vai trò (Auth)
                                </button>
                                <button onClick={handleOpenPasswordModal} className="action-button-profile password-button-profile">
                                    Đặt lại mật khẩu
                                </button>
                            </>
                        )}
                        {isAdmin && !userDataForModal && (
                            <p style={styles.annotation}>(Nhân viên chưa có tài khoản Auth)</p>
                        )}
                    </div>
                </div>

                {/* === CỘT PHẢI: DETAILS (HR & PAYROLL) === */}
                <div style={styles.detailsContainer}>
                    <div style={styles.infoCard}>
                        <h3 style={{ color: 'var(--text-color)' }}>Thông tin Hành chính (HR DB)</h3>
                        <div style={styles.infoGrid}>
                            <div><strong>Phòng ban:</strong> {profile.department?.DepartmentName}</div>
                            <div><strong>Trạng thái:</strong> {profile.Status}</div>
                            <div><strong>Ngày vào làm:</strong> {profile.HireDate}</div>
                            <div><strong>Ngày sinh:</strong> {profile.DateOfBirth}</div>
                            <div><strong>Giới tính:</strong> {profile.Gender}</div>
                            <div><strong>ID (HR):</strong> {profile.EmployeeID}</div>
                        </div>
                    </div>

                    <div style={styles.infoCard}>
                        <h3 style={{ color: 'var(--text-color)' }}>Lịch sử Lương (Payroll DB)</h3>
                        <div style={styles.tableWrapper}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Tháng</th>
                                        <th style={styles.th}>Lương CB</th>
                                        <th style={styles.th}>Thưởng</th>
                                        <th style={styles.th}>Khấu trừ</th>
                                        <th style={styles.th}>Thực nhận</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profile.salaries.map(s => (
                                        <tr key={s.SalaryID}>
                                            <td style={styles.td}>{s.SalaryMonth}</td>
                                            <td style={styles.td}>{s.BaseSalary}</td>
                                            <td style={styles.td}>{s.Bonus}</td>
                                            <td style={styles.td}>{s.Deductions}</td>
                                            <td style={styles.td}><strong>{s.NetSalary}</strong></td>
                                        </tr>
                                    ))}
                                    {profile.salaries.length === 0 && (
                                        <tr><td colSpan={5} style={{ ...styles.td, textAlign: 'center' }}>Không có dữ liệu lương.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={styles.infoCard}>
                        <h3 style={{ color: 'var(--text-color)' }}>Lịch sử Chấm công (Payroll DB)</h3>
                        <div style={styles.tableWrapper}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Tháng</th>
                                        <th style={styles.th}>Ngày làm việc</th>
                                        <th style={styles.th}>Vắng mặt</th>
                                        <th style={styles.th}>Nghỉ phép</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profile.attendances.map(a => (
                                        <tr key={a.AttendanceID}>
                                            <td style={styles.td}>{a.AttendanceMonth}</td>
                                            <td style={styles.td}>{a.WorkDays}</td>
                                            <td style={styles.td}>{a.AbsentDays}</td>
                                            <td style={styles.td}>{a.LeaveDays}</td>
                                        </tr>
                                    ))}
                                    {profile.attendances.length === 0 && (
                                        <tr><td colSpan={4} style={{ ...styles.td, textAlign: 'center' }}>Không có dữ liệu chấm công.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* === MODALS === */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <EditEmployeeModal
                        isOpen={isEditModalOpen}
                        onClose={handleCloseEditModal}
                        onSuccess={handleUpdateSuccess}
                        employeeData={profile}
                    />
                )}
                {isRoleModalOpen && userDataForModal && (
                    <SetRoleModal
                        isOpen={isRoleModalOpen}
                        onClose={handleCloseRoleModal}
                        onSuccess={handleRoleUpdateSuccess}
                        userData={userDataForModal}
                    />
                )}
                {isPasswordModalOpen && userDataForModal && (
                    <ResetPasswordModal
                        isOpen={isPasswordModalOpen}
                        onClose={handleClosePasswordModal}
                        onSuccess={handlePasswordResetSuccess}
                        userData={userDataForModal}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// --- STYLES ĐÃ CẬP NHẬT ---
const styles = {
    pageContainer: {
        padding: '20px', // FIX: Thêm padding 20px giống Dashboard.js
        color: 'var(--text-color)'
    },
    backLink: {
        display: 'inline-block',
        marginBottom: '15px',
        color: 'var(--primary-color)',
        textDecoration: 'none',
        fontWeight: 'bold',
    },
    layoutGrid: {
        display: 'flex',
        flexDirection: 'row',
        gap: '20px',
        flexWrap: 'wrap',
    },
    // Cột trái
    profileCard: {
        flex: 1,
        minWidth: '300px',
        padding: '20px',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        alignSelf: 'flex-start',
    },
    profilePosition: {
        fontSize: '1.1em',
        color: 'var(--text-color-secondary)',
        marginTop: '-10px',
    },
    profileInfoItem: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '10px',
        fontSize: '0.9em',
    },
    infoLabel: {
        fontWeight: 'bold',
        color: 'var(--text-color)',
    },
    roleBadge: {
        padding: '2px 8px',
        backgroundColor: '#e6f7ff',
        border: '1px solid #91d5ff',
        borderRadius: '10px',
        color: '#096dd9',
        fontWeight: 'bold',
    },
    divider: {
        border: 'none',
        borderTop: '1px solid var(--table-row-border-color)',
        margin: '20px 0',
    },
    actionButtonsContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    annotation: { fontSize: '0.8em', color: 'var(--text-color-secondary)', fontStyle: 'italic' },
    // Cột phải
    detailsContainer: {
        flex: 2,
        minWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    infoCard: {
        padding: '20px',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '10px',
        color: 'var(--text-color)',
    },
    tableWrapper: {
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        color: 'var(--text-color)',
    },
    th: {
        padding: '10px',
        textAlign: 'left',
        backgroundColor: 'var(--table-header-bg)',
        borderBottom: '2px solid var(--table-border-color)',
        color: 'var(--text-color)',
    },
    td: {
        padding: '10px',
        borderBottom: '1px solid var(--table-row-border-color)',
        color: 'var(--text-color)',
    },

    // Skeleton Styles
    skeletonContainer: {
        display: 'flex',
        gap: '20px',
        padding: '20px', // FIX: Thêm padding 20px
        flexWrap: 'wrap', // Thêm wrap cho responsive
    },
    skeletonCard: {
        flex: 1, minWidth: '300px', padding: '20px',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        alignSelf: 'flex-start',
    },
    skeletonDetails: {
        flex: 2, minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px',
    },
    skeletonInfoCard: {
        padding: '20px',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
    },
    skeletonItem: {
        backgroundColor: '#e0e0e0',
        borderRadius: '4px',
        animation: 'pulse 1.5s infinite ease-in-out',
    }
};

// CSS Động (Thêm dark mode cho skeleton)
(function () {
    const styleId = 'employee-detail-styles';
    if (!document.getElementById(styleId)) {
        const styleSheet = document.createElement("style");
        styleSheet.id = styleId;
        styleSheet.type = "text/css";
        styleSheet.innerText = `
            @keyframes pulse {
                0% { background-color: #e0e0e0; }
                50% { background-color: #f0f0f0; }
                100% { background-color: #e0e0e0; }
            }
             /* Dark mode skeleton adjustment */
             body.theme-dark .skeletonItem {
                 background-color: #333;
                 opacity: 0.5;
                 animation-name: pulse-dark;
             }
             @keyframes pulse-dark {
                 0% { background-color: #333; opacity: 0.5; }
                 50% { background-color: #444; opacity: 0.7; }
                 100% { background-color: #333; opacity: 0.5; }
             }

             /* Profile Card Action Buttons */
             .action-button-profile {
                 padding: 8px 12px; border: 1px solid var(--border-color);
                 border-radius: 4px; cursor: pointer; font-weight: bold;
                 transition: background-color 0.2s, border-color 0.2s;
                 background-color: var(--button-bg); color: var(--button-text);
                 text-align: center;
             }
             /* Giữ màu semantic */
             .edit-button-profile { background-color: #fffbe6; border-color: #ffe58f; color: #d46b08; }
             .role-button-profile { background-color: #f6ffed; border-color: #b7eb8f; color: #389e0d; }
             .password-button-profile { background-color: #fff0f6; border-color: #ffadd2; color: #c41d7f; }

             .edit-button-profile:hover { background-color: #ffe58f !important; }
             .role-button-profile:hover { background-color: #d9f7be !important; }
             .password-button-profile:hover { background-color: #ffadd2 !important; }
        `;
        document.head.appendChild(styleSheet);
    }
})();

export default EmployeeDetail;