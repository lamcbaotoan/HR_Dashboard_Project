// frontend/src/pages/Reports.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import EmployeeDeptChart from '../components/charts/EmployeeDeptChart';
import AvgSalaryChart from '../components/charts/AvgSalaryChart';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

// --- Skeleton Component ---
const SkeletonCard = ({ chart = true }) => (
    <div style={styles.card}>
        <div style={{ ...styles.skeletonItem, height: '24px', width: '40%', marginBottom: '15px' }} className="skeletonItem"></div>
        <div style={{ ...styles.skeletonItem, height: '36px', width: '60%', marginBottom: '25px' }} className="skeletonItem"></div>
        {chart ? (
            <div style={{ ...styles.skeletonItem, height: '250px', width: '100%' }} className="skeletonItem"></div>
        ) : (
            <>
                <div style={{ ...styles.skeletonItem, height: '20px', width: '80%', marginBottom: '10px' }} className="skeletonItem"></div>
                <div style={{ ...styles.skeletonItem, height: '20px', width: '70%' }} className="skeletonItem"></div>
            </>
        )}
    </div>
);

// --- Hàm tiện ích định dạng tiền tệ (Giả định VNĐ) ---
const formatCurrency = (value) => {
    if (typeof value !== 'number') return value;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

function Reports() {
    const [hrReport, setHrReport] = useState(null);
    const [payrollReport, setPayrollReport] = useState(null);
    const [dividendReport, setDividendReport] = useState(null);
    const [loading, setLoading] = useState(true);

    // Lấy theme status cho màu chart
    const isDarkMode = document.body.classList.contains('theme-dark');
    const barColor1 = isDarkMode ? '#6A7FAB' : '#8884d8';
    const barColor2 = isDarkMode ? '#77BFA3' : '#82ca9d';
    const textColor = isDarkMode ? 'var(--text-color-secondary)' : '#666';

    useEffect(() => {
        const fetchReports = async () => {
            setLoading(true);
            try {
                const [hrRes, payrollRes, dividendRes] = await Promise.all([
                    api.get('/reports/hr_summary'),
                    api.get('/reports/payroll_summary'),
                    api.get('/reports/dividend_summary')
                ]);
                setHrReport(hrRes.data);
                setPayrollReport(payrollRes.data);
                setDividendReport(dividendRes.data);
            } catch (error) {
                console.error("Failed to fetch reports", error);
                toast.error("Không thể tải dữ liệu báo cáo.");
            }
            setLoading(false);
        };
        fetchReports();
    }, []);

    if (loading) {
        return (
            // FIX: Sửa padding từ '0px' thành '20px'
            <div style={{ padding: '20px', color: 'var(--text-color)' }}>
                <h2 style={{ color: 'var(--text-color)' }}>Báo cáo Tích hợp</h2>
                <div style={styles.gridContainer}>
                    <SkeletonCard chart={true} />
                    <SkeletonCard chart={true} />
                </div>
                <div style={{marginTop: '20px'}}>
                    <SkeletonCard chart={false} />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            // FIX: Sửa padding từ '0px' thành '20px'
            style={{ padding: '20px', color: 'var(--text-color)' }}
        >
            <h2 style={{ color: 'var(--text-color)' }}>Báo cáo Tích hợp</h2>

            <div style={styles.gridContainer}>
                {/* Báo cáo HR */}
                <div style={styles.card}>
                    <h3 style={{ color: 'var(--text-color)' }}>Báo cáo Nhân sự (SQL Server)</h3>
                    {hrReport ? (
                        <>
                            <div style={styles.statItem}>
                                <span style={styles.statLabel}>Tổng số nhân viên</span>
                                <span style={styles.statValue}>{hrReport.total_employees}</span>
                            </div>
                            <EmployeeDeptChart data={hrReport.distribution_by_dept} barColor={barColor1} textColor={textColor} />
                        </>
                    ) : <p>Lỗi tải báo cáo HR.</p>}
                </div>

                {/* Báo cáo Payroll */}
                <div style={styles.card}>
                    <h3 style={{ color: 'var(--text-color)' }}>Báo cáo Lương (MySQL)</h3>
                    {payrollReport ? (
                        <>
                            <div style={styles.statItem}>
                                <span style={styles.statLabel}>Tổng quỹ lương (tháng gần nhất)</span>
                                <span style={styles.statValue}>{formatCurrency(payrollReport.total_salary_budget)}</span>
                            </div>
                            <AvgSalaryChart data={payrollReport.avg_salary_by_dept} barColor={barColor2} textColor={textColor} />
                        </>
                    ) : <p>Lỗi tải báo cáo Payroll.</p>}
                </div>
            </div>

            {/* Báo cáo Cổ tức (Full width) */}
            <div style={{...styles.card, marginTop: '20px'}}>
                <h3 style={{ color: 'var(--text-color)' }}>Báo cáo Cổ tức (SQL Server)</h3>
                {dividendReport ? (
                    <div style={styles.dividendGrid}>
                        <div style={styles.statItem}>
                            <span style={styles.statLabel}>Tổng cổ tức đã chi</span>
                            <span style={styles.statValue}>{formatCurrency(dividendReport.total_dividend_amount)}</span>
                        </div>
                        <div style={styles.statItem}>
                            <span style={styles.statLabel}>Số nhân viên là cổ đông</span>
                            <span style={styles.statValue}>{dividendReport.employee_shareholders}</span>
                        </div>
                    </div>
                ) : <p>Lỗi tải báo cáo Cổ tức.</p>}
            </div>

        </motion.div>
    );
}

// --- STYLES ĐÃ CẬP NHẬT ---
const styles = {
    gridContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px',
    },
    card: {
        backgroundColor: 'var(--card-bg)', // Dùng var
        border: '1px solid var(--border-color)', // Dùng var
        padding: '15px 20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    statItem: {
        marginBottom: '20px',
    },
    statLabel: {
        fontSize: '0.9em',
        color: 'var(--text-color-secondary)', // Dùng var
        display: 'block',
    },
    statValue: {
        fontSize: '1.8em',
        fontWeight: 'bold',
        color: 'var(--text-color)', // Dùng var
    },
    dividendGrid: {
        display: 'flex',
        gap: '30px',
        color: 'var(--text-color)', // Dùng var
    },
    skeletonItem: {
        backgroundColor: '#e0e0e0', // Màu cơ bản
        borderRadius: '4px',
        animation: 'pulse 1.5s infinite ease-in-out',
    }
};

// --- CSS ĐỘNG ĐÃ CẬP NHẬT ---
(function() {
    const styleId = 'reports-styles';
    if (document.getElementById(styleId)) {
        document.getElementById(styleId).remove();
    }
    const styleSheet = document.createElement("style");
    styleSheet.id = styleId;
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        @keyframes pulse {
            0% { background-color: #e0e0e0; }
            50% { background-color: #f0f0f0; }
            100% { background-color: #e0e0e0; }
        }
        /* Dark skeleton */
        body.theme-dark .skeletonItem {
            background-color: #333;
            opacity: 0.5;
            animation-name: pulse-dark;
        }
        @keyframes pulse-dark {
            0%{background-color:#333;opacity:.5}
            50%{background-color:#444;opacity:.7}
            100%{background-color:#333;opacity:.5}
        }
        /* Đảm bảo text của Recharts dùng biến CSS */
        .recharts-text {
            fill: var(--text-color-secondary) !important;
        }
    `;
    document.head.appendChild(styleSheet);
})();

export default Reports;