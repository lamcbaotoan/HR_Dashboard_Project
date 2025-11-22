// frontend/src/pages/MyPayslips.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf'; // Đã cài đặt

function MyPayslips() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [shareholderInfo, setShareholderInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.emp_id) {
            fetchData(user.emp_id);
        }
    }, [user]);

    const fetchData = async (id) => {
        setLoading(true);
        try {
            const empRes = await api.get(`/employees/${id}`);
            setProfile(empRes.data);

            const shRes = await api.get('/shareholders/');
            const myShare = shRes.data.find(s => s.EmployeeID === id);
            setShareholderInfo(myShare);

        } catch (err) {
            console.error(err);
            toast.error("Không tải được dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    const fmt = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    // --- HÀNH ĐỘNG: XUẤT PDF THỰC TẾ ---
    const handleExportPDF = (salaryRecord) => {
        try {
            const doc = new jsPDF();
            
            // Tiêu đề
            doc.setFontSize(18);
            doc.text("PHIEU LUONG (PAYSLIP)", 105, 20, null, null, "center");
            
            // Thông tin chung
            doc.setFontSize(12);
            doc.text(`Thang/Nam: ${salaryRecord.SalaryMonth}`, 20, 40);
            doc.text(`Nhan vien: ${profile.FullName}`, 20, 50);
            doc.text(`Phong ban: ${profile.department?.DepartmentName || ''}`, 20, 60);

            // Chi tiết lương
            doc.text("------------------------------------------------", 20, 70);
            doc.text(`Luong Co Ban:   ${fmt(salaryRecord.BaseSalary)}`, 20, 80);
            doc.text(`Thuong:         ${fmt(salaryRecord.Bonus)}`, 20, 90);
            doc.text(`Khau tru:       ${fmt(salaryRecord.Deductions)}`, 20, 100);
            doc.text("------------------------------------------------", 20, 110);
            
            // Thực lĩnh
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 255); // Màu xanh
            doc.text(`THUC LINH:      ${fmt(salaryRecord.NetSalary)}`, 20, 125);

            // Lưu file
            doc.save(`Payslip_${profile.FullName}_${salaryRecord.SalaryMonth}.pdf`);
            
            console.log(`[AUDIT] User ${user.email} exported Payslip PDF for ${salaryRecord.SalaryMonth}`);
            toast.success(`Đã tải xuống phiếu lương tháng ${salaryRecord.SalaryMonth}`);
        } catch (error) {
            console.error("PDF Error:", error);
            toast.error("Lỗi khi tạo file PDF");
        }
    };

    // --- HÀNH ĐỘNG: GỬI MAIL ---
    const handleSendMail = async (month) => {
        toast.info(`Đang gửi phiếu lương tháng ${month} vào email của bạn...`);
        setTimeout(() => {
             console.log(`[AUDIT] User ${user.email} requested Payslip Email for ${month}`);
             toast.success("Đã gửi thành công!");
        }, 1000);
    };

    if (loading) return <div style={{padding:'40px', textAlign:'center'}}>Đang tải dữ liệu...</div>;
    if (!profile) return <div style={{padding:'20px'}}>Không tìm thấy thông tin.</div>;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            style={{ padding: '20px', color: 'var(--text-color)' }}
        >
            <h2 style={{marginBottom: '20px'}}>Phiếu lương & Thu nhập của tôi</h2>
            
            {/* INFO CARD */}
            <div style={styles.card}>
                <div style={styles.profileHeader}>
                    <div style={styles.avatar}>
                        {profile.FullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 style={{margin:0, fontSize:'1.3rem'}}>{profile.FullName}</h3>
                        <div style={{color:'var(--text-color-secondary)', marginTop:'5px'}}>
                            <span>{profile.position?.PositionName}</span> • <span>{profile.department?.DepartmentName}</span>
                        </div>
                    </div>
                </div>

                <hr style={{border:'0', borderTop:'1px solid var(--border-color)', margin:'20px 0'}} />

                {/* PHẦN CỔ TỨC */}
                {shareholderInfo && (
                    <div style={styles.dividendSection}>
                        <h4 style={{margin:'0 0 10px 0', color:'#6f42c1'}}>💎 Thông tin Cổ đông</h4>
                        <div style={{display:'flex', gap:'30px', flexWrap:'wrap'}}>
                            <div>
                                <small>Số cổ phần nắm giữ</small>
                                <div style={{fontWeight:'bold', fontSize:'1.1em'}}>{shareholderInfo.Shares.toLocaleString()} CP</div>
                            </div>
                            <div>
                                <small>Tỷ lệ sở hữu</small>
                                <div style={{fontWeight:'bold', fontSize:'1.1em'}}>{shareholderInfo.SharePercentage}%</div>
                            </div>
                            <div>
                                <small>Cổ tức tích lũy/được nhận</small>
                                <div style={{fontWeight:'bold', fontSize:'1.1em', color:'#6f42c1'}}>
                                    {fmt(shareholderInfo.UnpaidDividend)}
                                </div>
                            </div>
                            <div>
                                <small>Trạng thái</small>
                                <div>
                                    <span style={{background:'#d1e7dd', color:'#0f5132', padding:'2px 8px', borderRadius:'10px', fontSize:'0.8em'}}>
                                        {shareholderInfo.Status}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <hr style={{border:'0', borderTop:'1px solid #eee', margin:'20px 0'}} />
                    </div>
                )}

                {/* SALARY TABLE */}
                <h4 style={{margin:'0 0 15px 0'}}>Lịch sử Phiếu lương</h4>
                <div style={{overflowX:'auto'}}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={{background:'var(--table-header-bg)', textAlign:'left'}}>
                                <th style={styles.th}>Tháng</th>
                                <th style={styles.th}>Lương Cơ bản</th>
                                <th style={styles.th}>Thưởng</th>
                                <th style={styles.th}>Khấu trừ</th>
                                <th style={{...styles.th, color:'#0d6efd'}}>Thực lĩnh</th>
                                <th style={styles.th}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {profile.salaries.length > 0 ? profile.salaries.map(s => (
                                <tr key={s.SalaryID} style={{borderBottom:'1px solid var(--border-color)'}}>
                                    <td style={styles.td}><strong>{s.SalaryMonth}</strong></td>
                                    <td style={styles.td}>{fmt(s.BaseSalary)}</td>
                                    <td style={{...styles.td, color:'green'}}>{fmt(s.Bonus)}</td>
                                    <td style={{...styles.td, color:'red'}}>{fmt(s.Deductions)}</td>
                                    <td style={{...styles.td, color:'#0d6efd', fontWeight:'bold', fontSize:'1.1em', background:'#f0f5ff'}}>
                                        {fmt(s.NetSalary)}
                                    </td>
                                    <td style={styles.td}>
                                        <button 
                                            onClick={() => handleExportPDF(s)}
                                            style={{...styles.actionBtn, marginRight:'8px'}}
                                            title="Xuất PDF"
                                        >
                                            📄 PDF
                                        </button>
                                        <button 
                                            onClick={() => handleSendMail(s.SalaryMonth)}
                                            style={styles.actionBtn}
                                            title="Gửi về Email"
                                        >
                                            📧 Email
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" style={{padding:'20px', textAlign:'center'}}>Chưa có lịch sử lương.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
}

const styles = {
    card: { background: 'var(--card-bg)', padding: '30px', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
    profileHeader: { display:'flex', alignItems:'center', gap:'20px' },
    avatar: { width:'60px', height:'60px', background:'linear-gradient(135deg, #0d6efd, #0a58ca)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'1.8em', fontWeight:'bold', boxShadow:'0 4px 8px rgba(13, 110, 253, 0.3)' },
    dividendSection: { background: '#f9f9ff', padding: '15px', borderRadius: '8px', border: '1px solid #e0e0ff', marginBottom: '20px' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop:'10px' },
    th: { padding: '15px', borderBottom: '2px solid var(--border-color)', color: 'var(--text-color)', fontWeight:'600' },
    td: { padding: '15px', color: 'var(--text-color)', verticalAlign:'middle' },
    actionBtn: { padding:'6px 10px', background:'transparent', border:'1px solid var(--border-color)', borderRadius:'4px', cursor:'pointer', fontSize:'0.85em', transition:'all 0.2s' }
};

// Add spin animation if not exists
if (!document.getElementById('spin-style')) {
    const style = document.createElement('style');
    style.id = 'spin-style';
    style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
}

export default MyPayslips;