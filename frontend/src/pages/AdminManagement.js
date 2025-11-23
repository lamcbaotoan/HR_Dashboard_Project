// frontend/src/pages/AdminManagement.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import DepartmentModal from '../components/DepartmentModal';
import PositionModal from '../components/PositionModal';

function AdminManagement() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('departments'); 

    // Data States
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
    const [currentDept, setCurrentDept] = useState(null);
    const [isPosModalOpen, setIsPosModalOpen] = useState(false);
    const [currentPos, setCurrentPos] = useState(null);

    // Permission Check
    const canEdit = user?.role === 'Admin' || user?.role === 'HR Manager';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [deptRes, posRes] = await Promise.all([
                api.get('/departments/'),
                api.get('/positions/')
            ]);
            setDepartments(deptRes.data);
            setPositions(posRes.data);
        } catch (error) {
            toast.error('Không thể tải dữ liệu tổ chức.');
        } finally {
            setLoading(false);
        }
    };

    // --- DEPARTMENT HANDLERS ---
    const handleOpenDeptModal = (dept = null) => { setCurrentDept(dept); setIsDeptModalOpen(true); };
    const handleCloseDeptModal = () => { setIsDeptModalOpen(false); setCurrentDept(null); };
    const handleDeptSuccess = () => { handleCloseDeptModal(); toast.success("Thao tác thành công!"); fetchData(); };
    
    const handleDeleteDept = async (deptId, deptName) => {
        if (window.confirm(`Bạn có chắc muốn xóa phòng ban "${deptName}"?`)) {
            try {
                await api.delete(`/departments/${deptId}`);
                toast.success("Đã xóa phòng ban thành công.");
                fetchData();
            } catch (err) {
                toast.error(err.response?.data?.detail || 'Không thể xóa phòng ban này.');
            }
        }
    };

    // --- POSITION HANDLERS ---
    const handleOpenPosModal = (pos = null) => { setCurrentPos(pos); setIsPosModalOpen(true); };
    const handleClosePosModal = () => { setIsPosModalOpen(false); setCurrentPos(null); };
    const handlePosSuccess = () => { handleClosePosModal(); toast.success("Thao tác thành công!"); fetchData(); };

    const handleDeletePos = async (posId, posName) => {
        if (window.confirm(`Bạn có chắc muốn xóa chức vụ "${posName}"?`)) {
            try {
                await api.delete(`/positions/${posId}`);
                toast.success("Đã xóa chức vụ thành công.");
                fetchData();
            } catch (err) {
                toast.error(err.response?.data?.detail || 'Không thể xóa chức vụ này.');
            }
        }
    };

    return (
        <div style={{ padding: '20px', color: 'var(--text-color)' }}>
            {/* HEADER */}
            <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, color: 'var(--text-color)' }}>Cơ cấu Tổ chức</h2>
                    <p style={{ color: 'var(--text-color-secondary)', marginTop: '5px' }}>Xin chào, {user?.role}!</p>
                </div>
            </div>

            {/* TABS NAVIGATION */}
            <div style={styles.tabsContainer}>
                <button 
                    style={activeTab === 'departments' ? styles.tabActive : styles.tabInactive}
                    onClick={() => setActiveTab('departments')}
                >
                    Phòng ban
                </button>
                <button 
                    style={activeTab === 'positions' ? styles.tabActive : styles.tabInactive}
                    onClick={() => setActiveTab('positions')}
                >
                    Chức vụ
                </button>
            </div>

            {/* MAIN CARD */}
            <div style={styles.card}>
                {/* Header of Card */}
                <div style={styles.cardHeader}>
                    <h3 style={{margin:0, color: 'var(--text-color)'}}>
                        {activeTab === 'departments' ? 'Danh sách Phòng ban' : 'Danh sách Chức vụ'}
                    </h3>
                    {canEdit && (
                        <button 
                            onClick={() => activeTab === 'departments' ? handleOpenDeptModal() : handleOpenPosModal()}
                            style={styles.btnAdd}
                        >
                            + Thêm {activeTab === 'departments' ? 'Phòng ban' : 'Chức vụ'}
                        </button>
                    )}
                </div>

                {/* CONTENT TABLE */}
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={{borderBottom: '1px solid var(--border-color)'}}>
                                <th style={styles.th}>ID</th>
                                <th style={styles.th}>{activeTab === 'departments' ? 'Tên Phòng ban' : 'Tên Chức vụ'}</th>
                                <th style={styles.th}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={3} style={{padding:'20px', textAlign:'center', color:'var(--text-color)'}}>Đang tải...</td></tr>
                            ) : (
                                activeTab === 'departments' ? (
                                    departments.map(dept => (
                                        <tr key={dept.DepartmentID} style={{borderBottom: '1px solid var(--border-color)'}}>
                                            <td style={styles.td}>{dept.DepartmentID}</td>
                                            <td style={styles.td}><strong>{dept.DepartmentName}</strong></td>
                                            <td style={styles.td}>
                                                {canEdit && (
                                                    <>
                                                        <button onClick={() => handleOpenDeptModal(dept)} style={styles.btnIcon} title="Sửa">✏️</button>
                                                        <button onClick={() => handleDeleteDept(dept.DepartmentID, dept.DepartmentName)} style={{...styles.btnIcon, color:'#fc8181'}} title="Xóa">🗑️</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    positions.map(pos => (
                                        <tr key={pos.PositionID} style={{borderBottom: '1px solid var(--border-color)'}}>
                                            <td style={styles.td}>{pos.PositionID}</td>
                                            <td style={styles.td}><strong>{pos.PositionName}</strong></td>
                                            <td style={styles.td}>
                                                {canEdit && (
                                                    <>
                                                        <button onClick={() => handleOpenPosModal(pos)} style={styles.btnIcon} title="Sửa">✏️</button>
                                                        <button onClick={() => handleDeletePos(pos.PositionID, pos.PositionName)} style={{...styles.btnIcon, color:'#fc8181'}} title="Xóa">🗑️</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {isDeptModalOpen && <DepartmentModal isOpen={isDeptModalOpen} onClose={handleCloseDeptModal} onSuccess={handleDeptSuccess} departmentData={currentDept} />}
                {isPosModalOpen && <PositionModal isOpen={isPosModalOpen} onClose={handleClosePosModal} onSuccess={handlePosSuccess} positionData={currentPos} />}
            </AnimatePresence>
        </div>
    );
}

const styles = {
    // Styles đồng bộ với Theme
    tabsContainer: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px'
    },
    tabActive: {
        padding: '10px 20px',
        background: 'var(--card-bg)', // Nền card
        color: 'var(--primary-color)',
        border: '1px solid var(--border-color)',
        borderBottom: '3px solid var(--primary-color)',
        borderRadius: '6px 6px 0 0',
        cursor: 'pointer',
        fontWeight: 'bold'
    },
    tabInactive: {
        padding: '10px 20px',
        background: 'transparent',
        color: 'var(--text-color-secondary)',
        border: 'none',
        cursor: 'pointer',
        fontWeight: '500'
    },
    card: {
        backgroundColor: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '25px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        border: '1px solid var(--border-color)'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '25px'
    },
    btnAdd: {
        padding: '8px 20px',
        background: '#38b2ac', // Teal
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: '600',
    },
    tableContainer: {
        overflowX: 'auto'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.95rem'
    },
    th: {
        padding: '15px 10px',
        textAlign: 'left',
        color: 'var(--text-color-secondary)',
        textTransform: 'uppercase',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        letterSpacing: '0.05em'
    },
    td: {
        padding: '15px 10px',
        color: 'var(--text-color)',
        verticalAlign: 'middle'
    },
    btnIcon: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1.1rem',
        marginRight: '10px',
        color: 'var(--text-color-secondary)',
        transition: 'color 0.2s'
    }
};

export default AdminManagement;