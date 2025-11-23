// frontend/src/pages/ShareholderManagement.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
//import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- Helper format tiền tệ ---
const fmt = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

// --- Icon Users (Dùng currentColor để tự đổi màu theo theme) ---
const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
);

// --- Modal Update Shares (Dành cho HR/Admin) ---
const UpdateShareModal = ({ isOpen, onClose, onSuccess }) => {
    const [empId, setEmpId] = useState('');
    const [shares, setShares] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/shareholders/', { 
                EmployeeID: parseInt(empId), 
                Shares: parseInt(shares),
                Status: 'Active' 
            });
            toast.success("Cập nhật cổ phần thành công!");
            onSuccess();
        } catch (error) {
            toast.error("Lỗi: " + (error.response?.data?.detail || "Không thể cập nhật"));
        } finally {
            setLoading(false);
        }
    };

    if(!isOpen) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <h3 style={{marginTop: 0, borderBottom:'1px solid var(--border-color)', paddingBottom:'10px'}}>Cập nhật Cổ phần</h3>
                <form onSubmit={handleSubmit} style={styles.formGrid}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Mã Nhân viên (ID)</label>
                        <input style={styles.input} value={empId} onChange={e=>setEmpId(e.target.value)} required placeholder="VD: 1" type="number"/>
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Số Cổ phần Mới</label>
                        <input style={styles.input} value={shares} onChange={e=>setShares(e.target.value)} required placeholder="VD: 5000" type="number"/>
                    </div>
                    <div style={styles.modalActions}>
                        <button type="button" onClick={onClose} style={styles.btnCancel}>Hủy</button>
                        <button type="submit" style={styles.btnTeal} disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu & Cập nhật'}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function ShareholderManagement() {
    const { user } = useAuth();
    
    // --- PHÂN QUYỀN HIỂN THỊ ---
    const isAdmin = user?.role === 'Admin';
    const showHRSection = isAdmin || user?.role === 'HR Manager';
    const showPayrollSection = isAdmin || user?.role === 'Payroll Manager';

    const [shareholders, setShareholders] = useState([]);
    const [reportData, setReportData] = useState({ 
        total_dividend_amount: 0, 
        employee_shareholders: 0, 
        top_shareholders: [] 
    });

    // --- STATE CHO MODAL CHI TRẢ (Payroll) ---
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [payoutStep, setPayoutStep] = useState(1);
    const [payoutForm, setPayoutForm] = useState({ title: '', date: '', totalProfit: '' });
    const [previewData, setPreviewData] = useState(null);
    const [processing, setProcessing] = useState(false);

    // --- STATE CHO MODAL CẬP NHẬT (HR) ---
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
        fetchReport();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/shareholders/');
            setShareholders(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchReport = async () => {
        try {
            const res = await api.get('/reports/dividend_summary');
            setReportData(res.data);
        } catch (err) { console.error(err); }
    };

    // --- HANDLERS (Payroll) ---
    const handleCalculate = async () => {
        if (!payoutForm.totalProfit || !payoutForm.title || !payoutForm.date) {
            toast.warn("Vui lòng nhập đầy đủ thông tin.");
            return;
        }
        setProcessing(true);
        try {
            const res = await api.post('/shareholders/preview-payout', {
                total_profit: parseFloat(payoutForm.totalProfit)
            });
            setPreviewData(res.data);
            setPayoutStep(2);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Lỗi tính toán.");
        } finally {
            setProcessing(false);
        }
    };

    const handleConfirmPayout = async () => {
        if (!previewData) return;
        setProcessing(true);
        try {
            await api.post('/shareholders/confirm-payout', {
                title: payoutForm.title,
                payment_date: payoutForm.date,
                payout_list: previewData.payout_list
            });
            toast.success("Đã chi trả cổ tức thành công!");
            setIsPayoutModalOpen(false);
            setPayoutStep(1);
            setPayoutForm({ title: '', date: '', totalProfit: '' });
            setPreviewData(null);
            fetchData();
            fetchReport();
        } catch (err) {
            toast.error("Lỗi khi lưu dữ liệu.");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div style={{ padding: '20px', color: 'var(--text-color)' }}>
            {/* TIÊU ĐỀ TRANG */}
            <div style={{marginBottom: '30px'}}>
                <h2 style={{margin:0, color: 'var(--text-color)'}}>Trung tâm Quản lý Cổ đông</h2>
                <p style={{color:'var(--text-color-secondary)', marginTop:'5px'}}>Xin chào, {user?.role}!</p>
            </div>

            {/* ================================================================================== */}
            {/* PHẦN 1: GIAO DIỆN HR (QUẢN LÝ SỞ HỮU) */}
            {/* ================================================================================== */}
            {showHRSection && (
                <div style={{ marginBottom: '40px' }}>
                    <div style={styles.hrCard}>
                        <div style={styles.cardHeader}>
                            <div style={{display:'flex', flexDirection:'column'}}>
                                <h3 style={{ margin: 0, display:'flex', alignItems:'center', gap:'10px' }}>
                                    <UsersIcon />
                                    <span>Danh sách Cổ đông (Nhân viên)</span>
                                </h3>
                                <small style={{color:'var(--text-color-secondary)', marginTop:'5px', marginLeft: '34px'}}>
                                    Quản lý danh sách nhân viên có cổ phần để phục vụ tính cổ tức bên Payroll.
                                </small>
                            </div>
                            
                            <button onClick={() => setIsUpdateModalOpen(true)} style={styles.btnTeal}>
                                + Cập nhật Cổ phần
                            </button>
                        </div>

                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>MÃ CỔ ĐÔNG</th>
                                        <th style={styles.th}>NHÂN VIÊN</th>
                                        <th style={styles.th}>PHÒNG BAN</th>
                                        <th style={styles.th}>SỐ CỔ PHẦN</th>
                                        <th style={styles.th}>TỶ LỆ SỞ HỮU</th>
                                        <th style={styles.th}>TRẠNG THÁI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shareholders.map(sh => (
                                        <tr key={sh.ShareholderID} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={styles.td}>SH{sh.ShareholderID.toString().padStart(3, '0')}</td>
                                            <td style={styles.td}>
                                                <div style={{fontWeight:'bold'}}>{sh.FullName}</div>
                                                <div style={{fontSize:'0.8em', color:'var(--text-color-secondary)'}}>NV{sh.EmployeeID}</div>
                                            </td>
                                            <td style={styles.td}>{sh.DepartmentName}</td>
                                            <td style={{...styles.td, fontWeight:'bold', fontSize:'1em'}}>
                                                {sh.Shares.toLocaleString()}
                                            </td>
                                            <td style={styles.td}>{sh.SharePercentage}%</td>
                                            <td style={styles.td}>
                                                 <span style={sh.Status === 'Active' ? styles.badgeSuccess : styles.badgeWarning}>
                                                    {sh.Status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {shareholders.length === 0 && (
                                        <tr><td colSpan={6} style={{...styles.td, textAlign:'center', padding:'30px'}}>Chưa có dữ liệu.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================================== */}
            {/* PHẦN 2: GIAO DIỆN PAYROLL (CHI TRẢ CỔ TỨC) */}
            {/* ================================================================================== */}
            {showPayrollSection && (
                <div>
                    <h3 style={{marginTop: '40px', marginBottom: '20px', color: 'var(--text-color)'}}>Phân hệ Payroll: Chi trả Cổ tức</h3>
                    <div style={styles.payrollCard}>
                        <div style={styles.cardHeader}>
                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                <span style={{fontSize:'1.5rem'}}>💰</span>
                                <h3 style={{margin:0}}>Quản lý Chi trả Cổ tức 2025</h3>
                            </div>
                            <button onClick={() => setIsPayoutModalOpen(true)} style={styles.btnPurple}>
                                + Tạo đợt chi trả
                            </button>
                        </div>

                        {/* Dashboard Mini cho Payroll */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <div style={styles.profitBox}>
                                <div style={{fontSize:'0.9em', color:'var(--text-color-secondary)', marginBottom:'5px'}}>Tổng lợi nhuận phân phối (Đã chi)</div>
                                <div style={{fontSize:'2rem', fontWeight:'bold', color:'#a78bfa'}}>
                                    {fmt(reportData.total_dividend_amount)}
                                </div>
                            </div>
                            <div style={styles.profitBox}>
                                <div style={{fontSize:'0.9em', color:'var(--text-color-secondary)', marginBottom:'5px'}}>Số lượng Cổ đông</div>
                                <div style={{fontSize:'2rem', fontWeight:'bold', color:'#34d399'}}>
                                    {shareholders.length}
                                </div>
                            </div>
                        </div>

                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>CỔ ĐÔNG</th>
                                        <th style={styles.th}>SỐ CỔ PHẦN</th>
                                        <th style={styles.th}>TỶ LỆ</th>
                                        <th style={styles.th}>TỔNG NHẬN (Lũy kế)</th>
                                        <th style={styles.th}>TRẠNG THÁI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shareholders.map(sh => (
                                        <tr key={sh.ShareholderID} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={styles.td}>
                                                <div style={{fontWeight:'bold'}}>{sh.FullName}</div>
                                                <div style={{fontSize:'0.85em', color:'var(--text-color-secondary)'}}>NV{sh.EmployeeID}</div>
                                            </td>
                                            <td style={styles.td}>{sh.Shares.toLocaleString()}</td>
                                            <td style={styles.td}>{sh.SharePercentage}%</td>
                                            <td style={{...styles.td, fontWeight:'bold', color:'#a78bfa'}}>
                                                {fmt(sh.UnpaidDividend)}
                                            </td>
                                            <td style={styles.td}>
                                                {sh.UnpaidDividend > 0 ? (
                                                    <span style={styles.badgeSuccess}>Đã chuyển</span>
                                                ) : (
                                                    <span style={styles.badgeWarning}>Chờ xử lý</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODALS --- */}
            <UpdateShareModal 
                isOpen={isUpdateModalOpen} 
                onClose={() => setIsUpdateModalOpen(false)} 
                onSuccess={() => { setIsUpdateModalOpen(false); fetchData(); }}
            />

            {isPayoutModalOpen && (
                <div style={styles.overlay}>
                    <div style={{...styles.modal, maxWidth: payoutStep === 2 ? '800px' : '500px'}}>
                        <h2 style={{marginTop:0, borderBottom:'1px solid var(--border-color)', paddingBottom:'15px'}}>
                            {payoutStep === 1 ? 'Thiết lập đợt Chi trả' : 'Xác nhận Chi trả'}
                        </h2>
                            {payoutStep === 1 ? (
                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Tên đợt chi trả</label>
                                    <input type="text" style={styles.input} placeholder="VD: Cổ tức Quý 3/2025" 
                                        value={payoutForm.title} onChange={e=>setPayoutForm({...payoutForm, title: e.target.value})} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Ngày chi trả</label>
                                    <input type="date" style={styles.input} 
                                        value={payoutForm.date} onChange={e=>setPayoutForm({...payoutForm, date: e.target.value})} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Tổng lợi nhuận phân phối (VNĐ)</label>
                                    <input type="number" style={styles.input} placeholder="VD: 1000000000" 
                                        value={payoutForm.totalProfit} onChange={e=>setPayoutForm({...payoutForm, totalProfit: e.target.value})} />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={styles.summaryBox}>
                                    <div><strong>Tổng quỹ:</strong> {fmt(parseFloat(payoutForm.totalProfit))}</div>
                                    <div><strong>Tổng cổ phần:</strong> {previewData?.total_shares.toLocaleString()}</div>
                                    <div><strong>Cổ tức/CP:</strong> {fmt(previewData?.dividend_per_share)}</div>
                                </div>
                                <div style={{maxHeight:'300px', overflowY:'auto', marginTop:'15px', border:'1px solid var(--border-color)'}}>
                                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.9em'}}>
                                        <thead style={{background:'var(--table-header-bg)', position:'sticky', top:0}}>
                                            <tr>
                                                <th style={styles.thSmall}>NV</th>
                                                <th style={styles.thSmall}>CP</th>
                                                <th style={styles.thSmall}>Thực nhận</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData?.payout_list.map(item => (
                                                <tr key={item.employee_id} style={{borderBottom:'1px solid var(--border-color)'}}>
                                                    <td style={styles.tdSmall}>{item.full_name}</td>
                                                    <td style={styles.tdSmall}>{item.shares.toLocaleString()}</td>
                                                    <td style={{...styles.tdSmall, fontWeight:'bold', color:'#198754'}}>{fmt(item.dividend_amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div style={styles.modalActions}>
                            <button onClick={() => {setIsPayoutModalOpen(false); setPayoutStep(1);}} style={styles.btnCancel}>Hủy</button>
                            {payoutStep === 1 ? (
                                <button onClick={handleCalculate} style={styles.btnPrimary}>Tiếp tục</button>
                            ) : (
                                <>
                                    <button onClick={() => setPayoutStep(1)} style={styles.btnOutline}>Quay lại</button>
                                    <button onClick={handleConfirmPayout} style={styles.btnSuccess}>{processing ? 'Đang lưu...' : 'Xác nhận'}</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    // --- Styles dùng biến CSS (Var) để đồng bộ hệ thống ---
    hrCard: {
        backgroundColor: 'var(--card-bg)', 
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-color)'
    },
    payrollCard: {
        backgroundColor: 'var(--card-bg)',
        borderRadius: '16px',
        padding: '30px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-color)'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '25px'
    },
    
    // Buttons
    btnTeal: { padding: '10px 20px', background: '#38b2ac', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
    btnPurple: { padding: '10px 20px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
    btnPrimary: { padding: '10px 20px', background: '#0d6efd', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    btnSuccess: { padding: '10px 20px', background: '#198754', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    btnCancel: { padding: '10px 20px', background: 'var(--button-bg)', color: 'var(--button-text)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', marginRight:'auto' },
    btnOutline: { padding: '10px 20px', background: 'transparent', border: '1px solid var(--text-color-secondary)', color: 'var(--text-color)', borderRadius: '6px', cursor: 'pointer' },

    // Table
    tableContainer: { overflowX: 'auto', borderRadius: '8px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' },
    th: { padding: '15px 10px', textAlign: 'left', color: 'var(--text-color-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', borderBottom: '2px solid var(--border-color)' },
    td: { padding: '15px 10px', color: 'var(--text-color)', verticalAlign: 'middle' },

    // Boxes
    profitBox: {
        background: 'var(--bg-color)', // Dùng màu nền chung
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '30px',
        width: 'fit-content',
        minWidth: '250px'
    },
    summaryBox: { background: 'var(--bg-color)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-color)' },
    
    // Small Table inside Modal
    thSmall: { padding:'10px', textAlign:'left', background:'var(--table-header-bg)', color:'var(--text-color)' },
    tdSmall: { padding:'10px', borderBottom:'1px solid var(--border-color)', color:'var(--text-color)' },

    // Badges
    badgeSuccess: { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' },
    badgeWarning: { background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' },

    // Modal
    overlay: { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 },
    modal: { background:'var(--card-bg)', padding:'30px', borderRadius:'12px', width:'90%', color:'var(--text-color)', border: '1px solid var(--border-color)' },
    formGrid: { display:'flex', flexDirection:'column', gap:'20px' },
    formGroup: { display:'flex', flexDirection:'column' },
    label: { marginBottom:'8px', fontWeight:'bold', fontSize:'0.9em', color:'var(--text-color)' },
    input: { padding:'12px', border:'1px solid var(--input-border-color)', borderRadius:'6px', fontSize:'1rem', background:'var(--input-bg)', color:'var(--text-color)' },
    modalActions: { display:'flex', justifyContent:'flex-end', marginTop:'30px', gap:'10px' },
};

export default ShareholderManagement;