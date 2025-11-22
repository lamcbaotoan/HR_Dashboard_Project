// frontend/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

// Charts
import EmployeeDeptChart from '../components/charts/EmployeeDeptChart';
import AvgSalaryChart from '../components/charts/AvgSalaryChart';
import StatusChart from '../components/charts/StatusChart';
import SalaryTrendChart from '../components/charts/SalaryTrendChart';

// --- Icons ---
const UserIcon = () => <span>👥</span>;
const MoneyIcon = () => <span>💰</span>;
const DividendIcon = () => <span>💎</span>;
const AlertIcon = () => <span>🔔</span>;

// Skeleton Loading
const SkeletonCard = () => <div style={{background:'#e0e0e0', height:'120px', borderRadius:'8px', animation:'pulse 1.5s infinite'}}></div>;
const SkeletonChart = () => <div style={{background:'#e0e0e0', height:'350px', borderRadius:'8px', animation:'pulse 1.5s infinite'}}></div>;

function Dashboard() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const isDarkMode = document.body.classList.contains('theme-dark');

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const summaryRes = await api.get('/reports/dashboard-summary');
                setData(summaryRes.data);
                
                const alertRes = await api.get('/notifications/', { params: { limit: 5 } });
                setAlerts(alertRes.data);
            } catch (err) {
                console.error("Dashboard Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const barColor1 = isDarkMode ? '#6A7FAB' : '#8884d8';
    const barColor2 = isDarkMode ? '#77BFA3' : '#82ca9d';
    const textColor = isDarkMode ? '#a0a0a0' : '#666';

    const fmtMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    if (loading) {
        return (
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
    }

    if (!data) return <div style={{padding:'20px', textAlign:'center'}}>Không có dữ liệu.</div>;

    // Destructure an toàn
    const { 
        hr_metrics = {}, 
        payroll_metrics = {}, 
        financial_metrics = {} 
    } = data || {};

    // [FIX] Đảm bảo dữ liệu luôn là mảng (Array) và KHÔNG dùng .reduce() khi truyền vào chart
    const deptData = hr_metrics?.department_distribution || [];
    const salaryData = payroll_metrics?.avg_salary_by_dept || [];
    const statusData = hr_metrics?.status_distribution || [];
    const trendData = payroll_metrics?.salary_trend || [];

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

            {/* 2. CHARTS & ANALYSIS */}
            <div style={styles.gridCharts}>
                {/* Biểu đồ Xu hướng lương (Full width) */}
                {trendData.length > 0 && (
                    <div style={{...styles.chartCard, gridColumn: '1 / -1'}}> 
                        <SalaryTrendChart data={trendData} />
                    </div>
                )}

                <div style={styles.chartCard}>
                    {/* [FIX] Truyền trực tiếp mảng deptData */}
                    <EmployeeDeptChart 
                        data={deptData} 
                        barColor={barColor1} 
                        textColor={textColor}
                    />
                </div>

                <div style={styles.chartCard}>
                    {/* [FIX] Truyền trực tiếp mảng salaryData -> Sửa lỗi biểu đồ trắng */}
                    <AvgSalaryChart 
                        data={salaryData} 
                        barColor={barColor2} 
                        textColor={textColor}
                    />
                </div>

                <div style={styles.chartCard}>
                    <StatusChart data={statusData} />
                </div>
            </div>

            {/* 3. ALERTS CENTER */}
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

// Helpers
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

const styles = {
    welcomeMessage: { marginBottom: '25px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' },
    gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' },
    card: { background: 'var(--card-bg)', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid var(--border-color)', transition: 'transform 0.2s', cursor: 'pointer' },
    cardIcon: { width: '50px', height: '50px', borderRadius: '12px', background: '#e6fffb', color: '#13c2c2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' },
    cardTitle: { color: 'var(--text-color-secondary)', fontSize: '0.9rem', fontWeight: '600' },
    cardValue: { fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--text-color)', margin: '5px 0' },
    cardSub: { fontSize: '0.8rem', color: 'var(--text-color-secondary)' },
    
    gridCharts: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' },
    chartCard: { background: 'var(--card-bg)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)', height: '350px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' },
    
    alertContainer: { background: 'var(--card-bg)', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' },
    alertItem: { padding: '15px', borderBottom: '1px solid var(--border-color)', borderLeft: '4px solid transparent', transition: '0.2s' },
};

export default Dashboard;