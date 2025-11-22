// frontend/src/pages/AdminManagement.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

import DepartmentModal from '../components/DepartmentModal';
import PositionModal from '../components/PositionModal';

// --- Skeleton Row ---
const SkeletonRow = ({ columns }) => (
    <tr>
        {Array.from({ length: columns }).map((_, index) => (
            <td key={index} style={styles.tableCell}>
                <div style={styles.skeletonCell}></div>
            </td>
        ))}
    </tr>
);

function AdminManagement() {
    // State cho Phòng ban
    const [departments, setDepartments] = useState([]);
    const [loadingDepts, setLoadingDepts] = useState(true);
    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
    const [currentDept, setCurrentDept] = useState(null);
    const [deptSearch, setDeptSearch] = useState('');

    // State cho Chức vụ
    const [positions, setPositions] = useState([]);
    const [loadingPos, setLoadingPos] = useState(true);
    const [isPosModalOpen, setIsPosModalOpen] = useState(false);
    const [currentPos, setCurrentPos] = useState(null);
    const [posSearch, setPosSearch] = useState('');

    const { user } = useAuth();
    // Chỉ Admin và HR Manager được quyền sửa đổi
    const canEdit = user?.role === 'Admin' || user?.role === 'HR Manager';
    
    // --- FETCH DATA ---
    const fetchDepartments = async () => {
        setLoadingDepts(true);
        try {
            const response = await api.get('/departments/');
            setDepartments(response.data);
        } catch (error) {
            toast.error('Không thể tải danh sách phòng ban.');
        }
        setLoadingDepts(false);
    };

    const fetchPositions = async () => {
        setLoadingPos(true);
        try {
            const response = await api.get('/positions/');
            setPositions(response.data);
        } catch (error) {
            toast.error('Không thể tải danh sách chức vụ.');
        }
        setLoadingPos(false);
    };

    useEffect(() => {
        fetchDepartments();
        fetchPositions();
    }, []);

    // --- HANDLERS: DEPARTMENT ---
    const handleOpenDeptModal = (dept = null) => { setCurrentDept(dept); setIsDeptModalOpen(true); };
    const handleCloseDeptModal = () => { setIsDeptModalOpen(false); setCurrentDept(null); };
    
    const handleDeptSuccess = () => {
        handleCloseDeptModal();
        toast.success(currentDept ? "Cập nhật phòng ban thành công!" : "Thêm phòng ban mới thành công!");
        fetchDepartments();
    };

    const handleDeleteDept = async (deptId, deptName) => {
        if (window.confirm(`[CẢNH BÁO] Bạn có chắc muốn xóa phòng ban "${deptName}"?\nHệ thống sẽ kiểm tra xem còn nhân viên nào thuộc phòng này không.`)) {
            try {
                await api.delete(`/departments/${deptId}`);
                toast.success("Đã xóa phòng ban và ghi nhật ký hệ thống.");
                fetchDepartments();
            } catch (err) {
                // Hiển thị lỗi ràng buộc dữ liệu từ Backend trả về
                const errorMsg = err.response?.data?.detail || 'Không thể xóa phòng ban này.';
                toast.error(`Lỗi: ${errorMsg}`);
            }
        }
    };

    // --- HANDLERS: POSITION ---
    const handleOpenPosModal = (pos = null) => { setCurrentPos(pos); setIsPosModalOpen(true); };
    const handleClosePosModal = () => { setIsPosModalOpen(false); setCurrentPos(null); };
    
    const handlePosSuccess = () => {
        handleClosePosModal();
        toast.success(currentPos ? "Cập nhật chức vụ thành công!" : "Thêm chức vụ mới thành công!");
        fetchPositions();
    };

    const handleDeletePos = async (posId, posName) => {
        if (window.confirm(`[CẢNH BÁO] Bạn có chắc muốn xóa chức vụ "${posName}"?\nHệ thống sẽ kiểm tra xem còn nhân viên nào giữ chức vụ này không.`)) {
            try {
                await api.delete(`/positions/${posId}`);
                toast.success("Đã xóa chức vụ và ghi nhật ký hệ thống.");
                fetchPositions();
            } catch (err) {
                const errorMsg = err.response?.data?.detail || 'Không thể xóa chức vụ này.';
                toast.error(`Lỗi: ${errorMsg}`);
            }
        }
    };

    // Filtering
    const filteredDepartments = departments.filter(dept =>
        dept.DepartmentName.toLowerCase().includes(deptSearch.toLowerCase())
    );
    const filteredPositions = positions.filter(pos =>
        pos.PositionName.toLowerCase().includes(posSearch.toLowerCase())
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ padding: '20px', color: 'var(--text-color)' }}
        >
            <h2 style={{ color: 'var(--text-color)', marginBottom: '20px' }}>Quản lý Cơ cấu Tổ chức</h2>
            
            <div style={styles.container}>
                
                {/* === KHỐI 1: QUẢN LÝ PHÒNG BAN === */}
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <h3 style={{ margin: 0, display:'flex', alignItems:'center', gap:'10px' }}>
                            🏢 Phòng ban
                        </h3>
                        {canEdit && (
                            <button onClick={() => handleOpenDeptModal(null)} style={styles.addButton}>
                                + Thêm mới
                            </button>
                        )}
                    </div>

                    <input
                        type="text"
                        placeholder="🔍 Tìm phòng ban..."
                        value={deptSearch}
                        onChange={(e) => setDeptSearch(e.target.value)}
                        style={styles.searchBox}
                    />
                    
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>ID</th>
                                    <th style={styles.th}>Tên Phòng ban</th>
                                    {canEdit && <th style={{width: '120px', ...styles.th}}>Hành động</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loadingDepts ? (
                                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={canEdit ? 3 : 2} />)
                                ) : filteredDepartments.length > 0 ? (
                                    filteredDepartments.map(dept => (
                                        <tr key={dept.DepartmentID}>
                                            <td style={styles.tableCell}><strong>{dept.DepartmentID}</strong></td>
                                            <td style={styles.tableCell}>{dept.DepartmentName}</td>
                                            {canEdit && (
                                                <td style={styles.tableCell}>
                                                    <button onClick={() => handleOpenDeptModal(dept)} className="action-button edit-button" title="Sửa">✏️</button>
                                                    <button onClick={() => handleDeleteDept(dept.DepartmentID, dept.DepartmentName)} className="action-button delete-button" title="Xóa">🗑️</button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={canEdit ? 3 : 2} style={styles.emptyCell}>Không tìm thấy dữ liệu.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* === KHỐI 2: QUẢN LÝ CHỨC VỤ === */}
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <h3 style={{ margin: 0, display:'flex', alignItems:'center', gap:'10px' }}>
                            💼 Chức vụ
                        </h3>
                        {canEdit && (
                            <button onClick={() => handleOpenPosModal(null)} style={styles.addButton}>
                                + Thêm mới
                            </button>
                        )}
                    </div>

                    <input
                        type="text"
                        placeholder="🔍 Tìm chức vụ..."
                        value={posSearch}
                        onChange={(e) => setPosSearch(e.target.value)}
                        style={styles.searchBox}
                    />

                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>ID</th>
                                    <th style={styles.th}>Tên Chức vụ</th>
                                    {canEdit && <th style={{width: '120px', ...styles.th}}>Hành động</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loadingPos ? (
                                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={canEdit ? 3 : 2} />)
                                ) : filteredPositions.length > 0 ? (
                                    filteredPositions.map(pos => (
                                        <tr key={pos.PositionID}>
                                            <td style={styles.tableCell}><strong>{pos.PositionID}</strong></td>
                                            <td style={styles.tableCell}>{pos.PositionName}</td>
                                            {canEdit && (
                                                <td style={styles.tableCell}>
                                                    <button onClick={() => handleOpenPosModal(pos)} className="action-button edit-button" title="Sửa">✏️</button>
                                                    <button onClick={() => handleDeletePos(pos.PositionID, pos.PositionName)} className="action-button delete-button" title="Xóa">🗑️</button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={canEdit ? 3 : 2} style={styles.emptyCell}>Không tìm thấy dữ liệu.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* === MODALS === */}
                <AnimatePresence>
                    {isDeptModalOpen && (
                        <DepartmentModal
                            isOpen={isDeptModalOpen}
                            onClose={handleCloseDeptModal}
                            onSuccess={handleDeptSuccess}
                            departmentData={currentDept}
                        />
                    )}
                    {isPosModalOpen && (
                        <PositionModal
                            isOpen={isPosModalOpen}
                            onClose={handleClosePosModal}
                            onSuccess={handlePosSuccess}
                            positionData={currentPos}
                        />
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

// --- STYLES ---
const styles = {
    container: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '25px', // Tăng khoảng cách giữa 2 cột
    },
    section: {
        flex: 1,
        minWidth: '450px', // Đảm bảo không bị quá nhỏ trên màn hình bé
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        padding: '20px',
        borderRadius: '10px', // Bo góc mềm mại hơn
        boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '15px',
        marginBottom: '20px',
    },
    addButton: {
        padding: '8px 15px',
        cursor: 'pointer',
        backgroundColor: '#0d6efd', // Màu xanh chuẩn bootstrap
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '0.9em',
        fontWeight: '600',
        transition: 'background 0.2s',
        boxShadow: '0 2px 4px rgba(13, 110, 253, 0.2)'
    },
    searchBox: {
        marginBottom: '15px',
        padding: '10px 12px',
        width: '100%',
        border: '1px solid var(--input-border-color)',
        backgroundColor: 'var(--input-bg)',
        color: 'var(--text-color)',
        borderRadius: '6px',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s',
    },
    tableContainer: {
        overflowX: 'auto',
        borderRadius: '6px',
        border: '1px solid var(--border-color)', // Viền bao quanh bảng
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.95em',
    },
    th: {
        padding: '12px 15px',
        borderBottom: '2px solid var(--border-color)',
        backgroundColor: 'var(--table-header-bg)',
        color: 'var(--text-color)',
        textAlign: 'left',
        fontWeight: '600',
        whiteSpace: 'nowrap',
    },
    tableCell: {
        padding: '12px 15px',
        borderBottom: '1px solid var(--table-row-border-color)',
        verticalAlign: 'middle',
        color: 'var(--text-color)',
    },
    emptyCell: {
        textAlign: 'center',
        padding: '30px',
        color: 'var(--text-color-secondary)',
        fontStyle: 'italic',
    },
    skeletonCell: {
        height: '20px',
        backgroundColor: '#e0e0e0',
        borderRadius: '4px',
        animation: 'pulse 1.5s infinite ease-in-out',
    }
};

export default AdminManagement;