// frontend/src/pages/MyAttendance.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

// Skeleton Loading
const Skeleton = () => <div style={{height:'40px', background:'#eee', margin:'10px 0', borderRadius:'4px'}}></div>;

function MyAttendance() {
    const { user } = useAuth();
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [stats, setStats] = useState({ worked: 0, absent: 0, leave: 0 });
    const [loading, setLoading] = useState(true);
    
    // Form đăng ký nghỉ
    const [formData, setFormData] = useState({ LeaveType: 'Phép năm', StartDate: '', EndDate: '', Reason: '' });

    useEffect(() => {
        if (user?.emp_id) {
            fetchAttendanceData(user.emp_id);
        }
    }, [user]);

    const fetchAttendanceData = async (id) => {
        setLoading(true);
        try {
            // [Data Source] Gọi API lấy dữ liệu từ MySQL (PAYROLL DB)
            const res = await api.get(`/payroll/${id}/attendance`);
            setAttendanceHistory(res.data);

            // Tính toán thống kê tổng hợp (Client-side aggregation)
            const totalStats = res.data.reduce((acc, curr) => ({
                worked: acc.worked + curr.WorkDays,
                absent: acc.absent + curr.AbsentDays,
                leave: acc.leave + curr.LeaveDays
            }), { worked: 0, absent: 0, leave: 0 });
            
            setStats(totalStats);

        } catch (err) {
            console.error(err);
            toast.error("Không thể tải dữ liệu chấm công từ hệ thống Payroll.");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/leave-requests/', formData);
            toast.success("Gửi yêu cầu nghỉ phép thành công!");
            setFormData({ LeaveType: 'Phép năm', StartDate: '', EndDate: '', Reason: '' });
        } catch(err) { 
            toast.error("Lỗi gửi yêu cầu."); 
        }
    };

    // Hạn mức nghỉ phép (Giả định Business Rule: 12 ngày/năm)
    const MAX_LEAVE_YEAR = 12;
    const leaveRemaining = MAX_LEAVE_YEAR - stats.leave;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            style={{ padding: '20px', color: 'var(--text-color)' }}
        >
            <h2 style={{ marginBottom: '20px' }}>Quản lý Chấm công & Nghỉ phép</h2>

            {/* --- PHẦN 1: THỐNG KÊ TỔNG QUAN (Dữ liệu MySQL) --- */}
            <div style={styles.statsGrid}>
                {/* Workdays */}
                <div style={styles.statCard}>
                    <div style={styles.statTitle}>Ngày công thực tế</div>
                    <div style={{...styles.statValue, color:'#0d6efd'}}>
                        {loading ? '...' : stats.worked}
                    </div>
                    <div style={styles.statSub}>Dữ liệu từ MySQL (Payroll)</div>
                </div>

                {/* Leave Days (Có cảnh báo) */}
                <div style={styles.statCard}>
                    <div style={styles.statTitle}>Ngày phép đã dùng</div>
                    <div style={{...styles.statValue, color: stats.leave > MAX_LEAVE_YEAR ? 'red' : '#e6a800'}}>
                        {loading ? '...' : `${stats.leave} / ${MAX_LEAVE_YEAR}`}
                    </div>
                    <div style={styles.statSub}>
                        {leaveRemaining < 0 ? 
                            <span style={{color:'red', fontWeight:'bold'}}>⚠️ Vượt quy định {Math.abs(leaveRemaining)} ngày</span> : 
                            `Còn lại ${leaveRemaining} ngày`
                        }
                    </div>
                </div>

                {/* Absences */}
                <div style={styles.statCard}>
                    <div style={styles.statTitle}>Vắng mặt (Không phép)</div>
                    <div style={{...styles.statValue, color:'red'}}>
                        {loading ? '...' : stats.absent}
                    </div>
                    <div style={styles.statSub}>Ảnh hưởng trực tiếp đến lương</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {/* --- PHẦN 2: FORM ĐĂNG KÝ --- */}
                <div style={{ flex: 1, minWidth:'300px', background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{marginTop:0}}>📝 Đăng ký Nghỉ phép</h3>
                    <form onSubmit={handleRequestSubmit}>
                        <div style={{marginBottom:'15px'}}>
                            <label style={styles.label}>Loại nghỉ</label>
                            <select style={styles.input} value={formData.LeaveType} onChange={e=>setFormData({...formData, LeaveType: e.target.value})}>
                                <option>Phép năm (Annual Leave)</option>
                                <option>Nghỉ ốm (Sick Leave)</option>
                                <option>Nghỉ không lương (Unpaid)</option>
                            </select>
                        </div>
                        <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
                            <div style={{flex:1}}>
                                <label style={styles.label}>Từ ngày</label>
                                <input type="date" required style={styles.input} value={formData.StartDate} onChange={e=>setFormData({...formData, StartDate: e.target.value})} />
                            </div>
                            <div style={{flex:1}}>
                                <label style={styles.label}>Đến ngày</label>
                                <input type="date" required style={styles.input} value={formData.EndDate} onChange={e=>setFormData({...formData, EndDate: e.target.value})} />
                            </div>
                        </div>
                        <div style={{marginBottom:'15px'}}>
                            <label style={styles.label}>Lý do</label>
                            <textarea required rows="3" style={styles.input} value={formData.Reason} onChange={e=>setFormData({...formData, Reason: e.target.value})} placeholder="Nhập lý do nghỉ..."></textarea>
                        </div>
                        <button type="submit" style={styles.btnSubmit}>Gửi yêu cầu</button>
                    </form>
                </div>

                {/* --- PHẦN 3: LỊCH SỬ CHẤM CÔNG CHI TIẾT --- */}
                <div style={{ flex: 2, minWidth:'400px', background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{marginTop:0}}>📅 Chi tiết Chấm công (Payroll DB)</h3>
                    <div style={{overflowX:'auto'}}>
                        <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.9em'}}>
                            <thead>
                                <tr style={{borderBottom:'2px solid var(--border-color)', textAlign:'left'}}>
                                    <th style={styles.th}>Tháng</th>
                                    <th style={styles.th}>Ngày công (Workdays)</th>
                                    <th style={styles.th}>Nghỉ phép (Leave)</th>
                                    <th style={styles.th}>Vắng (Absence)</th>
                                    <th style={styles.th}>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? <tr><td colSpan={5}><Skeleton/></td></tr> : 
                                attendanceHistory.length > 0 ? attendanceHistory.map(att => (
                                    <tr key={att.AttendanceID} style={{borderBottom:'1px solid var(--border-color)'}}>
                                        <td style={styles.td}><strong>{att.AttendanceMonth}</strong></td>
                                        <td style={styles.td}>{att.WorkDays}</td>
                                        <td style={styles.td}>{att.LeaveDays}</td>
                                        <td style={{...styles.td, color: att.AbsentDays > 0 ? 'red' : 'inherit'}}>{att.AbsentDays}</td>
                                        <td style={styles.td}>
                                            {att.WorkDays >= 22 
                                                ? <span style={{color:'green', fontWeight:'bold'}}>Đủ công</span> 
                                                : <span style={{color:'orange'}}>Thiếu công</span>}
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan={5} style={{padding:'20px', textAlign:'center'}}>Chưa có dữ liệu.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

const styles = {
    statsGrid: { display: 'flex', gap: '20px', marginBottom: '25px', flexWrap: 'wrap' },
    statCard: { flex: 1, minWidth: '200px', background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    statTitle: { color: 'var(--text-color-secondary)', fontSize: '0.9em', fontWeight: 'bold', textTransform: 'uppercase' },
    statValue: { fontSize: '2em', fontWeight: 'bold', margin: '5px 0' },
    statSub: { fontSize: '0.8em', color: '#888' },
    
    label: { display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '0.9em' },
    input: { width: '100%', padding: '10px', border: '1px solid var(--input-border-color)', borderRadius: '6px', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text-color)' },
    btnSubmit: { width: '100%', padding: '10px', background: '#0d6efd', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1em' },
    
    th: { padding: '12px', color: 'var(--text-color)' },
    td: { padding: '12px', color: 'var(--text-color)' }
};

export default MyAttendance;