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
                <div style={styles.skeletonCell} className="skeletonCell"></div>
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
    const isAdmin = user?.role === 'Admin';
    
    // --- Các hàm FETCH ---
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

    // --- Handlers cho Department Modal ---
    const handleOpenDeptModal = (dept = null) => { setCurrentDept(dept); setIsDeptModalOpen(true); };
    const handleCloseDeptModal = () => { setIsDeptModalOpen(false); setCurrentDept(null); };
    const handleDeptSuccess = () => {
        handleCloseDeptModal();
        toast.success("Lưu phòng ban thành công!");
        fetchDepartments();
    };
    const handleDeleteDept = async (deptId, deptName) => {
        if (window.confirm(`Bạn có chắc muốn xóa phòng ban "${deptName}"?\nLưu ý: Không thể xóa nếu có nhân viên thuộc phòng ban này.`)) {
            const toastId = toast.loading("Đang xóa...");
            try {
                await api.delete(`/departments/${deptId}`);
                toast.update(toastId, { render: "Xóa thành công!", type: "success", isLoading: false, autoClose: 2000 });
                fetchDepartments();
            } catch (err) {
                const errorMsg = err.response?.data?.detail || 'Xóa thất bại. Phòng ban có thể đang được gán cho nhân viên.';
                toast.update(toastId, { render: errorMsg, type: "error", isLoading: false, autoClose: 3000 });
            }
        }
    };

    // --- Handlers cho Position Modal ---
    const handleOpenPosModal = (pos = null) => { setCurrentPos(pos); setIsPosModalOpen(true); };
    const handleClosePosModal = () => { setIsPosModalOpen(false); setCurrentPos(null); };
    const handlePosSuccess = () => {
        handleClosePosModal();
        toast.success("Lưu chức vụ thành công!");
        fetchPositions();
    };
    const handleDeletePos = async (posId, posName) => {
        if (window.confirm(`Bạn có chắc muốn xóa chức vụ "${posName}"?\nLưu ý: Không thể xóa nếu có nhân viên giữ chức vụ này.`)) {
            const toastId = toast.loading("Đang xóa...");
            try {
                await api.delete(`/positions/${posId}`);
                toast.update(toastId, { render: "Xóa thành công!", type: "success", isLoading: false, autoClose: 2000 });
                fetchPositions();
            } catch (err) {
                const errorMsg = err.response?.data?.detail || 'Xóa thất bại. Chức vụ có thể đang được gán cho nhân viên.';
                toast.update(toastId, { render: errorMsg, type: "error", isLoading: false, autoClose: 3000 });
            }
        }
    };

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
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ padding: '20px', color: 'var(--text-color)' }} // XÓA PADDING, THÊM VAR
        >
            <h1 style={{ color: 'var(--text-color)' }}>Quản lý Tổ chức</h1>
            <div style={styles.container}>
                
                {/* === PHẦN PHÒNG BAN === */}
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <h2 style={{ color: 'var(--text-color)' }}>Quản lý Phòng ban</h2>
                        {isAdmin && (
                            <button onClick={() => handleOpenDeptModal(null)} style={styles.addButton}>
                                Thêm Phòng ban
                            </button>
                        )}
                    </div>

                    <input
                        type="text"
                        placeholder="Tìm phòng ban..."
                        value={deptSearch}
                        onChange={(e) => setDeptSearch(e.target.value)}
                        style={styles.searchBox}
                        className="search-box-input"
                    />
                    
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>ID</th>
                                    <th style={styles.th}>Tên Phòng ban</th>
                                    {isAdmin && <th style={{width: '100px', ...styles.th}}>Hành động</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loadingDepts ? (
                                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={isAdmin ? 3 : 2} />)
                                ) : (
                                    filteredDepartments.map(dept => (
                                        <tr key={dept.DepartmentID}>
                                            <td style={styles.tableCell}>{dept.DepartmentID}</td>
                                            <td style={styles.tableCell}>{dept.DepartmentName}</td>
                                            {isAdmin && (
                                                <td style={styles.tableCell}>
                                                    <button onClick={() => handleOpenDeptModal(dept)} className="action-button edit-button">Sửa</button>
                                                    <button onClick={() => handleDeleteDept(dept.DepartmentID, dept.DepartmentName)} className="action-button delete-button">Xóa</button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                                {!loadingDepts && filteredDepartments.length === 0 && (
                                    <tr><td colSpan={isAdmin ? 3 : 2} style={styles.emptyCell}>Không tìm thấy phòng ban nào.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* === PHẦN CHỨC VỤ === */}
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <h2 style={{ color: 'var(--text-color)' }}>Quản lý Chức vụ</h2>
                        {isAdmin && (
                            <button onClick={() => handleOpenPosModal(null)} style={styles.addButton}>
                                Thêm Chức vụ
                            </button>
                        )}
                    </div>

                    <input
                        type="text"
                        placeholder="Tìm chức vụ..."
                        value={posSearch}
                        onChange={(e) => setPosSearch(e.target.value)}
                        style={styles.searchBox}
                        className="search-box-input"
                    />

                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>ID</th>
                                    <th style={styles.th}>Tên Chức vụ</th>
                                    {isAdmin && <th style={{width: '100px', ...styles.th}}>Hành động</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loadingPos ? (
                                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={isAdmin ? 3 : 2} />)
                                ) : (
                                    filteredPositions.map(pos => (
                                        <tr key={pos.PositionID}>
                                            <td style={styles.tableCell}>{pos.PositionID}</td>
                                            <td style={styles.tableCell}>{pos.PositionName}</td>
                                            {isAdmin && (
                                                <td style={styles.tableCell}>
                                                    <button onClick={() => handleOpenPosModal(pos)} className="action-button edit-button">Sửa</button>
                                                    <button onClick={() => handleDeletePos(pos.PositionID, pos.PositionName)} className="action-button delete-button">Xóa</button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                                {!loadingPos && filteredPositions.length === 0 && (
                                    <tr><td colSpan={isAdmin ? 3 : 2} style={styles.emptyCell}>Không tìm thấy chức vụ nào.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* === CÁC MODAL (Dùng AnimatePresence) === */}
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

// --- STYLES ĐÃ CẬP NHẬT ---
const styles = {
    container: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
    },
    section: {
        flex: 1,
        minWidth: '400px',
        backgroundColor: 'var(--card-bg)', // Dùng var
        border: '1px solid var(--border-color)', // Dùng var
        padding: '15px 20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)', // Dùng var
        paddingBottom: '10px',
        marginBottom: '15px',
    },
    addButton: { // Giữ màu semantic
        padding: '5px 10px',
        cursor: 'pointer',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '0.9em',
    },
    searchBox: {
        marginBottom: '15px',
        padding: '8px 10px',
        width: 'calc(100% - 22px)',
        border: '1px solid var(--input-border-color)', // Dùng var
        backgroundColor: 'var(--input-bg)', // Dùng var
        color: 'var(--text-color)', // Dùng var
        borderRadius: '4px',
    },
    tableContainer: {
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.9em',
    },
    th: { // Thêm style cho TH
        padding: '8px 10px',
        borderBottom: '2px solid var(--table-border-color)', // Dùng var
        backgroundColor: 'var(--table-header-bg)', // Dùng var
        color: 'var(--text-color)', // Dùng var
        textAlign: 'left'
    },
    tableCell: {
        padding: '8px 10px',
        borderBottom: '1px solid var(--table-row-border-color)', // Dùng var
        verticalAlign: 'middle',
        color: 'var(--text-color)', // Dùng var
    },
    emptyCell: {
        textAlign: 'center',
        padding: '20px',
        color: 'var(--text-color-secondary)', // Dùng var
    },
    skeletonCell: {
        height: '20px',
        backgroundColor: '#e0e0e0', // Màu cơ bản
        borderRadius: '4px',
        animation: 'pulse 1.5s infinite ease-in-out',
    }
};

// --- CSS ĐỘNG ĐÃ CẬP NHẬT ---
(function() {
    const styleId = 'admin-management-styles';
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

        .action-button {
            padding: 3px 6px; margin-right: 4px; border-radius: 3px;
            border: 1px solid var(--border-color); /* Dùng var */
            background-color: var(--button-bg); /* Dùng var */
            color: var(--button-text); /* Dùng var */
            cursor: pointer; font-size: 0.9em;
            transition: background-color 0.2s, border-color 0.2s;
        }
        .action-button:hover {
            border-color: #aaa;
            background-color: var(--border-color) !important; /* Dùng var */
        }
        /* Giữ màu semantic */
        .edit-button:hover { background-color: #fffbe6 !important; border-color: #ffe58f !important; }
        .delete-button { color: #ff4d4f; }
        .delete-button:hover { background-color: #fff1f0 !important; border-color: #ffa39e !important; }

        /* Thêm focus cho searchbox */
        .search-box-input:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
            outline: none;
        }
    `;
    document.head.appendChild(styleSheet);
})();

export default AdminManagement;