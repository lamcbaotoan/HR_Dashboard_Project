// frontend/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

// Import các chart và component cũ cho Admin
import EmployeeDeptChart from '../components/charts/EmployeeDeptChart';
import AvgSalaryChart from '../components/charts/AvgSalaryChart';
import StatusChart from '../components/charts/StatusChart';
import SalaryTrendChart from '../components/charts/SalaryTrendChart';

// --- Icons ---
const UserIcon = () => <span>👥</span>;
const MoneyIcon = () => <span>💰</span>;
const DividendIcon = () => <span>💎</span>;
const AlertIcon = () => <span>🔔</span>;
// [NEW] Icons cho Employee
const EyeIcon = () => <span>👁️</span>;
const EyeOffIcon = () => <span>🙈</span>;
const CalendarIcon = () => <span>📅</span>;
const PlaneIcon = () => <span>✈️</span>;
const WalletIcon = () => <span>💵</span>;

// Skeleton Loading
const SkeletonCard = () => <div style={{background:'#e0e0e0', height:'120px', borderRadius:'8px', animation:'pulse 1.5s infinite'}}></div>;
const SkeletonChart = () => <div style={{background:'#e0e0e0', height:'350px', borderRadius:'8px', animation:'pulse 1.5s infinite'}}></div>;

