// frontend/src/pages/EmployeeList.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import AddEmployeeModal from '../components/AddEmployeeModal';
import EditEmployeeModal from '../components/EditEmployeeModal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { AnimatePresence } from 'framer-motion';

const STATUS_OPTIONS = ["Đang làm việc", "Nghỉ phép", "Thử việc", "Thực tập"];

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

function EmployeeList() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ departmentId: '', positionId: '', status: '' });
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [employeeToEdit, setEmployeeToEdit] = useState(null);
    const isAdmin = currentUser?.role === 'Admin';
    const isHrManager = currentUser?.role === 'HR Manager';

    // --- fetchEmployees ---
    const fetchEmployees = useCallback(async (currentSearchTerm = searchTerm, currentFilters = filters) => {
        setLoading(true);
        try {
            const params = {
                search: currentSearchTerm,
                department_id: currentFilters.departmentId || undefined,
                position_id: currentFilters.positionId || undefined,
                status: currentFilters.status || undefined,
            };
            const response = await api.get('/employees/', { params });
            setEmployees(response.data);
        } catch (err) {
            console.error('Failed to fetch employees', err);
            toast.error('Không thể tải danh sách nhân viên.');
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    // --- useEffect to load initial data ---
    useEffect(() => {
        const fetchFilterData = async () => {
             setLoading(true);
             setEmployees([]);
            try {
                const [deptRes, posRes] = await Promise.all([
                    api.get('/departments/'),
                    api.get('/positions/')
                ]);
                setDepartments(deptRes.data);
                setPositions(posRes.data);
                await fetchEmployees('', { departmentId: '', positionId: '', status: '' });
            } catch (err) {
                console.error("Failed to load initial data", err);
                toast.error("Không thể tải dữ liệu bộ lọc hoặc nhân viên.");
                setLoading(false);
            }
        };
        fetchFilterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- useEffect để fetch khi filter thay đổi (debounce) ---
    const debounceTimeout = useRef(null);
    useEffect(() => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
            fetchEmployees(searchTerm, filters);
        }, 500);

        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, [searchTerm, filters, fetchEmployees]);


    // --- Filter Handlers ---
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
     const handleSearchChange = (e) => {
         setSearchTerm(e.target.value);
    };
    const handleClearFilters = () => {
        setSearchTerm('');
        setFilters({ departmentId: '', positionId: '', status: '' });
    };

    // --- Modal Handlers ---
    const handleViewDetails = (id) => navigate(`/employees/${id}`);
    const handleOpenAddModal = () => setIsAddModalOpen(true);
    const handleCloseAddModal = () => setIsAddModalOpen(false);
    const handleAddSuccess = () => { handleCloseAddModal(); toast.success("Thêm nhân viên thành công!"); fetchEmployees(searchTerm, filters); };
    const handleOpenEditModal = (employee) => { setEmployeeToEdit(employee); setIsEditModalOpen(true); };
    const handleCloseEditModal = () => { setEmployeeToEdit(null); setIsEditModalOpen(false); };
    const handleUpdateSuccess = () => { handleCloseEditModal(); toast.success("Cập nhật thông tin thành công!"); fetchEmployees(searchTerm, filters); };
    const handleDeleteEmployee = async (employeeId, employeeName) => {
        if (window.confirm(`Xóa "${employeeName}" (ID: ${employeeId})? Hành động này cũng xóa tài khoản liên kết (nếu có).`)) {
            const toastId = toast.loading("Đang xóa nhân viên...");
            try {
                await api.delete(`/employees/${employeeId}`);
                toast.update(toastId, { render: "Xóa nhân viên thành công!", type: "success", isLoading: false, autoClose: 2000 });
                fetchEmployees(searchTerm, filters);
            } catch (err) {
                console.error('Failed to delete employee', err);
                const errorMsg = err.response?.data?.detail || `Xóa nhân viên "${employeeName}" thất bại.`;
                toast.update(toastId, { render: errorMsg, type: "error", isLoading: false, autoClose: 3000 });
            }
        }
    };

    // --- Render Logic ---
    return (
        // FIX: Sửa padding từ '0px' thành '20px'
        <div style={{ padding: '20px', color: 'var(--text-color)' }}> 
            <h2 style={{ color: 'var(--text-color)' }}>Quản lý Nhân viên</h2>
            
            <div style={styles.filterForm}>
                 <div style={styles.filterGrid}>
                     <div style={styles.filterItem}>
                         <label style={styles.filterLabel}>Tìm kiếm chung</label>
                         <input type="text" placeholder="ID, tên..." value={searchTerm} onChange={handleSearchChange} style={styles.filterInput} className="filter-input" />
                     </div>
                     <div style={styles.filterItem}>
                         <label style={styles.filterLabel}>Phòng ban</label>
                         <select name="departmentId" value={filters.departmentId} onChange={handleFilterChange} style={styles.filterSelect} className="filter-select">
                             <option value="">Tất cả phòng ban</option>
                             {departments.map(d => <option key={d.DepartmentID} value={d.DepartmentID}>{d.DepartmentName}</option>)}
                         </select>
                     </div>
                     <div style={styles.filterItem}>
                         <label style={styles.filterLabel}>Chức vụ</label>
                         <select name="positionId" value={filters.positionId} onChange={handleFilterChange} style={styles.filterSelect} className="filter-select">
                             <option value="">Tất cả chức vụ</option>
                             {positions.map(p => <option key={p.PositionID} value={p.PositionID}>{p.PositionName}</option>)}
                         </select>
                     </div>
                     <div style={styles.filterItem}>
                         <label style={styles.filterLabel}>Trạng thái</label>
                         <select name="status" value={filters.status} onChange={handleFilterChange} style={styles.filterSelect} className="filter-select">
                             <option value="">Tất cả trạng thái</option>
                             {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                         </select>
                     </div>
                     <div style={{ ...styles.filterItem, alignSelf: 'flex-end' }}>
                         <button type="button" onClick={handleClearFilters} disabled={loading} style={{ ...styles.filterButtonClear }} className="filterButtonClear">
                             Xóa bộ lọc
                         </button>
                     </div>
                 </div>
            </div>

            {(isAdmin || isHrManager) && (
                <button onClick={handleOpenAddModal} style={styles.addButton} disabled={loading}>
                    Thêm Nhân viên mới
                </button>
            )}

            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th>ID (HR)</th>
                            <th>Họ tên</th>
                            <th>Email</th>
                            <th>Phòng ban</th>
                            <th>Chức vụ</th>
                            <th>Trạng thái</th>
                            <th>Vai trò (Auth)</th>
                            <th style={{minWidth: isAdmin ? '160px' : '100px'}}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 8 }).map((_, index) => <SkeletonRow key={index} columns={8} />)
                        ) : employees.length > 0 ? (
                            employees.map(emp => (
                                <tr key={emp.EmployeeID}>
                                    <td style={styles.tableCell}>{emp.EmployeeID}</td>
                                    <td style={styles.tableCell}>{emp.FullName}</td>
                                    <td style={styles.tableCell}>{emp.Email}</td>
                                    <td style={styles.tableCell}>{emp.department?.DepartmentName || 'N/A'}</td>
                                    <td style={styles.tableCell}>{emp.position?.PositionName || 'N/A'}</td>
                                    <td style={styles.tableCell}>{emp.Status}</td>
                                    <td style={styles.tableCell}>{emp.role || '-'}</td>
                                    <td style={styles.tableCellActions}>
                                        <button onClick={() => handleViewDetails(emp.EmployeeID)} className="action-button view-button">Xem</button>
                                        {(isAdmin || isHrManager) && ( <button onClick={() => handleOpenEditModal(emp)} className="action-button edit-button">Sửa</button> )}
                                        {isAdmin && (
                                            <button onClick={() => handleDeleteEmployee(emp.EmployeeID, emp.FullName)} className="action-button delete-button">Xóa</button>
                                        )}
                                        {isAdmin && !emp.auth_user_id && ( <span style={{...styles.annotation, color: 'orange'}}>(Chưa có TK)</span> )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-color-secondary)' }}>Không tìm thấy nhân viên nào.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {isAddModalOpen && <AddEmployeeModal isOpen={isAddModalOpen} onClose={handleCloseAddModal} onSuccess={handleAddSuccess} />}
                {isEditModalOpen && employeeToEdit && <EditEmployeeModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} onSuccess={handleUpdateSuccess} employeeData={employeeToEdit} />}
            </AnimatePresence>
        </div>
    );
}

// --- STYLES ĐÃ CẬP NHẬT ---
const styles = {
    filterForm: { marginBottom: '20px', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '5px', background: 'var(--card-bg)' }, // Dùng var
    filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' },
    filterItem: { display: 'flex', flexDirection: 'column' },
    filterLabel: { marginBottom: '5px', fontSize: '0.85em', fontWeight: 'bold', color: 'var(--text-color-secondary)' }, // Dùng var
    filterInput: { padding: '8px 10px', border: '1px solid var(--input-border-color)', borderRadius: '4px', width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--input-bg)', color: 'var(--text-color)' }, // Dùng var
    filterSelect: { padding: '8px 10px', border: '1px solid var(--input-border-color)', borderRadius: '4px', width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text-color)' }, // Dùng var
    filterButtonClear: {
        padding: '8px 15px', cursor: 'pointer', border: '1px solid var(--border-color)',
        backgroundColor: 'var(--button-bg)', color: 'var(--button-text)', // Dùng var
        borderRadius: '4px', transition: 'background-color 0.2s', whiteSpace: 'nowrap'
    },
    addButton: { marginBottom: '15px', padding: '8px 15px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }, // Giữ màu xanh
    tableContainer: { 
        overflowX: 'auto', marginTop: '15px', 
        backgroundColor: 'var(--card-bg)', // Dùng var
        border: '1px solid var(--table-border-color)', // Dùng var
        borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    table: {
        width: '100%', borderCollapse: 'collapse', fontSize: '0.9em', minWidth: '900px',
        // Bỏ border ở đây, để tableContainer xử lý
    },
    tableCell: { padding: '8px 10px', borderBottom: '1px solid var(--table-row-border-color)', borderRight: '1px solid var(--table-row-border-color)', verticalAlign: 'middle', whiteSpace: 'nowrap', color: 'var(--text-color)'}, // Dùng var
    tableCellActions: { padding: '5px 8px', borderBottom: '1px solid var(--table-row-border-color)', borderRight: '1px solid var(--table-row-border-color)', whiteSpace: 'nowrap', textAlign: 'left', color: 'var(--text-color)' }, // Dùng var
    skeletonCell: { height: '20px', backgroundColor: '#e0e0e0', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' },
    annotation: { fontSize: '0.8em', color: 'var(--text-color-secondary)', marginLeft: '5px', display: 'inline-block' } // Dùng var
};

// --- CSS ĐỘNG ĐÃ CẬP NHẬT ---
const customEmployeeListStyles = `
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
        padding: 3px 6px; margin-right: 4px; margin-bottom: 3px; border-radius: 3px;
        border: 1px solid var(--border-color); background-color: var(--button-bg); color: var(--button-text); /* Dùng var */
        cursor: pointer; font-size: 0.8em; transition: background-color 0.2s, border-color 0.2s; white-space: nowrap;
    }
    .action-button:hover {
        border-color: #aaa;
        background-color: var(--border-color) !important; /* Dùng var */
    }

    /* Giữ màu semantic */
    .view-button:hover { background-color: #e6f7ff !important; border-color: #91d5ff !important; }
    .edit-button:hover { background-color: #fffbe6 !important; border-color: #ffe58f !important; }
    .delete-button { color: #ff4d4f; }
    .delete-button:hover { background-color: #fff1f0 !important; border-color: #ffa39e !important; }

    /* Focus styles */
    .filter-input:focus, .filter-select:focus {
         border-color: var(--primary-color); /* Dùng var */
         box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
         outline: none;
    }
    /* Clear button hover */
    .filterButtonClear:hover {
        background-color: var(--border-color) !important; /* Dùng var */
    }

    /* Table head */
    thead th {
        background-color: var(--table-header-bg); color: var(--text-color); /* Dùng var */
        text-align: left; padding: 10px 12px;
        border-bottom: 2px solid var(--table-border-color); border-right: 1px solid var(--table-border-color); /* Dùng var */
    }
    thead th:last-child, tbody tr td:last-child {
        border-right: none;
    }
`;

(function() {
    const styleId = 'employee-list-styles';
    if (document.getElementById(styleId)) {
        document.getElementById(styleId).remove(); // Xóa style cũ nếu có
    }
    const styleSheet = document.createElement("style");
    styleSheet.id = styleId;
    styleSheet.type = "text/css";
    styleSheet.innerText = customEmployeeListStyles;
    document.head.appendChild(styleSheet);
})();

export default EmployeeList;