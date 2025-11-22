// frontend/src/pages/EmployeeList.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import AddEmployeeModal from '../components/AddEmployeeModal';
import EditEmployeeModal from '../components/EditEmployeeModal';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { AnimatePresence, motion } from 'framer-motion';

const STATUS_OPTIONS = ["Đang làm việc", "Nghỉ phép", "Thử việc", "Thực tập", "Đã nghỉ việc"];

// --- Skeleton Row Component ---
const SkeletonRow = ({ columns }) => (
    <tr>
        {Array.from({ length: columns }).map((_, index) => (
            <td key={index} style={styles.tableCell}>
                <div style={styles.skeletonCell}></div>
            </td>
        ))}
    </tr>
);

function EmployeeList() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    
    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ departmentId: '', positionId: '', status: '' });
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    
    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [employeeToEdit, setEmployeeToEdit] = useState(null);

    const isAdmin = currentUser?.role === 'Admin';
    const isHrManager = currentUser?.role === 'HR Manager';

    // --- FETCH DATA ---
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
    }, []);

    // Load Initial Filter Data (Dept/Pos)
    useEffect(() => {
        const fetchFilterData = async () => {
             setLoading(true);
            try {
                const [deptRes, posRes] = await Promise.all([
                    api.get('/departments/'),
                    api.get('/positions/')
                ]);
                setDepartments(deptRes.data);
                setPositions(posRes.data);
                await fetchEmployees('', { departmentId: '', positionId: '', status: '' });
            } catch (err) {
                toast.error("Không thể tải dữ liệu bộ lọc.");
                setLoading(false);
            }
        };
        fetchFilterData();
    }, []);

    // Debounce Search
    const debounceTimeout = useRef(null);
    useEffect(() => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
            fetchEmployees(searchTerm, filters);
        }, 500);
        return () => clearTimeout(debounceTimeout.current);
    }, [searchTerm, filters, fetchEmployees]);

    // --- HANDLERS ---
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setFilters({ departmentId: '', positionId: '', status: '' });
    };

    const handleViewDetails = (id) => navigate(`/employees/${id}`);

    // --- ADD EMPLOYEE ---
    const handleAddSuccess = () => { 
        setIsAddModalOpen(false);
        toast.success("Thêm nhân viên thành công! (Đã ghi Nhật ký hoạt động)"); 
        fetchEmployees(searchTerm, filters); 
    };

    // --- EDIT EMPLOYEE ---
    const handleEditSuccess = () => { 
        setIsEditModalOpen(false); setEmployeeToEdit(null);
        toast.success("Cập nhật hồ sơ thành công! (Đã ghi Nhật ký hoạt động)"); 
        fetchEmployees(searchTerm, filters); 
    };

    // --- DELETE EMPLOYEE (Với ràng buộc dữ liệu) ---
    const handleDeleteEmployee = async (employeeId, employeeName) => {
        if (window.confirm(`Xác nhận xóa nhân viên "${employeeName}" (ID: ${employeeId})?\n\nHệ thống sẽ kiểm tra ràng buộc dữ liệu (Lương, Cổ tức) trước khi xóa.`)) {
            const toastId = toast.loading("Đang kiểm tra ràng buộc và xóa...");
            try {
                await api.delete(`/employees/${employeeId}`);
                toast.update(toastId, { render: "Đã xóa và ghi log thành công!", type: "success", isLoading: false, autoClose: 2000 });
                fetchEmployees(searchTerm, filters);
            } catch (err) {
                console.error('Delete failed', err);
                // Hiển thị lỗi chi tiết từ Backend (VD: Không thể xóa vì có cổ tức)
                const errorMsg = err.response?.data?.detail || "Xóa thất bại.";
                toast.update(toastId, { render: `LỖI: ${errorMsg}`, type: "error", isLoading: false, autoClose: 5000 });
            }
        }
    };

    // Helper để tô màu badge
    const getRoleBadgeStyle = (role) => {
        if (role === 'Admin') return { background: '#e6f4ff', color: '#0958d9', border: '1px solid #91caff' };
        if (role === 'HR Manager') return { background: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f' };
        if (role === 'Payroll Manager') return { background: '#fff0f6', color: '#c41d7f', border: '1px solid #ffadd2' };
        return { background: '#f5f5f5', color: '#595959', border: '1px solid #d9d9d9' };
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            style={{ padding: '20px', color: 'var(--text-color)' }}
        >
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                <h2 style={{ margin: 0 }}>Quản lý Hồ sơ Nhân viên</h2>
                {(isAdmin || isHrManager) && (
                    <button onClick={() => setIsAddModalOpen(true)} style={styles.addButton} disabled={loading}>
                        + Thêm Nhân viên
                    </button>
                )}
            </div>
            
            {/* --- FILTER SECTION --- */}
            <div style={styles.filterForm}>
                 <div style={styles.filterGrid}>
                     <div style={styles.filterItem}>
                         <label style={styles.filterLabel}>Tìm kiếm (ID, Tên)</label>
                         <input type="text" placeholder="Nhập từ khóa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.filterInput} />
                     </div>
                     <div style={styles.filterItem}>
                         <label style={styles.filterLabel}>Phòng ban</label>
                         <select name="departmentId" value={filters.departmentId} onChange={handleFilterChange} style={styles.filterSelect}>
                             <option value="">Tất cả</option>
                             {departments.map(d => <option key={d.DepartmentID} value={d.DepartmentID}>{d.DepartmentName}</option>)}
                         </select>
                     </div>
                     <div style={styles.filterItem}>
                         <label style={styles.filterLabel}>Chức vụ</label>
                         <select name="positionId" value={filters.positionId} onChange={handleFilterChange} style={styles.filterSelect}>
                             <option value="">Tất cả</option>
                             {positions.map(p => <option key={p.PositionID} value={p.PositionID}>{p.PositionName}</option>)}
                         </select>
                     </div>
                     <div style={styles.filterItem}>
                         <label style={styles.filterLabel}>Trạng thái</label>
                         <select name="status" value={filters.status} onChange={handleFilterChange} style={styles.filterSelect}>
                             <option value="">Tất cả</option>
                             {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                         </select>
                     </div>
                     <div style={{ ...styles.filterItem, alignSelf: 'flex-end' }}>
                         <button type="button" onClick={handleClearFilters} style={styles.filterButtonClear}>Xóa bộ lọc</button>
                     </div>
                 </div>
            </div>

            {/* --- TABLE SECTION --- */}
            <div style={styles.tableContainer}>
                 <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Mã NV</th>
                            <th style={styles.th}>Họ và Tên</th>
                            <th style={styles.th}>Phòng ban / Chức vụ</th>
                            <th style={styles.th}>Vai trò (Auth)</th>
                            <th style={styles.th}>Trạng thái</th>
                            <th style={{...styles.th, textAlign:'center'}}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 8 }).map((_, index) => <SkeletonRow key={index} columns={6} />)
                        ) : employees.length > 0 ? (
                            employees.map(emp => (
                                <tr key={emp.EmployeeID} style={styles.tr}>
                                    <td style={styles.tableCell}><strong>{emp.EmployeeID}</strong></td>
                                    <td style={styles.tableCell}>
                                        <div>{emp.FullName}</div>
                                        <div style={{fontSize:'0.85em', color:'var(--text-color-secondary)'}}>{emp.Email}</div>
                                    </td>
                                    <td style={styles.tableCell}>
                                        <div style={{fontWeight:'500'}}>{emp.department?.DepartmentName || '-'}</div>
                                        <div style={{fontSize:'0.85em', color:'var(--text-color-secondary)'}}>{emp.position?.PositionName || '-'}</div>
                                    </td>
                                    <td style={styles.tableCell}>
                                        <span style={{...styles.roleBadge, ...getRoleBadgeStyle(emp.role)}}>{emp.role || 'User'}</span>
                                    </td>
                                    <td style={styles.tableCell}>
                                        <span style={emp.Status === 'Đang làm việc' ? styles.statusActive : styles.statusInactive}>
                                            {emp.Status}
                                        </span>
                                    </td>
                                    <td style={styles.tableCellActions}>
                                         <button onClick={() => handleViewDetails(emp.EmployeeID)} className="action-button view-button">Chi tiết</button>
                                        {(isAdmin || isHrManager) && ( 
                                            <button onClick={() => { setEmployeeToEdit(emp); setIsEditModalOpen(true); }} className="action-button edit-button">Sửa</button> 
                                        )}
                                        {isAdmin && (
                                            <button onClick={() => handleDeleteEmployee(emp.EmployeeID, emp.FullName)} className="action-button delete-button">Xóa</button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-color-secondary)' }}>Không tìm thấy nhân viên nào.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {isAddModalOpen && <AddEmployeeModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={handleAddSuccess} />}
                {isEditModalOpen && employeeToEdit && <EditEmployeeModal isOpen={isEditModalOpen} onClose={() => {setIsEditModalOpen(false); setEmployeeToEdit(null)}} onSuccess={handleEditSuccess} employeeData={employeeToEdit} />}
            </AnimatePresence>
        </motion.div>
    );
}

// --- STYLES ---
const styles = {
    filterForm: { marginBottom: '20px', padding: '20px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--card-bg)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' },
    filterItem: { display: 'flex', flexDirection: 'column' },
    filterLabel: { marginBottom: '8px', fontSize: '0.85em', fontWeight: '600', color: 'var(--text-color-secondary)' },
    filterInput: { padding: '10px', border: '1px solid var(--input-border-color)', borderRadius: '6px', width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--input-bg)', color: 'var(--text-color)' },
    filterSelect: { padding: '10px', border: '1px solid var(--input-border-color)', borderRadius: '6px', width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text-color)' },
    filterButtonClear: { padding: '10px 15px', cursor: 'pointer', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-color)', borderRadius: '6px', transition: '0.2s', fontWeight: '500' },
    addButton: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', boxShadow: '0 2px 4px rgba(13, 110, 253, 0.3)' },
    
    tableContainer: { overflowX: 'auto', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.95em' },
    th: { padding: '15px', background: 'var(--table-header-bg)', color: 'var(--text-color)', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid var(--border-color)' },
    tr: { borderBottom: '1px solid var(--border-color)' },
    tableCell: { padding: '15px', verticalAlign: 'middle', color: 'var(--text-color)' },
    tableCellActions: { padding: '15px', textAlign: 'center', display:'flex', justifyContent:'center', gap:'8px' },
    
    roleBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '0.85em', fontWeight: '600', display: 'inline-block' },
    statusActive: { color: '#13c2c2', background: '#e6fffb', padding: '4px 8px', borderRadius: '4px', border: '1px solid #87e8de', fontSize: '0.85em' },
    statusInactive: { color: '#faad14', background: '#fffbe6', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ffe58f', fontSize: '0.85em' },
    
    skeletonCell: { height: '20px', backgroundColor: '#e0e0e0', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' },
};

// Add Pulse Animation
if (!document.getElementById('pulse-style')) {
    const style = document.createElement('style');
    style.id = 'pulse-style';
    style.innerHTML = `@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`;
    document.head.appendChild(style);
}

export default EmployeeList;