function Dashboard() {
    const { user } = useAuth();
    const [data, setData] = useState(null); // Dữ liệu Admin
    const [empData, setEmpData] = useState(null); // Dữ liệu Employee
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showSalary, setShowSalary] = useState(false); // State ẩn/hiện lương

    const isEmployee = user?.role === 'Employee';
    const isDarkMode = document.body.classList.contains('theme-dark');

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                if (isEmployee) {
                    // [NEW] Gọi API riêng cho Employee
                    const res = await api.get('/reports/my-dashboard-summary');
                    setEmpData(res.data);
                } else {
                    // Gọi API cũ cho Admin/Manager
                    const summaryRes = await api.get('/reports/dashboard-summary');
                    setData(summaryRes.data);
                    const alertRes = await api.get('/notifications/', { params: { limit: 5 } });
                    setAlerts(alertRes.data);
                }
            } catch (err) {
                console.error("Dashboard Error:", err);
                toast.error("Không thể tải dữ liệu Dashboard.");
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [isEmployee]);

    const fmtMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    if (loading) return (
        <div style={{padding:'20px'}}>
            <div style={{marginBottom:'20px'}}><SkeletonCard /></div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'20px'}}>
                <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
             <div style={{marginTop:'20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                <SkeletonChart /><SkeletonChart />
            </div>
        </div>
    );

    // =================================================================
    // GIAO DIỆN RIÊNG CHO EMPLOYEE (NHÂN VIÊN)
    // =================================================================
    if (isEmployee && empData) {
        return (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                style={{ padding: '20px', color: 'var(--text-color)' }}
            >
                {/* HEADER THÔNG TIN CÁ NHÂN */}
                <div style={styles.welcomeMessage}>
                     <h2 style={{ color: 'var(--text-color)', margin: 0 }}>
                        Xin chào, {empData.personal_info.full_name}!
                     </h2>
                     <p style={{ color: 'var(--text-color-secondary)', marginTop: '5px', fontWeight: 'bold' }}>
                        {empData.personal_info.position}
                     </p>
                </div>

                {/* GRID CARDS */}
                <div style={styles.gridCards}>
                    {/* Card 1: Ngày công (MySQL Attendance) */}
                    <div style={styles.card}>
                        <div style={{...styles.cardIcon, background:'#e6f7ff', color:'#1890ff'}}><CalendarIcon /></div>
                        <div>
                            <div style={styles.cardTitle}>Ngày công tháng {new Date().getMonth()+1}</div>
                            <div style={{...styles.cardValue, color: '#1890ff'}}>
                                {empData.attendance.current_work_days} <span style={{fontSize:'0.6em', color:'#888'}}>/ {empData.attendance.standard_days}</span>
                            </div>
                            <div style={styles.cardSub}>
                                {empData.attendance.current_work_days >= empData.attendance.standard_days ? '🎉 Đủ tiến độ' : '⏳ Đang ghi nhận'}
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Phép năm (MySQL Calculated) */}
                    <div style={styles.card}>
                        <div style={{...styles.cardIcon, background:'#fff7e6', color:'#faad14'}}><PlaneIcon /></div>
                        <div>
                            <div style={styles.cardTitle}>Phép năm còn lại</div>
                            <div style={{...styles.cardValue, color: '#faad14'}}>
                                {empData.leave.remaining} <span style={{fontSize:'0.6em', color:'#888'}}>ngày</span>
                            </div>
                            <div style={styles.cardSub}>Hết hạn: 31/12/{new Date().getFullYear()}</div>
                        </div>
                    </div>

                    {/* Card 3: Lương thực nhận (MySQL Salary - Secured) */}
                    <div style={styles.card}>
                        <div style={{...styles.cardIcon, background:'#f6ffed', color:'#52c41a'}}><WalletIcon /></div>
                        <div style={{flex: 1}}>
                            <div style={styles.cardTitle}>Lương thực nhận (Gần nhất)</div>
                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                <div style={{...styles.cardValue, color: '#52c41a'}}>
                                    {showSalary ? fmtMoney(empData.salary.net_amount) : '***.***.*** ₫'}
                                </div>
                                <button 
                                    onClick={() => setShowSalary(!showSalary)} 
                                    style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem'}}
                                    title={showSalary ? "Ẩn" : "Hiện"}
                                >
                                    {showSalary ? <EyeOffIcon/> : <EyeIcon/>}
                                </button>
                            </div>
                            <div style={styles.cardSub}>Tháng {empData.salary.month || 'N/A'}</div>
                        </div>
                    </div>
                </div>

                {/* NOTIFICATIONS & QUICK ACCESS */}
                <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
                    {/* Notifications List */}
                    <div style={{flex: 2, minWidth: '300px'}}>
                        <h3 style={{color:'var(--text-color)'}}>Thông báo mới nhất</h3>
                        <div style={styles.alertContainer}>
                            {empData.notifications.length > 0 ? empData.notifications.map((note, idx) => (
                                <div key={idx} style={styles.alertItem}>
                                    <div style={{fontWeight:'bold', color: note.type === 'gift' ? '#722ed1' : '#ff4d4f'}}>
                                        {note.type === 'gift' ? '🎁 Chúc mừng sinh nhật!' : '⚠️ Nhắc nhở chấm công'}
                                    </div>
                                    <div style={{color:'var(--text-color)'}}>{note.message}</div>
                                    <div style={{fontSize:'0.8em', color:'var(--text-color-secondary)', marginTop:'5px'}}>Hôm nay</div>
                                </div>
                            )) : (
                                <div style={{padding:'20px', textAlign:'center', color:'var(--text-color-secondary)'}}>Không có thông báo nào.</div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div style={{flex: 1, minWidth: '250px'}}>
                        <h3 style={{color:'var(--text-color)'}}>Truy cập nhanh</h3>
                        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                            <Link to="/my-attendance" style={styles.quickBtn}>
                                ➕ Đăng ký Nghỉ phép
                            </Link>
                            <Link to="/my-payslips" style={{...styles.quickBtn, background: '#393E46', color: '#fff'}}>
                                📄 Xem Phiếu lương
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    // =================================================================
    // GIAO DIỆN CHO ADMIN / MANAGER
    // =================================================================
    if (!data) return <div style={{padding:'20px', textAlign:'center'}}>Không có dữ liệu.</div>;

    const { hr_metrics, payroll_metrics, financial_metrics } = data;
    const deptData = hr_metrics?.department_distribution || [];
    const salaryData = payroll_metrics?.salary_by_dept || [];
    const statusData = hr_metrics?.status_distribution || [];
    const trendData = payroll_metrics?.salary_trend || [];
    
    const barColor1 = isDarkMode ? '#6A7FAB' : '#8884d8';
    const barColor2 = isDarkMode ? '#77BFA3' : '#82ca9d';
    const textColor = isDarkMode ? '#a0a0a0' : '#666';

    // Helpers cho alert (Admin)
    const getAlertColor = (type) => {
        if (type === 'leave_warning' || type === 'salary_alert') return '#ff4d4f';
        if (type && type.includes('anniversary')) return '#faad14';
        return '#1890ff';
    };
    const getAlertTitle = (type) => {
        if (type === 'leave_warning') return '⚠️ Cảnh báo Nghỉ phép';
        if (type === 'salary_alert') return '💰 Cảnh báo Lương';
        if (type && type.includes('anniversary')) return '🎉 Sự kiện Nhân sự';
        return 'Thông báo';
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
            style={{ padding: '20px', color: 'var(--text-color)' }}
        >
            <div style={styles.welcomeMessage}>
                 <h2 style={{ color: 'var(--text-color)', margin: 0 }}>Chào mừng quay trở lại, {user?.email}!</h2>
                 <p style={{ color: 'var(--text-color-secondary)', marginTop: '5px' }}>Tổng quan hệ thống nhân sự và lương.</p>
            </div>

            {/* 1. KEY METRICS CARDS */}
            <div style={styles.gridCards}>
                <Link to="/employees" style={{ textDecoration: 'none' }}>
                     <div style={styles.card}>
                        <div style={styles.cardIcon}><UserIcon /></div>
                        <div>
                            <div style={styles.cardTitle}>Tổng Nhân sự</div>
                            <div style={styles.cardValue}>{hr_metrics?.total_employees || 0}</div>
                            <div style={styles.cardSub}>{hr_metrics?.shareholder_count || 0} là Cổ đông</div>
                        </div>
                    </div>
                </Link>

                <Link to="/payroll" style={{ textDecoration: 'none' }}>
                    <div style={styles.card}>
                        <div style={{...styles.cardIcon, background:'#e6f7ff', color:'#1890ff'}}><MoneyIcon /></div>
                        <div>
                            <div style={styles.cardTitle}>Quỹ Lương (Tháng này)</div>
                            <div style={styles.cardValue}>{fmtMoney(payroll_metrics?.total_salary_budget || 0)}</div>
                            <div style={styles.cardSub}>Dữ liệu từ PAYROLL</div>
                        </div>
                    </div>
                </Link>

                <Link to="/shareholders" style={{ textDecoration: 'none' }}>
                    <div style={styles.card}>
                        <div style={{...styles.cardIcon, background:'#f9f0ff', color:'#722ed1'}}><DividendIcon /></div>
                        <div>
                            <div style={styles.cardTitle}>Tổng Cổ tức đã chi</div>
                            <div style={styles.cardValue}>{fmtMoney(financial_metrics?.total_dividends || 0)}</div>
                            <div style={styles.cardSub}>Dữ liệu từ HUMAN_2025</div>
                        </div>
                    </div>
                </Link>
            </div>

            {/* 2. CHARTS */}
            <div style={styles.gridCharts}>
                {trendData.length > 0 && (
                    <div style={{...styles.chartCard, gridColumn: '1 / -1'}}> 
                        <SalaryTrendChart data={trendData} />
                    </div>
                )}
                <div style={styles.chartCard}>
                    <EmployeeDeptChart data={deptData} barColor={barColor1} textColor={textColor} />
                </div>
                <div style={styles.chartCard}>
                    <AvgSalaryChart data={salaryData} barColor={barColor2} textColor={textColor} />
                </div>
                <div style={styles.chartCard}>
                    <StatusChart data={statusData} />
                </div>
            </div>

            {/* 3. ALERTS */}
            <div style={{marginTop: '30px'}}>
                <h3 style={{display:'flex', alignItems:'center', gap:'10px', color:'var(--text-color)'}}>
                    <AlertIcon /> Trung tâm Cảnh báo & Sự kiện
                </h3>
                <div style={styles.alertContainer}>
                    {alerts.length > 0 ? alerts.map(alert => (
                        <div key={alert.id} style={styles.alertItem}>
                            <div style={{fontWeight:'bold', color: getAlertColor(alert.type)}}>{getAlertTitle(alert.type)}</div>
                            <div style={{color:'var(--text-color)'}}>{alert.message}</div>
                            <div style={{fontSize:'0.8em', color:'var(--text-color-secondary)', marginTop:'5px'}}>
                                {new Date(alert.created_at).toLocaleString()}
                            </div>
                        </div>
                    )) : (
                        <div style={{padding:'20px', textAlign:'center', color:'var(--text-color-secondary)'}}>Không có cảnh báo mới.</div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// --- STYLES ---
const styles = {
    welcomeMessage: { marginBottom: '25px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' },
    gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' },
    card: { background: 'var(--card-bg)', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid var(--border-color)', transition: 'transform 0.2s', cursor: 'pointer' },
    cardIcon: { width: '50px', height: '50px', borderRadius: '12px', background: '#e6fffb', color: '#13c2c2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' },
    cardTitle: { color: 'var(--text-color-secondary)', fontSize: '0.9rem', fontWeight: '600' },
    cardValue: { fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--text-color)', margin: '5px 0' },
    cardSub: { fontSize: '0.8rem', color: 'var(--text-color-secondary)' },
    
    // Employee specific styles
    alertContainer: { background: 'var(--card-bg)', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' },
    alertItem: { padding: '15px', borderBottom: '1px solid var(--border-color)', borderLeft: '4px solid transparent', transition: '0.2s' },
    quickBtn: { display:'block', padding:'15px', background:'#0092ff', color:'white', textDecoration:'none', borderRadius:'8px', fontWeight:'bold', textAlign:'center', boxShadow:'0 4px 10px rgba(0,146,255,0.3)', transition:'transform 0.2s' },
    
    // Admin specific styles
    gridCharts: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' },
    chartCard: { background: 'var(--card-bg)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)', height: '350px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' },
};

export default Dashboard;