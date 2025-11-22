// frontend/src/pages/Reports.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

// Import Charts
import EmployeeDeptChart from '../components/charts/EmployeeDeptChart';
import CostStructureChart from '../components/charts/CostStructureChart';

// --- Icons ---
const FilterIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>;
const ExportIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const ChartIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;

function Reports() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Filter States
    const [deptFilter, setDeptFilter] = useState('');
    const [posFilter, setPosFilter] = useState('');
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const [summaryRes, deptRes, posRes] = await Promise.all([
                    api.get('/reports/dashboard-summary'),
                    api.get('/departments/'),
                    api.get('/positions/')
                ]);
                setData(summaryRes.data);
                setDepartments(deptRes.data);
                setPositions(posRes.data);
            } catch (error) {
                console.error(error);
                toast.error("Lỗi tải dữ liệu báo cáo.");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const handleFilter = () => {
        toast.info("Đang lọc dữ liệu... (Tính năng Demo)");
        // Trong thực tế sẽ gọi API với query params
    };

    const handleExport = () => {
        toast.success("Đang xuất báo cáo PDF...");
    };

    if (loading) return <div style={{padding:'40px', textAlign:'center', color:'var(--text-color)'}}>Đang tải báo cáo phân tích...</div>;
    if (!data) return <div style={{padding:'20px'}}>Không có dữ liệu.</div>;

    const { payroll_metrics, financial_metrics } = data;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            style={{ padding: '20px', color: 'var(--text-color)' }}
        >
            {/* HEADER */}
            <div style={{marginBottom: '30px'}}>
                <h1 style={{margin: 0, fontSize:'2rem'}}>Báo cáo Phân tích</h1>
                <p style={{color:'var(--text-color-secondary)', marginTop:'5px'}}>Xin chào, {user?.role}!</p>
            </div>

            {/* MAIN CONTAINER */}
            <div style={styles.reportContainer}>
                {/* TITLE BAR */}
                <div style={styles.titleBar}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <ChartIcon />
                        <h3 style={{margin:0}}>Báo cáo Phân tích Lương & Nhân sự</h3>
                    </div>
                    <button onClick={handleExport} style={styles.btnExport}>
                        <ExportIcon /> Xuất Báo cáo
                    </button>
                </div>

                {/* FILTER BAR */}
                <div style={styles.filterBar}>
                    <div style={styles.filterItem}>
                        <label style={styles.label}>Phòng ban</label>
                        <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} style={styles.select}>
                            <option value="">Tất cả phòng ban</option>
                            {departments.map(d => <option key={d.DepartmentID} value={d.DepartmentID}>{d.DepartmentName}</option>)}
                        </select>
                    </div>
                    <div style={styles.filterItem}>
                        <label style={styles.label}>Chức vụ</label>
                        <select value={posFilter} onChange={e=>setPosFilter(e.target.value)} style={styles.select}>
                            <option value="">Tất cả chức vụ</option>
                            {positions.map(p => <option key={p.PositionID} value={p.PositionID}>{p.PositionName}</option>)}
                        </select>
                    </div>
                    <div style={styles.filterItem}>
                        <label style={styles.label}>Khoảng thời gian</label>
                        <input type="month" value={dateFilter} onChange={e=>setDateFilter(e.target.value)} style={styles.input} />
                    </div>
                    <div style={{alignSelf:'flex-end'}}>
                        <button onClick={handleFilter} style={styles.btnFilter}>
                            <FilterIcon /> Lọc dữ liệu
                        </button>
                    </div>
                </div>

                {/* CHARTS GRID */}
                <div style={styles.chartGrid}>
                    {/* Left Chart */}
                    <div style={styles.chartBox}>
                        <h4 style={{marginTop:0, marginBottom:'20px', color:'var(--text-color)'}}>Phân phối Lương theo Phòng ban</h4>
                        <EmployeeDeptChart 
                            data={payroll_metrics.salary_by_dept.reduce((acc, cur) => ({...acc, [cur.name]: cur.value}), {})}
                            barColor="#00C49F" // Teal color like image
                            textColor="var(--text-color-secondary)"
                        />
                    </div>

                    {/* Right Chart */}
                    <div style={styles.chartBox}>
                        <CostStructureChart 
                            salary={payroll_metrics.total_base_salary}
                            bonus={payroll_metrics.total_bonus}
                            dividend={financial_metrics.total_dividends}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

const styles = {
    reportContainer: {
        backgroundColor: 'var(--card-bg)', // Dark/Light background based on theme
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        padding: '25px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    },
    titleBar: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '25px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px'
    },
    btnExport: {
        display: 'flex', alignItems: 'center', gap: '8px',
        background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px',
        padding: '8px 16px', cursor: 'pointer', fontWeight: '600',
        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
    },
    filterBar: {
        display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px',
        background: 'var(--bg-color)', padding: '15px', borderRadius: '8px' // Lighter background for filter
    },
    filterItem: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: '200px' },
    label: { fontSize: '0.85em', color: 'var(--text-color-secondary)', marginBottom: '5px', fontWeight: 'bold' },
    select: { padding: '10px', borderRadius: '6px', border: '1px solid var(--input-border-color)', background: 'var(--card-bg)', color: 'var(--text-color)' },
    input: { padding: '9px', borderRadius: '6px', border: '1px solid var(--input-border-color)', background: 'var(--card-bg)', color: 'var(--text-color)' },
    btnFilter: {
        display: 'flex', alignItems: 'center', gap: '8px',
        background: '#4b5563', color: 'white', border: 'none', borderRadius: '6px',
        padding: '10px 20px', cursor: 'pointer', fontWeight: '600', height: '38px'
    },
    chartGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '30px'
    },
    chartBox: {
        background: 'var(--card-bg)', // Same as container or slightly different
        padding: '10px', borderRadius: '8px'
    }
};

export default Reports;