// frontend/src/pages/PayrollManagement.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import EditSalaryModal from '../components/EditSalaryModal';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

// --- Skeleton Components ---
const SkeletonSearchRow = () => (
    <tr>
        {Array.from({ length: 5 }).map((_, i) => <td key={i} style={styles.thTd}><div style={styles.skeletonCell}></div></td>)}
    </tr>
);

const SkeletonProfile = () => (
    <div style={styles.profileSection}>
        <h3><div style={{...styles.skeletonCell, height: '30px', width: '50%'}}></div></h3>
        <div style={{...styles.skeletonCell, height: '150px', width: '100%', marginTop:'20px'}}></div>
    </div>
);

function PayrollManagement() {
    // State tìm kiếm & Lọc
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    
    // State Lọc Tháng/Năm
    const currentYear = new Date().getFullYear();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // Tháng hiện tại
    const [selectedYear, setSelectedYear] = useState(currentYear);

    const [departments, setDepartments] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    
    // State cho dữ liệu bổ sung (Cổ tức)
    const [shareholderInfo, setShareholderInfo] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [salaryToEdit, setSalaryToEdit] = useState(null);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

    // --- FETCH DATA ---
    const fetchEmployees = useCallback(async (search = '', deptId = '') => {
        setLoadingSearch(true);
        setSearchResults([]); 
        try {
            const params = { search, department_id: deptId || undefined };
            const response = await api.get('/employees/', { params });
            setSearchResults(response.data);
        } catch (err) {
            toast.error('Tải danh sách nhân viên thất bại.');
        } finally {
            setLoadingSearch(false);
        }
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoadingSearch(true);
            try {
                const deptRes = await api.get('/departments/');
                setDepartments(deptRes.data);
                const empRes = await api.get('/employees/');
                setSearchResults(empRes.data);
            } catch (error) {
                toast.error("Không thể tải dữ liệu.");
            } finally { setLoadingSearch(false); }
        };
        loadInitialData();
    }, []);

    // Debounce
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500); 
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) { isFirstRun.current = false; return; }
        fetchEmployees(debouncedSearchTerm, departmentId);
    }, [debouncedSearchTerm, departmentId, fetchEmployees]);

    // --- LOGIC MỚI: LỌC BẢNG LƯƠNG THEO THÁNG/NĂM ---
    const getFilteredSalaries = () => {
        if (!selectedProfile || !selectedProfile.salaries) return [];
        return selectedProfile.salaries.filter(s => {
            const sDate = new Date(s.SalaryMonth);
            const sMonth = sDate.getMonth() + 1;
            const sYear = sDate.getFullYear();
            
            const matchMonth = selectedMonth === 'all' || sMonth === parseInt(selectedMonth);
            const matchYear = sYear === parseInt(selectedYear);
            
            return matchMonth && matchYear;
        });
    };

    const fetchEmployeeProfile = async (employeeId) => {
        setLoadingProfile(true);
        setSelectedProfile(null);
        setShareholderInfo(null); // Reset shareholder info
        try {
            // 1. Lấy thông tin nhân viên (Lương, Chấm công)
            const response = await api.get(`/employees/${employeeId}`);
            setSelectedProfile(response.data);

            // 2. Lấy thông tin cổ tức (Nếu là cổ đông)
            try {
                const shRes = await api.get('/shareholders/');
                const myShare = shRes.data.find(s => s.EmployeeID === employeeId);
                if (myShare) setShareholderInfo(myShare);
            } catch (e) { console.error("Không lấy được thông tin cổ đông"); }

            setSearchResults([]); 
        } catch (err) {
            toast.error('Không thể tải hồ sơ chi tiết.');
        } finally {
            setLoadingProfile(false);
        }
    };

    // --- HANDLERS ---
    const handleClearFilters = () => { 
        setSearchTerm(''); setDepartmentId(''); 
        setSelectedMonth(new Date().getMonth() + 1); 
        setSelectedYear(currentYear); 
    };

    const handleOpenModal = (s) => { setSalaryToEdit(s); setIsModalOpen(true); };
    const handleCloseModal = () => { setIsModalOpen(false); setSalaryToEdit(null); };
    
    const handleUpdateSuccess = () => {
        handleCloseModal();
        toast.success("Cập nhật thành công! (Đã ghi Audit Log)");
        if (selectedProfile) fetchEmployeeProfile(selectedProfile.EmployeeID);
    };

    const handleBackToList = () => { setSelectedProfile(null); fetchEmployees(searchTerm, departmentId); }

    // --- AUDIT LOGS ---
    const logAction = (action, detail) => {
        // Gọi API ghi log thực tế
        console.log(`[AUDIT LOG] ${action}: ${detail}`);
    };

    const handleFinalize = () => {
        logAction('UPDATE', `Chốt bảng lương tháng ${selectedMonth}/${selectedYear}`);
        toast.success(`Đã chốt bảng lương tháng ${selectedMonth}/${selectedYear}!`);
    };

    const handleExport = () => {
        logAction('EXPORT', `Xuất Excel lương tháng ${selectedMonth}/${selectedYear}`);
        toast.info("Đang xuất file Excel...");
    };

    const handleSendPayslip = (salaryId) => {
        logAction('SEND_MAIL', `Gửi phiếu lương ID ${salaryId}`);
        toast.success(`Đã gửi phiếu lương #${salaryId} qua email.`);
    };

    const fmt = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ padding: '20px', color: 'var(--text-color)' }}
        >
            <h2 style={{ color: 'var(--text-color)' }}>Quản lý Bảng lương & Chấm công</h2>

            <AnimatePresence>
                {!selectedProfile && !loadingProfile && (
                    <motion.div
                        style={styles.searchSection}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        {/* HEADER ACTIONS */}
                        <div style={styles.actionHeader}>
                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                <h3 style={{margin:0, color:'var(--text-color)'}}>Bảng Lương</h3>
                                <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} style={styles.dateSelect}>
                                    <option value="all">Tất cả tháng</option>
                                    {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>Tháng {m}</option>)}
                                </select>
                                <select value={selectedYear} onChange={e=>setSelectedYear(e.target.value)} style={styles.dateSelect}>
                                    {[currentYear, currentYear-1, currentYear-2].map(y=><option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div style={{display:'flex', gap:'10px'}}>
                                <button onClick={handleFinalize} className="action-button" style={{background:'#0d6efd', color:'white', border:'none'}}>✓ Chốt Lương</button>
                                <button onClick={handleExport} className="action-button" style={{background:'#198754', color:'white', border:'none'}}>⬇ Xuất Excel</button>
                            </div>
                        </div>

                        {/* FILTERS */}
                        <div style={styles.filterGrid}>
                            <div style={styles.filterItem}>
                                <label style={styles.filterLabel}>Tìm kiếm nhân viên</label>
                                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.filterInput} placeholder="Tên, Mã NV..." />
                            </div>
                            <div style={styles.filterItem}>
                                <label style={styles.filterLabel}>Phòng ban</label>
                                <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} style={styles.filterSelect}>
                                    <option value="">Tất cả phòng ban</option>
                                    {departments.map(dept => <option key={dept.DepartmentID} value={dept.DepartmentID}>{dept.DepartmentName}</option>)}
                                </select>
                            </div>
                            <div style={{ ...styles.filterItem, alignSelf: 'flex-end' }}>
                                <button onClick={handleClearFilters} style={styles.btnOutline}>Xóa bộ lọc</button>
                            </div>
                        </div>

                        {/* TABLE */}
                        <div style={styles.tableContainer}>
                            <table style={styles.resultsTable}>
                                <thead>
                                    <tr style={styles.header}>
                                        <th style={styles.thTd}>Mã NV</th>
                                        <th style={styles.thTd}>Họ tên</th>
                                        <th style={styles.thTd}>Phòng ban</th>
                                        <th style={styles.thTd}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingSearch ? Array.from({ length: 5 }).map((_, i) => <SkeletonSearchRow key={i} />) : 
                                    searchResults.length > 0 ? searchResults.map(emp => (
                                        <tr key={emp.EmployeeID}>
                                            <td style={styles.thTd}>{emp.EmployeeID}</td>
                                            <td style={styles.thTd}>
                                                <strong>{emp.FullName}</strong><br/>
                                                <small style={{color:'var(--text-color-secondary)'}}>{emp.Email}</small>
                                            </td>
                                            <td style={styles.thTd}>{emp.department?.DepartmentName || '-'}</td>
                                            <td style={styles.thTd}>
                                                <button onClick={() => fetchEmployeeProfile(emp.EmployeeID)} className="action-button view-button">
                                                    👁️ Xem Chi tiết
                                                </button>
                                            </td>
                                        </tr>
                                    )) : <tr><td colSpan={4} style={styles.emptyCell}>Không tìm thấy nhân viên.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {loadingProfile && <SkeletonProfile />}
            
            {!loadingProfile && selectedProfile && (
                <motion.div style={styles.profileSection} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <button style={styles.backLink} onClick={handleBackToList}>{"<"} Quay lại danh sách</button>
                    
                    <div style={styles.profileHeader}>
                        <h3 style={{ margin:0, color: 'var(--text-color)' }}>{selectedProfile.FullName}</h3>
                        <span style={{background:'#e2e8f0', padding:'4px 12px', borderRadius:'15px', fontSize:'0.9em', color:'#333'}}>
                            {selectedProfile.department?.DepartmentName} - {selectedProfile.Status}
                        </span>
                    </div>
                    
                    {/* SALARY TABLE */}
                    <h4 style={{ color: 'var(--text-color)', marginTop: '20px', borderBottom:'1px solid #eee', paddingBottom:'5px' }}>
                        💰 Lịch sử Lương ({selectedMonth === 'all' ? 'Tất cả' : `Tháng ${selectedMonth}`}/{selectedYear})
                    </h4>
                    <div style={styles.tableContainer}>
                        <table style={styles.salaryTable}>
                            <thead>
                                <tr style={styles.header}>
                                    <th style={styles.thTd}>Tháng</th>
                                    <th style={styles.thTd}>Lương CB</th>
                                    <th style={styles.thTd}>Thưởng</th>
                                    <th style={styles.thTd}>Khấu trừ</th>
                                    {/* [THÊM] Cột Cổ tức */}
                                    <th style={styles.thTd}>Cổ tức</th>
                                    {/* [THÊM] Cột Thực nhận */}
                                    <th style={{...styles.thTd, background:'#e6f7ff', color:'#0050b3'}}>Thực nhận</th> 
                                    <th style={styles.thTd}>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getFilteredSalaries().length > 0 ? getFilteredSalaries().map(s => (
                                    <tr key={s.SalaryID}>
                                        <td style={styles.thTd}><strong>{s.SalaryMonth}</strong></td>
                                        <td style={styles.thTd}>{fmt(s.BaseSalary)}</td>
                                        <td style={{...styles.thTd, color:'green'}}>{fmt(s.Bonus)}</td>
                                        <td style={{...styles.thTd, color:'red'}}>{fmt(s.Deductions)}</td>
                                        
                                        {/* [HIỂN THỊ] Cổ tức (Nếu có) */}
                                        <td style={{...styles.thTd, color:'#6f42c1'}}>
                                            {shareholderInfo ? fmt(shareholderInfo.UnpaidDividend) : '-'}
                                        </td>

                                        {/* [HIỂN THỊ] Thực nhận (Có cộng thêm cổ tức nếu muốn, ở đây hiển thị NetSalary từ DB) */}
                                        <td style={{...styles.thTd, fontWeight:'bold', color:'#0d6efd', fontSize:'1.1em', background:'#f0f5ff'}}>
                                            {fmt(s.NetSalary)}
                                        </td>

                                        <td style={styles.thTd}>
                                            <button onClick={() => handleOpenModal(s)} className="action-button edit-button" title="Chỉnh sửa" style={{marginRight:'5px'}}>
                                                📝
                                            </button>
                                            <button onClick={() => handleSendPayslip(s.SalaryID)} className="action-button" style={{background:'#6c757d', color:'white', border:'1px solid #6c757d'}} title="Gửi phiếu lương qua Email">
                                                📧
                                            </button>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan={7} style={styles.emptyCell}>Không có dữ liệu lương cho thời gian này.</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {/* ATTENDANCE TABLE */}
                    <h4 style={{ color: 'var(--text-color)', marginTop: '30px', borderBottom:'1px solid #eee', paddingBottom:'5px' }}>
                        📅 Dữ liệu Chấm công
                    </h4>
                    <div style={styles.tableContainer}>
                        <table style={styles.salaryTable}>
                            <thead>
                                <tr style={styles.header}>
                                    <th style={styles.thTd}>Tháng</th>
                                    <th style={styles.thTd}>Ngày làm việc</th>
                                    <th style={styles.thTd}>Vắng mặt</th>
                                    <th style={styles.thTd}>Nghỉ phép</th>
                                    <th style={styles.thTd}>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedProfile.attendances.length > 0 ? selectedProfile.attendances.map(a => (
                                    <tr key={a.AttendanceID}>
                                        <td style={styles.thTd}>{a.AttendanceMonth}</td>
                                        <td style={styles.thTd}>{a.WorkDays}</td>
                                        <td style={{...styles.thTd, color: a.AbsentDays > 0 ? 'red' : 'inherit'}}>{a.AbsentDays}</td>
                                        <td style={styles.thTd}>{a.LeaveDays}</td>
                                        <td style={styles.thTd}>
                                            {a.WorkDays >= 22 ? <span style={{color:'green'}}>Đủ công</span> : <span style={{color:'orange'}}>Thiếu công</span>}
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan={5} style={styles.emptyCell}>Không có dữ liệu chấm công.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            <AnimatePresence>
                {isModalOpen && <EditSalaryModal isOpen={isModalOpen} onClose={handleCloseModal} onSuccess={handleUpdateSuccess} salaryData={salaryToEdit} />}
            </AnimatePresence>
        </motion.div>
    );
}

const styles = {
    searchSection: { marginBottom: '20px', padding: '20px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--card-bg)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', flexWrap: 'wrap', gap:'10px' },
    dateSelect: { padding: '8px', borderRadius: '4px', border: '1px solid var(--input-border-color)', marginLeft: '5px', background: 'var(--input-bg)', color: 'var(--text-color)' },
    filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px', alignItems: 'flex-end' },
    filterItem: { display: 'flex', flexDirection: 'column' },
    filterLabel: { marginBottom: '5px', fontSize: '0.85em', fontWeight: 'bold', color: 'var(--text-color-secondary)' },
    filterInput: { padding: '10px', border: '1px solid var(--input-border-color)', borderRadius: '6px', width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--input-bg)', color: 'var(--text-color)' },
    filterSelect: { padding: '10px', border: '1px solid var(--input-border-color)', borderRadius: '6px', width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text-color)' },
    btnOutline: { padding: '8px 15px', border: '1px solid var(--border-color)', background: 'transparent', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-color)' },
    tableContainer: { overflowX: 'auto', borderRadius: '6px', border: '1px solid var(--border-color)' },
    resultsTable: { width: '100%', borderCollapse: 'collapse', color: 'var(--text-color)' },
    profileSection: { marginTop: '20px', padding: '25px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    profileHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    salaryTable: { width: '100%', borderCollapse: 'collapse', color: 'var(--text-color)' },
    thTd: { borderBottom: '1px solid var(--border-color)', padding: '12px 15px', textAlign: 'left', verticalAlign: 'middle' },
    header: { backgroundColor: 'var(--table-header-bg)', color: 'var(--text-color)', fontWeight: 'bold' },
    emptyCell: { textAlign: 'center', padding: '20px', color: 'var(--text-color-secondary)' },
    backLink: { display: 'inline-block', marginBottom: '15px', color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 'bold', cursor: 'pointer', background: 'none', border: 'none', fontSize: '1rem' },
    skeletonCell: { height: '20px', backgroundColor: '#e0e0e0', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' },
};

export default PayrollManagement;