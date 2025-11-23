// frontend/src/pages/MyPayslips.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

// --- Helper format tiền tệ ---
const fmt = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

// --- Modal Chi tiết Phiếu lương (Payslip Detail) ---
const PayslipModal = ({ isOpen, onClose, data, employeeName }) => {
    if (!isOpen || !data) return null;
    return (
        <div style={styles.overlay}>
            <motion.div 
                style={styles.modal}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            >
                <div style={styles.modalHeader}>
                    <h3 style={{margin:0, color:'#1a202c'}}>PHIẾU LƯƠNG THÁNG {new Date(data.SalaryMonth).getMonth() + 1}/{new Date(data.SalaryMonth).getFullYear()}</h3>
                    <button onClick={onClose} style={styles.btnClose}>✕</button>
                </div>
                <div style={styles.modalBody}>
                    <div style={styles.row}><span style={styles.label}>Nhân viên:</span> <strong>{employeeName}</strong></div>
                    <div style={styles.row}><span style={styles.label}>Mã phiếu:</span> <span>#{data.SalaryID}</span></div>
                    <hr style={styles.divider}/>
                    
                    {/* [Yêu cầu 1] Hiển thị chi tiết thành phần thu nhập */}
                    <div style={styles.row}>
                        <span style={styles.label}>Lương cơ bản (Basic):</span> 
                        <span>{fmt(data.BaseSalary)}</span>
                    </div>
                    <div style={styles.row}>
                        <span style={styles.label}>Thưởng (Bonus):</span> 
                        <span style={{color:'#38a169'}}>+ {fmt(data.Bonus)}</span>
                    </div>
                    <div style={styles.row}>
                        <span style={styles.label}>Khấu trừ (Deductions):</span> 
                        <span style={{color:'#e53e3e'}}>- {fmt(data.Deductions)}</span>
                    </div>
                    <hr style={styles.divider}/>
                    <div style={{...styles.row, fontSize:'1.2em', color:'#2b6cb0'}}>
                        <span style={styles.label}>THỰC NHẬN (NET):</span> 
                        <strong>{fmt(data.NetSalary)}</strong>
                    </div>
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={() => toast.info("Đang tải xuống PDF...")} style={styles.btnDownload}>⬇ Tải PDF</button>
                </div>
            </motion.div>
        </div>
    );
};

function MyPayslips() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPayslip, setSelectedPayslip] = useState(null);

    useEffect(() => {
        if (user?.emp_id) fetchData(user.emp_id);
    }, [user]);

    const fetchData = async (id) => {
        setLoading(true);
        try {
            // API này trả về EmployeeFullProfile bao gồm salaries
            const empRes = await api.get(`/employees/${id}`);
            setProfile(empRes.data);
        } catch (err) {
            toast.error("Không tải được dữ liệu lương.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{padding:'20px'}}>Đang tải dữ liệu...</div>;
    if (!profile) return <div style={{padding:'20px'}}>Không tìm thấy thông tin.</div>;

    return (
        <div style={{ padding: '20px', color: 'var(--text-color)' }}>
            <h2 style={{marginBottom: '20px'}}>Lịch sử Lương & Thu nhập</h2>
            
            <div style={styles.card}>
                <div style={styles.headerInfo}>
                    <div style={styles.avatar}>{profile.FullName.charAt(0)}</div>
                    <div>
                        <h3 style={{margin:0}}>{profile.FullName}</h3>
                        <div style={{color:'#718096', fontSize:'0.9em'}}>
                            {profile.position?.PositionName} - {profile.department?.DepartmentName}
                        </div>
                    </div>
                </div>

                {/* [Yêu cầu 2] Xem lịch sử lương */}
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={{borderBottom:'2px solid #e2e8f0'}}>
                                <th style={styles.th}>Tháng</th>
                                <th style={styles.th}>Lương Cơ bản</th>
                                <th style={styles.th}>Thưởng</th>
                                <th style={styles.th}>Khấu trừ</th>
                                <th style={styles.th}>Thực nhận</th>
                                <th style={styles.th}>Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody>
                            {profile.salaries.length > 0 ? profile.salaries.map(s => (
                                <tr key={s.SalaryID} style={{borderBottom:'1px solid #edf2f7'}}>
                                    <td style={styles.td}><strong>{s.SalaryMonth}</strong></td>
                                    <td style={styles.td}>{fmt(s.BaseSalary)}</td>
                                    <td style={{...styles.td, color:'#38a169'}}>{fmt(s.Bonus)}</td>
                                    <td style={{...styles.td, color:'#e53e3e'}}>{fmt(s.Deductions)}</td>
                                    <td style={{...styles.td, fontWeight:'bold', color:'#2b6cb0'}}>{fmt(s.NetSalary)}</td>
                                    <td style={styles.td}>
                                        <button onClick={() => setSelectedPayslip(s)} style={styles.btnView}>Xem</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} style={{padding:'20px', textAlign:'center'}}>Chưa có dữ liệu lương.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {selectedPayslip && (
                    <PayslipModal 
                        isOpen={!!selectedPayslip} 
                        onClose={() => setSelectedPayslip(null)} 
                        data={selectedPayslip}
                        employeeName={profile.FullName}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

const styles = {
    card: { background: 'var(--card-bg)', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' },
    headerInfo: { display:'flex', alignItems:'center', gap:'15px', marginBottom:'25px' },
    avatar: { width:'50px', height:'50px', background:'#3182ce', color:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'1.2rem' },
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' },
    th: { padding: '12px', textAlign: 'left', color: 'var(--text-color-secondary)', fontWeight:'600' },
    td: { padding: '12px', color: 'var(--text-color)' },
    btnView: { padding:'5px 12px', background:'#ebf8ff', color:'#3182ce', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' },
    
    // Modal Styles
    overlay: { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 },
    modal: { background:'white', width:'400px', borderRadius:'12px', padding:'20px', boxShadow:'0 10px 25px rgba(0,0,0,0.2)' },
    modalHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' },
    btnClose: { background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer' },
    modalBody: { display:'flex', flexDirection:'column', gap:'10px', color: '#2d3748' },
    row: { display:'flex', justifyContent:'space-between' },
    label: { color:'#718096' },
    divider: { border:'none', borderTop:'1px dashed #cbd5e0', margin:'10px 0' },
    modalFooter: { marginTop:'20px', textAlign:'right' },
    btnDownload: { background:'#3182ce', color:'white', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer' }
};

export default MyPayslips;