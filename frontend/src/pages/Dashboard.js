// frontend/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import EmployeeDeptChart from '../components/charts/EmployeeDeptChart';
import AvgSalaryChart from '../components/charts/AvgSalaryChart';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

// --- Skeleton Components (Đã đổi tên) ---
const SkeletonStatCard = () => (
    <div style={styles.skeletonCard} >
        <div style={styles.skeletonTextLarge} className="skeleton-text-large"></div>
        <div style={styles.skeletonTextSmall} className="skeleton-text-small"></div>
    </div>
);
const SkeletonChartCard = () => (
    <div style={styles.skeletonChart} className="skeleton-chart"></div>
);

function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({ totalEmployees: null, totalSalaryBudget: null, unreadAlerts: null });
    const [chartData, setChartData] = useState({ distributionByDept: {}, avgSalaryByDept: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const isDarkMode = document.body.classList.contains('theme-dark');

    useEffect(() => {
        // Add custom styles
        const styleId = 'dashboard-styles';
        if (!document.getElementById(styleId)) {
            const styleSheet = document.createElement("style");
            styleSheet.id = styleId;
            styleSheet.type = "text/css";
            styleSheet.innerText = `
                .stat-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 15px rgba(0,0,0,0.1) !important;
                }
                @keyframes pulse {
                    0% { background-color: #e0e0e0; opacity: 0.6; }
                    50% { background-color: #f0f0f0; opacity: 0.8; }
                    100% { background-color: #e0e0e0; opacity: 0.6; }
                }
                body.theme-dark .skeleton-text-large,
                body.theme-dark .skeleton-text-small,
                body.theme-dark .skeleton-chart {
                    background-color: #333;
                    opacity: 0.5;
                    animation-name: pulse-dark;
                }
                 @keyframes pulse-dark {
                    0% { background-color: #333; opacity: 0.5; }
                    50% { background-color: #444; opacity: 0.7; }
                    100% { background-color: #333; opacity: 0.5; }
                }
            `;
            document.head.appendChild(styleSheet);
        }

        const fetchDashboardData = async () => {
            setLoading(true);
            setError('');
            try {
                // Fetch all data concurrently
                const [hrRes, payrollRes, unreadCountRes] = await Promise.all([
                    api.get('/reports/hr_summary'),
                    api.get('/reports/payroll_summary'),
                    api.get('/notifications/unread-count') // Fetch unread notifications count
                ]);

                setStats({
                    totalEmployees: hrRes.data.total_employees,
                    totalSalaryBudget: payrollRes.data.total_salary_budget,
                    unreadAlerts: unreadCountRes.data,
                });

                setChartData({
                    distributionByDept: hrRes.data.distribution_by_dept,
                    avgSalaryByDept: payrollRes.data.avg_salary_by_dept,
                });

            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
                setError('Không thể tải dữ liệu dashboard.');
                // Chỉ toast lỗi chính, bỏ qua lỗi unread-count nếu có
                if (!err.config?.url?.includes('unread-count')) {
                     toast.error('Không thể tải dữ liệu dashboard.');
                }
                // Giả lập dữ liệu 0 cho card thông báo nếu API lỗi
                setStats(prev => ({...prev, unreadAlerts: 0}));
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const barColor1 = isDarkMode ? '#6A7FAB' : '#8884d8';
    const barColor2 = isDarkMode ? '#77BFA3' : '#82ca9d';
    const textColor = isDarkMode ? 'var(--text-color-secondary)' : '#666';

    const formatCurrency = (value) => {
        if (typeof value !== 'number') return 'N/A'; // Xử lý null/undefined
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    return (
        <div style={styles.dashboardContainer}>
            <div style={styles.welcomeMessage}>
                {/* Dùng CSS Vars */}
                <h2 style={{ color: 'var(--text-color)' }}>Chào mừng quay trở lại, {user?.email}!</h2>
                <p style={{ color: 'var(--text-color-secondary)' }}>Tổng quan hệ thống nhân sự và lương.</p>
            </div>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            <div style={styles.statsGrid}>
                {loading ? (
                    <> <SkeletonStatCard /> <SkeletonStatCard /> <SkeletonStatCard /> </>
                ) : (
                    <>
                        <Link to="/employees" style={{ textDecoration: 'none' }}>
                            <motion.div style={styles.statCard} className="stat-card" whileHover={{ y: -5 }}>
                                <div style={styles.statValue}>{stats.totalEmployees ?? 'N/A'}</div>
                                <div style={styles.statLabel}>Tổng số nhân viên</div>
                            </motion.div>
                        </Link>
                        <Link to="/payroll" style={{ textDecoration: 'none' }}>
                            <motion.div style={styles.statCard} className="stat-card" whileHover={{ y: -5 }}>
                                <div style={styles.statValue}> {formatCurrency(stats.totalSalaryBudget)} </div>
                                <div style={styles.statLabel}>Tổng lương tháng</div>
                            </motion.div>
                        </Link>
                        <Link to="/" style={{ textDecoration: 'none' }}>
                             <motion.div
                                style={stats.unreadAlerts > 0 ? {...styles.statCard, ...styles.statCardAlert} : styles.statCard}
                                className="stat-card"
                                whileHover={{ y: -5 }}
                             >
                                <div style={styles.statValue}>{stats.unreadAlerts ?? 'N/A'}</div>
                                <div style={styles.statLabel}>Cảnh báo/Thông báo mới</div>
                            </motion.div>
                        </Link>
                    </>
                )}
            </div>

            <div style={styles.chartsGrid}>
                {loading ? (
                    <> <SkeletonChartCard /> <SkeletonChartCard /> </>
                ) : (
                    <>
                        <motion.div style={styles.chartContainer} whileHover={{ boxShadow: 'var(--hover-shadow)' }}>
                            <EmployeeDeptChart data={chartData.distributionByDept} barColor={barColor1} textColor={textColor} />
                        </motion.div>
                        <motion.div style={styles.chartContainer} whileHover={{ boxShadow: 'var(--hover-shadow)' }}>
                            <AvgSalaryChart data={chartData.avgSalaryByDept} barColor={barColor2} textColor={textColor} />
                        </motion.div>
                    </>
                )}
            </div>
        </div>
    );
}

// --- STYLES ĐÃ CẬP NHẬT (Sử dụng CSS Vars) ---
const styles = {
    dashboardContainer: { padding: '20px' },
    welcomeMessage: { marginBottom: '30px', paddingBottom: '15px', borderBottom: '1px solid var(--border-color)' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' },
    statCard: {
        backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: '8px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)', textAlign: 'center',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease', cursor: 'pointer',
        borderLeft: '5px solid var(--primary-color)', // Dùng màu primary
    },
    statCardAlert: { borderLeft: '5px solid #ff4d4f' }, // Giữ màu đỏ cho Cảnh báo
    statValue: { fontSize: '2.2rem', fontWeight: 'bold', color: 'var(--text-color)', margin: '10px 0' },
    statLabel: { fontSize: '0.9rem', color: 'var(--text-color-secondary)' },
    chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' },
    chartContainer: {
        backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: '8px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s ease',
        border: '1px solid var(--border-color)', // Thêm border
    },
    // --- Skeleton styles ---
    skeletonCard: { backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '8px', height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' },
    skeletonTextLarge: { height: '35px', width: '60%', backgroundColor: '#e0e0e0', borderRadius: '4px', marginBottom: '15px', animation: 'pulse 1.5s infinite ease-in-out' },
    skeletonTextSmall: { height: '15px', width: '80%', backgroundColor: '#e0e0e0', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' },
    skeletonChart: { backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '8px', height: '340px', animation: 'pulse 1.5s infinite ease-in-out' }
};

export default Dashboard;