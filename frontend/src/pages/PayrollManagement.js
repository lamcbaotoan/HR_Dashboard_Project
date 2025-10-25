// frontend/src/pages/PayrollManagement.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import EditSalaryModal from '../components/EditSalaryModal';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

// --- Skeleton cho Bảng tìm kiếm ---
const SkeletonSearchRow = () => (
    <tr>
        <td style={styles.thTd}><div style={styles.skeletonCell} className="skeletonCell"></div></td>
        <td style={styles.thTd}><div style={styles.skeletonCell} className="skeletonCell"></div></td>
        <td style={styles.thTd}><div style={styles.skeletonCell} className="skeletonCell"></div></td>
        <td style={styles.thTd}><div style={styles.skeletonCell} className="skeletonCell"></div></td>
        <td style={styles.thTd}><div style={styles.skeletonCell} className="skeletonCell"></div></td>
    </tr>
);

// --- Skeleton cho Hồ sơ chi tiết ---
const SkeletonProfile = () => (
    <div style={styles.profileSection}>
        <h3><div style={{...styles.skeletonCell, height: '24px', width: '60%'}} className="skeletonCell"></div></h3>
        <h4 style={{marginTop: '20px', color: 'var(--text-color)'}}>Lịch sử Lương (PAYROLL)</h4>
        <div style={{...styles.skeletonCell, height: '100px', width: '100%'}} className="skeletonCell"></div>
        <h4 style={{ marginTop: '20px', color: 'var(--text-color)' }}>Lịch sử Chấm công (PAYROLL)</h4>
        <div style={{...styles.skeletonCell, height: '60px', width: '100%'}} className="skeletonCell"></div>
    </div>
);

