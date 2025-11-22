import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

// Helper format thời gian
const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('vi-VN');
};

function SystemAdmin() {
    // State cho Logs
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // State cho Config
    const [configs, setConfigs] = useState({
        leave_warning_threshold: '',
        salary_discrepancy_threshold: ''
    });
    const [loadingConfig, setLoadingConfig] = useState(false);

    // --- FETCH DATA ---
    const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
            const res = await api.get('/system/logs?limit=20');
            setLogs(res.data);
        } catch (error) {
            console.error("Failed to fetch logs", error);
            toast.error("Không thể tải nhật ký hoạt động.");
        } finally {
            setLoadingLogs(false);
        }
    };

    const fetchConfigs = async () => {
        try {
            const res = await api.get('/system/config');
            // Chuyển mảng config [{key, value}, ...] thành object {key: value}
            const configMap = {};
            res.data.forEach(item => {
                configMap[item.key] = item.value;
            });
            setConfigs(prev => ({ ...prev, ...configMap }));
        } catch (error) {
            console.error("Failed to fetch configs", error);
        }
    };

    useEffect(() => {
        fetchLogs();
        fetchConfigs();
    }, []);

    // --- HANDLERS ---
    const handleConfigChange = (e) => {
        const { name, value } = e.target;
        setConfigs(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveConfig = async () => {
        setLoadingConfig(true);
        try {
            // Lưu từng config (hoặc backend có thể hỗ trợ bulk update)
            await Promise.all([
                api.put('/system/config/leave_warning_threshold', { value: configs.leave_warning_threshold }),
                api.put('/system/config/salary_discrepancy_threshold', { value: configs.salary_discrepancy_threshold })
            ]);
            toast.success("Đã lưu cấu hình thành công!");
            // Refresh logs để thấy hành động update
            fetchLogs();
        } catch (error) {
            toast.error("Lưu cấu hình thất bại.");
        } finally {
            setLoadingConfig(false);
        }
    };

    return (
        <div style={{ padding: '20px', color: 'var(--text-color)' }}>
            <h2 style={{ color: 'var(--text-color)' }}>Quản trị Hệ thống</h2>
            
            {/* Status Cards (Giả lập trạng thái kết nối - Thực tế cần API check health) */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
                <div style={styles.statusCard}>
                    <div style={{fontSize: '2em'}}>🛢️</div>
                    <div>
                        <h4>SQL Server (Human)</h4>
                        <span style={{color: '#00e676', fontWeight: 'bold'}}>Connected</span>
                        <div style={{fontSize: '0.8em', opacity: 0.7}}>Latency: 24ms</div>
                    </div>
                </div>
                <div style={styles.statusCard}>
                    <div style={{fontSize: '2em'}}>🐬</div>
                    <div>
                        <h4>MySQL (Payroll)</h4>
                        <span style={{color: '#00e676', fontWeight: 'bold'}}>Connected</span>
                        <div style={{fontSize: '0.8em', opacity: 0.7}}>Latency: 35ms</div>
                    </div>
                </div>
                <div style={styles.statusCard}>
                    <div style={{fontSize: '2em'}}>🔄</div>
                    <div>
                        <h4>Đồng bộ lần cuối</h4>
                        <span style={{fontWeight: 'bold'}}>Vừa xong</span>
                        <div style={{fontSize: '0.8em', opacity: 0.7}}>Tự động</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                
                {/* --- AUDIT LOGS SECTION --- */}
                <div style={{ flex: 2, minWidth: '400px', background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h3 style={{margin:0, color: 'var(--text-color)'}}>Nhật ký Hoạt động (Audit Logs)</h3>
                        <button onClick={fetchLogs} style={styles.refreshButton}>🔄 Làm mới</button>
                    </div>
                    
                    <div style={{overflowX: 'auto'}}>
                        <table style={{width: '100%', marginTop: '15px', borderCollapse:'collapse', fontSize: '0.9em'}}>
                            <thead>
                                <tr style={{textAlign: 'left', color: 'var(--text-color-secondary)', borderBottom:'1px solid var(--border-color)'}}>
                                    <th style={{padding:'10px'}}>Thời gian</th>
                                    <th style={{padding:'10px'}}>Hành động</th>
                                    <th style={{padding:'10px'}}>Đối tượng</th>
                                    <th style={{padding:'10px'}}>Chi tiết</th>
                                    <th style={{padding:'10px'}}>User</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingLogs ? (
                                    <tr><td colSpan="5" style={{padding:'20px', textAlign:'center'}}>Đang tải...</td></tr>
                                ) : logs.length > 0 ? (
                                    logs.map(log => (
                                        <tr key={log.id} style={{borderBottom:'1px solid var(--border-color)', color: 'var(--text-color)'}}>
                                            <td style={{padding:'10px'}}>{formatDate(log.timestamp)}</td>
                                            <td style={{padding:'10px'}}>
                                                <span style={getActionStyle(log.action)}>{log.action}</span>
                                            </td>
                                            <td style={{padding:'10px'}}>{log.target || '-'}</td>
                                            <td style={{padding:'10px'}}>{log.details}</td>
                                            <td style={{padding:'10px', fontSize:'0.85em', color:'var(--text-color-secondary)'}}>{log.user_email}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="5" style={{padding:'20px', textAlign:'center'}}>Chưa có nhật ký nào.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {/* --- CONFIG SECTION --- */}
                <div style={{ flex: 1, minWidth: '300px', background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <h3 style={{marginTop:0, color: 'var(--text-color)'}}>⚙️ Cấu hình Hệ thống</h3>
                    
                    <div style={{marginBottom: '15px'}}>
                        <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', color: 'var(--text-color)'}}>Cảnh báo nghỉ phép</label>
                        <p style={{fontSize:'0.8em', color:'var(--text-color-secondary)', margin:'0 0 5px 0'}}>Ngưỡng cảnh báo (ngày/năm)</p>
                        <input 
                            type="number" 
                            name="leave_warning_threshold"
                            value={configs.leave_warning_threshold}
                            onChange={handleConfigChange}
                            placeholder="VD: 12"
                            style={styles.input} 
                        />
                    </div>

                    <div style={{marginBottom: '20px'}}>
                        <label style={{fontWeight:'bold', display:'block', marginBottom:'5px', color: 'var(--text-color)'}}>Sai lệch lương</label>
                        <p style={{fontSize:'0.8em', color:'var(--text-color-secondary)', margin:'0 0 5px 0'}}>Ngưỡng cảnh báo (%)</p>
                        <input 
                            type="number" 
                            name="salary_discrepancy_threshold"
                            value={configs.salary_discrepancy_threshold}
                            onChange={handleConfigChange}
                            placeholder="VD: 20"
                            style={styles.input} 
                        />
                    </div>

                    <button 
                        onClick={handleSaveConfig} 
                        disabled={loadingConfig}
                        style={styles.saveButton}
                    >
                        {loadingConfig ? 'Đang lưu...' : 'Lưu Cấu hình'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper style cho badge hành động
const getActionStyle = (action) => {
    const base = { padding: '2px 8px', borderRadius: '4px', fontSize: '0.8em', fontWeight: 'bold' };
    if (action === 'LOGIN') return { ...base, background: '#cfe2ff', color: '#084298' };
    if (action.includes('CREATE')) return { ...base, background: '#d1e7dd', color: '#0f5132' };
    if (action.includes('UPDATE')) return { ...base, background: '#fff3cd', color: '#856404' };
    if (action.includes('DELETE')) return { ...base, background: '#f8d7da', color: '#842029' };
    return { ...base, background: '#e2e3e5', color: '#41464b' };
};

const styles = {
    statusCard: {
        flex: 1, minWidth: '250px', background: '#1e2a38', color: 'white', 
        padding: '20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '15px'
    },
    input: {
        width: '100%', padding: '8px', border:'1px solid var(--input-border-color)', 
        borderRadius:'4px', background: 'var(--input-bg)', color: 'var(--text-color)', boxSizing: 'border-box'
    },
    saveButton: {
        width: '100%', padding: '10px', background: '#0d6efd', color: 'white', 
        border: 'none', borderRadius: '4px', cursor:'pointer', fontWeight: 'bold'
    },
    refreshButton: {
        padding: '5px 10px', background: 'transparent', border: '1px solid var(--border-color)', 
        borderRadius: '4px', cursor: 'pointer', color: 'var(--text-color)'
    }
};

export default SystemAdmin;