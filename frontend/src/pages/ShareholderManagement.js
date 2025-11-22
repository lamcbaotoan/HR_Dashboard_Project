// frontend/src/pages/ShareholderManagement.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
// [FIX] Đảm bảo các component này được sử dụng trong giao diện Admin/HR bên dưới
import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- Helper format tiền tệ ---
const fmt = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

function ShareholderManagement() {
    const { user } = useAuth();
    const isPayroll = user?.role === 'Payroll Manager';
    
    const [shareholders, setShareholders] = useState([]);
    const [reportData, setReportData] = useState({ 
        total_dividend_amount: 0, 
        employee_shareholders: 0, // Dùng key này từ API fix
        top_shareholders: [] 
    });

    // --- STATE CHO MODAL CHI TRẢ (Payroll) ---
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [payoutStep, setPayoutStep] = useState(1);
    const [payoutForm, setPayoutForm] = useState({ title: '', date: '', totalProfit: '' });
    const [previewData, setPreviewData] = useState(null);
    const [processing, setProcessing] = useState(false);

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

    // --- HANDLERS ---
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

    // --- GIAO DIỆN RIÊNG CHO PAYROLL MANAGER (Theme tối/tím) ---
    if (isPayroll) {
        return (
            <div style={{ padding: '20px', color: 'var(--text-color)' }}>
                <div style={{marginBottom: '30px'}}>
                    <h2 style={{margin:0, fontSize:'1.8rem'}}>Quản lý Cổ tức</h2>
                    <p style={{color:'var(--text-color-secondary)', marginTop:'5px'}}>Xin chào, Payroll Manager!</p>
                </div>

                <div style={styles.payrollCard}>
                    <div style={styles.cardHeader}>
                        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                            <span style={{fontSize:'1.5rem'}}>💰</span>
                            <h3 style={{margin:0, color:'var(--text-color)'}}>Quản lý Chi trả Cổ tức 2025</h3>
                        </div>
                        <button onClick={() => setIsPayoutModalOpen(true)} style={styles.btnPurple}>
                            + Tạo đợt chi trả
                        </button>
                    </div>

                    <div style={styles.profitBox}>
                        <div style={{fontSize:'0.9em', color:'#a0aec0', marginBottom:'5px'}}>Tổng lợi nhuận phân phối (Đã chi)</div>
                        <div style={{fontSize:'2rem', fontWeight:'bold', color:'#a78bfa'}}>
                            {fmt(reportData.total_dividend_amount)}
                        </div>
                    </div>

                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={{borderBottom:'1px solid var(--border-color)'}}>
                                    <th style={styles.th}>CỔ ĐÔNG</th>
                                    <th style={styles.th}>SỐ CỔ PHẦN</th>
                                    <th style={styles.th}>TỶ LỆ</th>
                                    <th style={styles.th}>TỔNG NHẬN</th>
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

                {/* Modal Chi trả (Payroll) */}
                {isPayoutModalOpen && (
                    <div style={styles.overlay}>
                        <div style={{...styles.modal, maxWidth: payoutStep === 2 ? '800px' : '500px'}}>
                            <h2 style={{marginTop:0, borderBottom:'1px solid #eee', paddingBottom:'15px', color:'#333'}}>
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
                                    <div style={{maxHeight:'300px', overflowY:'auto', marginTop:'15px', border:'1px solid #eee'}}>
                                        <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.9em'}}>
                                            <thead style={{background:'#f8f9fa', position:'sticky', top:0}}>
                                                <tr>
                                                    <th style={styles.thSmall}>NV</th>
                                                    <th style={styles.thSmall}>CP</th>
                                                    <th style={styles.thSmall}>Thực nhận</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData?.payout_list.map(item => (
                                                    <tr key={item.employee_id} style={{borderBottom:'1px solid #eee'}}>
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

    // --- GIAO DIỆN CHO ADMIN / HR (View chuẩn) ---
    return (
        <div style={{ padding: '20px', color: 'var(--text-color)' }}>
            <h2 style={{marginBottom:'20px'}}>Quản lý Cổ đông & Cổ tức</h2>
            
            <div style={styles.reportGrid}>
                <div style={styles.card}>
                    <h4 style={{margin:'0 0 10px 0', color:'var(--text-color-secondary)'}}>Tổng Cổ tức đã chi</h4>
                    <div style={{fontSize:'1.8rem', fontWeight:'bold', color:'#0d6efd'}}>{fmt(reportData.total_dividend_amount)}</div>
                    <small style={{color:'#888'}}>Dữ liệu tổng hợp từ HUMAN_2025</small>
                </div>
                <div style={styles.card}>
                    <h4 style={{margin:'0 0 10px 0', color:'var(--text-color-secondary)'}}>Nhân viên là Cổ đông</h4>
                    <div style={{fontSize:'1.8rem', fontWeight:'bold', color:'#198754'}}>
                        {reportData.employee_shareholders} <span style={{fontSize:'1rem', fontWeight:'normal'}}>nhân viên</span>
                    </div>
                    <small style={{color:'#888'}}>Đang sở hữu cổ phần công ty</small>
                </div>
                
                {/* [FIX: SỬ DỤNG BIỂU ĐỒ ĐỂ KHÔNG BỊ LỖI UNUSED VARS] */}
                <div style={styles.card}>
                    <h4 style={{margin:'0 0 10px 0', color:'var(--text-color-secondary)'}}>
                        {reportData.total_dividend_amount > 0 ? "Top nhận Cổ tức" : "Top sở hữu Cổ phần"}
                    </h4>
                    <div style={{height: '100px'}}>
                        {reportData.top_shareholders && reportData.top_shareholders.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={reportData.top_shareholders}>
                                    <Tooltip 
                                        contentStyle={{backgroundColor:'var(--card-bg)', borderColor:'var(--border-color)', color:'var(--text-color)'}}
                                        formatter={(value) => reportData.total_dividend_amount > 0 ? fmt(value) : value.toLocaleString()}
                                    />
                                    <Bar dataKey="total" fill="#8884d8">
                                        {reportData.top_shareholders.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#8884d8' : '#82ca9d'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#888', fontStyle:'italic'}}>
                                Chưa có dữ liệu
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={styles.tableContainer}>
                <div style={{padding:'15px', borderBottom:'1px solid var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                     <h3 style={{margin:0}}>Danh sách Chi tiết</h3>
                     <span style={{fontSize:'0.9em', color:'#666'}}>Tổng: {shareholders.length} bản ghi</span>
                </div>
                <table style={styles.table}>
                    <thead>
                        <tr style={{ background: 'var(--table-header-bg)', textAlign: 'left' }}>
                            <th style={styles.th}>Mã NV</th>
                            <th style={styles.th}>Nhân viên</th>
                            <th style={styles.th}>Phòng ban</th>
                            <th style={styles.th}>Số cổ phần</th>
                            <th style={styles.th}>Tổng đã nhận</th>
                            <th style={styles.th}>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shareholders.length > 0 ? shareholders.map(sh => (
                            <tr key={sh.ShareholderID} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={styles.td}>{sh.EmployeeID}</td>
                                <td style={styles.td}><strong>{sh.FullName}</strong></td>
                                <td style={styles.td}>{sh.DepartmentName}</td>
                                <td style={styles.td}>{sh.Shares.toLocaleString()}</td>
                                <td style={{...styles.td, color:'#0d6efd', fontWeight:'bold'}}>
                                    {fmt(sh.UnpaidDividend)}
                                </td>
                                <td style={styles.td}>
                                    <span style={sh.Status === 'Active' || sh.Status === 'Đang làm việc' ? styles.badgeSuccess : styles.badgeWarning}>
                                        {sh.Status}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={6} style={{padding:'30px', textAlign:'center', color:'#888'}}>Chưa có dữ liệu cổ đông.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const styles = {
    // Styles Payroll
    payrollCard: { backgroundColor: 'var(--card-bg)', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: '1px solid var(--border-color)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
    btnPurple: { padding: '10px 20px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 4px 10px rgba(139, 92, 246, 0.3)' },
    profitBox: { background: 'linear-gradient(145deg, #2d2b42, #1f1d2b)', border: '1px solid #4c4b5e', borderRadius: '12px', padding: '20px', marginBottom: '30px', width: 'fit-content', minWidth: '300px' },
    
    // Styles Common
    tableContainer: { overflowX: 'auto', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' },
    th: { padding: '15px 10px', textAlign: 'left', color: 'var(--text-color-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold' },
    td: { padding: '15px 10px', color: 'var(--text-color)', verticalAlign: 'middle' },
    badgeSuccess: { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' },
    badgeWarning: { background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' },

    // Report Grid
    reportGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' },
    card: { background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },

    // Modal
    overlay: { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 },
    modal: { background:'white', padding:'30px', borderRadius:'12px', width:'90%', color:'#333' },
    formGrid: { display:'flex', flexDirection:'column', gap:'20px' },
    formGroup: { display:'flex', flexDirection:'column' },
    label: { marginBottom:'8px', fontWeight:'bold', fontSize:'0.9em' },
    input: { padding:'12px', border:'1px solid #ccc', borderRadius:'6px', fontSize:'1rem' },
    modalActions: { display:'flex', justifyContent:'flex-end', marginTop:'30px', gap:'10px' },
    btnPrimary: { padding:'10px 20px', background:'#0d6efd', color:'white', border:'none', borderRadius:'6px', cursor:'pointer' },
    btnSuccess: { padding:'10px 20px', background:'#198754', color:'white', border:'none', borderRadius:'6px', cursor:'pointer' },
    btnCancel: { padding:'10px 20px', background:'#6c757d', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', marginRight:'auto' },
    btnOutline: { padding:'10px 20px', background:'transparent', border:'1px solid #6c757d', color:'#6c757d', borderRadius:'6px', cursor:'pointer' },
    summaryBox: { background:'#f8f9fa', padding:'15px', borderRadius:'8px', border:'1px solid #eee' },
    thSmall: { padding:'10px', textAlign:'left', background:'#f1f1f1' },
    tdSmall: { padding:'10px', borderBottom:'1px solid #eee' }
};

export default ShareholderManagement;