function PayrollManagement() {
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [departments, setDepartments] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [salaryToEdit, setSalaryToEdit] = useState(null);

    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

    const fetchEmployees = useCallback(async (search = '', deptId = '') => {
        setLoadingSearch(true);
        setSelectedProfile(null);
        setSearchResults([]); 
        try {
            const params = {
                search: search,
                department_id: deptId || undefined,
            };
            const response = await api.get('/employees/', { params });
            setSearchResults(response.data);
            if (response.data.length === 0 && (search || deptId)) {
                toast.info('Không tìm thấy nhân viên nào khớp với bộ lọc.');
            }
        } catch (err) {
            console.error('Fetch failed', err);
            toast.error('Tải danh sách thất bại, vui lòng thử lại.');
        }
        setLoadingSearch(false);
    }, []);

    // --- Tải dữ liệu ban đầu (Phòng ban + DS Nhân viên) ---
    useEffect(() => {
        const loadInitialData = async () => {
            setLoadingSearch(true);
            try {
                const deptRes = await api.get('/departments/');
                setDepartments(deptRes.data);
                const empRes = await api.get('/employees/');
                setSearchResults(empRes.data);
            } catch (error) {
                toast.error("Không thể tải dữ liệu khởi tạo.");
            } finally {
                setLoadingSearch(false);
            }
        };
        loadInitialData();
    }, []);

    // --- useEffect để debounce searchTerm ---
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500); 

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    // --- useEffect để tự động fetch khi filter thay đổi ---
    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        
        fetchEmployees(debouncedSearchTerm, departmentId);
    }, [debouncedSearchTerm, departmentId, fetchEmployees]);

    const handleClearFilters = () => {
        setSearchTerm('');
        setDepartmentId('');
    };

    const fetchEmployeeProfile = async (employeeId) => {
        setLoadingProfile(true);
        setSelectedProfile(null); 
        
        try {
            const response = await api.get(`/employees/${employeeId}`);
            setSelectedProfile(response.data);
            setSearchResults([]); 
           // setSearchTerm(''); 
            //setDepartmentId('');
        } catch (err) {
            console.error('Failed to fetch profile', err);
            toast.error('Không thể tải hồ sơ chi tiết của nhân viên này.');
        }
        setLoadingProfile(false);
    };

    const handleOpenModal = (salaryRecord) => {
        setSalaryToEdit(salaryRecord);
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSalaryToEdit(null);
    };

    const handleUpdateSuccess = () => {
        handleCloseModal();
        toast.success("Cập nhật lương thành công!");
        if (selectedProfile) {
            fetchEmployeeProfile(selectedProfile.EmployeeID);
        }
    };

    const handleBackToList = () => {
         setSelectedProfile(null);
         fetchEmployees(searchTerm, departmentId);
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            // FIX: Sửa padding từ '0px' thành '20px'
            style={{ padding: '20px', color: 'var(--text-color)' }}
        >
            <h2 style={{ color: 'var(--text-color)' }}>Quản lý Bảng lương & Chấm công (Từ PAYROLL)</h2>

            {/* --- PHẦN 1: TÌM KIẾM VÀ LỌC --- */}
            <AnimatePresence initial={false}>
                {!selectedProfile && !loadingProfile && (
                    <motion.div
                        style={styles.searchSection}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto', transition: { duration: 0.3 } }}
                        exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                    >
                        <div style={styles.filterGrid}>
                            <div style={styles.filterItem}>
                                <label style={styles.filterLabel}>Tìm kiếm (ID, Tên...)</label>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={styles.filterInput}
                                    className="filter-input"
                                    placeholder="Nhập thông tin..."
                                />
                            </div>
                            <div style={styles.filterItem}>
                                <label style={styles.filterLabel}>Lọc theo Phòng ban</label>
                                <select
                                    value={departmentId}
                                    onChange={(e) => setDepartmentId(e.target.value)}
                                    style={styles.filterSelect}
                                    className="filter-select"
                                >
                                    <option value="">Tất cả phòng ban</option>
                                    {departments.map(dept => (
                                        <option key={dept.DepartmentID} value={dept.DepartmentID}>
                                            {dept.DepartmentName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ ...styles.filterItem, alignSelf: 'flex-end' }}>
                                <button 
                                    type="button" 
                                    onClick={handleClearFilters} 
                                    disabled={loadingSearch} 
                                    style={{ ...styles.button, ...styles.cancelButton, marginLeft: 0 }}
                                    className="filter-clear-button" // Thêm class để CSS
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        </div>

                        {/* Bảng kết quả tìm kiếm */}
                        <div style={styles.tableContainer}>
                            <table style={styles.resultsTable}>
                                <thead>
                                    <tr style={styles.header}>
                                        <th style={styles.thTd}>ID</th>
                                        <th style={styles.thTd}>Họ tên</th>
                                        <th style={styles.thTd}>Email</th>
                                        <th style={styles.thTd}>Phòng ban</th>
                                        <th style={styles.thTd}>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingSearch ? (
                                        Array.from({ length: 5 }).map((_, i) => <SkeletonSearchRow key={i} />)
                                    ) : searchResults.length > 0 ? (
                                        searchResults.map(emp => (
                                            <tr key={emp.EmployeeID}>
                                                <td style={styles.thTd}>{emp.EmployeeID}</td>
                                                <td style={styles.thTd}>{emp.FullName}</td>
                                                <td style={styles.thTd}>{emp.Email}</td>
                                                <td style={styles.thTd}>{emp.department?.DepartmentName || 'N/A'}</td>
                                                <td style={styles.thTd}>
                                                    <button onClick={() => fetchEmployeeProfile(emp.EmployeeID)} disabled={loadingProfile} className="action-button view-button">
                                                        Xem Lương
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={5} style={styles.emptyCell}>Không tìm thấy nhân viên.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- PHẦN 2: HIỂN THỊ HỒ SƠ LƯƠNG & CHẤM CÔNG --- */}
            {loadingProfile && <SkeletonProfile />}
            
            {!loadingProfile && selectedProfile && (
                <motion.div
                    style={styles.profileSection}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <button style={styles.backLink} onClick={handleBackToList}>
                        {"<"} Quay lại danh sách
                    </button>
                    <h3 style={{ color: 'var(--text-color)' }}>Hồ sơ Lương & Chấm công của: {selectedProfile.FullName} (ID: {selectedProfile.EmployeeID})</h3>
                    
                    <h4 style={{ color: 'var(--text-color)', marginTop: '20px' }}>Lịch sử Lương (PAYROLL)</h4>
                    <div style={styles.tableContainer}>
                        <table style={styles.salaryTable}>
                            <thead>
                                <tr style={styles.header}>
                                    <th style={styles.thTd}>Tháng</th>
                                    <th style={styles.thTd}>Lương CB</th>
                                    <th style={styles.thTd}>Thưởng</th>
                                    <th style={styles.thTd}>Khấu trừ</th>
                                    <th style={styles.thTd}>Thực nhận</th>
                                    <th style={styles.thTd}>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedProfile.salaries.map(s => (
                                    <tr key={s.SalaryID}>
                                        <td style={styles.thTd}>{s.SalaryMonth}</td>
                                        <td style={styles.thTd}>{s.BaseSalary}</td>
                                        <td style={styles.thTd}>{s.Bonus}</td>
                                        <td style={styles.thTd}>{s.Deductions}</td>
                                        <td style={styles.thTd}><strong>{s.NetSalary}</strong></td>
                                        <td style={styles.thTd}>
                                            <button onClick={() => handleOpenModal(s)} className="action-button edit-button">Sửa</button>
                                        </td>
                                    </tr>
                                ))}
                                {selectedProfile.salaries.length === 0 && (
                                    <tr><td colSpan={6} style={styles.emptyCell}>Không có dữ liệu lương.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <h4 style={{ color: 'var(--text-color)', marginTop: '20px' }}>Lịch sử Chấm công (PAYROLL)</h4>
                    <div style={styles.tableContainer}>
                        <table style={styles.salaryTable}>
                            <thead>
                                <tr style={styles.header}>
                                    <th style={styles.thTd}>Tháng</th>
                                    <th style={styles.thTd}>Ngày làm việc</th>
                                    <th style={styles.thTd}>Vắng mặt</th>
                                    <th style={styles.thTd}>Nghỉ phép</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedProfile.attendances.map(a => (
                                    <tr key={a.AttendanceID}>
                                        <td style={styles.thTd}>{a.AttendanceMonth}</td>
                                        <td style={styles.thTd}>{a.WorkDays}</td>
                                        <td style={styles.thTd}>{a.AbsentDays}</td>
                                        <td style={styles.thTd}>{a.LeaveDays}</td>
                                    </tr>
                                ))}
                                {selectedProfile.attendances.length === 0 && (
                                    <tr><td colSpan={4} style={styles.emptyCell}>Không có dữ liệu chấm công.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* --- PHẦN 3: MODAL CHỈNH SỬA (DÙNG AnimatePresence) --- */}
            <AnimatePresence>
                {isModalOpen && (
                    <EditSalaryModal
                        isOpen={isModalOpen}
                        onClose={handleCloseModal}
                        onSuccess={handleUpdateSuccess}
                        salaryData={salaryToEdit}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// --- STYLES ĐÃ CẬP NHẬT ---
const styles = {
    searchSection: {
        marginBottom: '20px', padding: '15px',
        border: '1px solid var(--border-color)', // Dùng var
        borderRadius: '8px',
        background: 'var(--card-bg)', // Dùng var
        overflow: 'hidden',
    },
    filterGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px', alignItems: 'flex-end',
    },
    filterItem: { display: 'flex', flexDirection: 'column' },
    filterLabel: { marginBottom: '5px', fontSize: '0.85em', fontWeight: 'bold', color: 'var(--text-color-secondary)' }, // Dùng var
    filterInput: { padding: '8px 10px', border: '1px solid var(--input-border-color)', borderRadius: '4px', width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--input-bg)', color: 'var(--text-color)' }, // Dùng var
    filterSelect: { padding: '8px 10px', border: '1px solid var(--input-border-color)', borderRadius: '4px', width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text-color)' }, // Dùng var
    button: {
        padding: '8px 12px', border: 'none', borderRadius: '4px',
        cursor: 'pointer', fontWeight: 'bold', marginLeft: '10px',
    },
    submitButton: { backgroundColor: 'var(--primary-color)', color: '#fff' }, // Dùng var
    cancelButton: { backgroundColor: 'var(--button-bg)', color: 'var(--button-text)', border: '1px solid var(--border-color)' }, // Dùng var
    
    tableContainer: { overflowX: 'auto', marginTop: '15px' },
    resultsTable: {
        width: '100%', borderCollapse: 'collapse', color: 'var(--text-color)' // Dùng var
    },
    profileSection: {
        marginTop: '20px', padding: '15px',
        border: '1px solid var(--border-color)', // Dùng var
        borderRadius: '8px',
        backgroundColor: 'var(--card-bg)', // Dùng var
        color: 'var(--text-color)' // Dùng var
    },
    salaryTable: {
        width: '100%', borderCollapse: 'collapse', marginTop: '10px', color: 'var(--text-color)' // Dùng var
    },
    thTd: {
        border: '1px solid var(--table-border-color)', // Dùng var
        padding: '8px 10px', textAlign: 'left', verticalAlign: 'middle',
    },
    header: {
        backgroundColor: 'var(--table-header-bg)', // Dùng var
        color: 'var(--text-color)', // Dùng var
    },
    emptyCell: {
        textAlign: 'center', padding: '20px', color: 'var(--text-color-secondary)' // Dùng var
    },
    backLink: {
        display: 'inline-block', marginBottom: '15px',
        color: 'var(--primary-color)', // Dùng var
        textDecoration: 'none', fontWeight: 'bold', cursor: 'pointer',
        background: 'none', border: 'none'
    },
    skeletonCell: {
        height: '20px', backgroundColor: '#e0e0e0',
        borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out',
    },
};

// --- CSS ĐỘNG ĐÃ CẬP NHẬT ---
(function() {
    const styleId = 'payroll-management-styles';
    if (document.getElementById(styleId)) {
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
        /* Dark skeleton */
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

        /* Action buttons */
        .action-button {
            padding: 3px 6px; margin-right: 4px; border-radius: 3px;
            border: 1px solid var(--border-color); background-color: var(--button-bg); color: var(--button-text); /* Dùng var */
            cursor: pointer; font-size: 0.9em; transition: background-color 0.2s, border-color 0.2s;
        }
        .action-button:hover {
            border-color: #aaa;
            background-color: var(--border-color) !important; /* Dùng var */
        }
        /* Giữ màu semantic */
        .view-button:hover { background-color: #e6f7ff !important; border-color: #91d5ff !important; }
        .edit-button:hover { background-color: #fffbe6 !important; border-color: #ffe58f !important; }

        /* Focus styles */
        .filter-input:focus, .filter-select:focus {
             border-color: var(--primary-color);
             box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
             outline: none;
        }
        /* Clear button hover */
        .filter-clear-button:hover {
            background-color: var(--border-color) !important;
        }
        /* Table header text color */
        thead th {
            color: var(--text-color);
        }
    `;
    document.head.appendChild(styleSheet);
})();

export default PayrollManagement;