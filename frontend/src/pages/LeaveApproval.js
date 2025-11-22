import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

function LeaveApproval() {
    const [requests, setRequests] = useState([]);

    const fetchRequests = () => {
        api.get('/leave-requests/').then(res => setRequests(res.data)).catch(console.error);
    };

    useEffect(() => { fetchRequests(); }, []);

    const handleStatus = async (id, status) => {
        try {
            await api.put(`/leave-requests/${id}/status`, { Status: status });
            toast.success(`Đã ${status === 'Approved' ? 'duyệt' : 'từ chối'} yêu cầu.`);
            fetchRequests();
        } catch (err) {
            toast.error("Có lỗi xảy ra.");
        }
    };

    const pendingRequests = requests.filter(r => r.Status === 'Pending');
    const historyRequests = requests.filter(r => r.Status !== 'Pending');

    return (
        <div style={{ padding: '20px' }}>
            <h2>Quản lý Nghỉ phép & Chấm công</h2>
            
            <div style={{background:'white', padding:'20px', borderRadius:'8px', marginBottom:'20px', boxShadow:'0 2px 4px rgba(0,0,0,0.05)'}}>
                <h3 style={{marginTop:0}}>Yêu cầu Nghỉ phép Chờ duyệt</h3>
                <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <thead>
                        <tr style={{textAlign:'left', color:'#666', borderBottom:'1px solid #eee'}}>
                            <th style={{padding:'10px'}}>Nhân viên</th>
                            <th style={{padding:'10px'}}>Loại nghỉ</th>
                            <th style={{padding:'10px'}}>Thời gian</th>
                            <th style={{padding:'10px'}}>Lý do</th>
                            <th style={{padding:'10px'}}>Phê duyệt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingRequests.map(req => (
                            <tr key={req.RequestID} style={{borderBottom:'1px solid #eee'}}>
                                <td style={{padding:'10px'}}><strong>{req.EmployeeName}</strong><br/><small>{req.DepartmentName}</small></td>
                                <td>{req.LeaveType}</td>
                                <td>{req.StartDate} - {req.EndDate}</td>
                                <td>{req.Reason}</td>
                                <td>
                                    <button onClick={() => handleStatus(req.RequestID, 'Approved')} style={{padding:'5px 10px', background:'#198754', color:'white', border:'none', borderRadius:'4px', marginRight:'5px', cursor:'pointer'}}>✓ Duyệt</button>
                                    <button onClick={() => handleStatus(req.RequestID, 'Rejected')} style={{padding:'5px 10px', background:'#dc3545', color:'white', border:'none', borderRadius:'4px', cursor:'pointer'}}>✕ Từ chối</button>
                                </td>
                            </tr>
                        ))}
                        {pendingRequests.length === 0 && <tr><td colSpan="5" style={{padding:'20px', textAlign:'center', color:'#999'}}>Không có yêu cầu nào đang chờ.</td></tr>}
                    </tbody>
                </table>
            </div>

            <div style={{background:'white', padding:'20px', borderRadius:'8px', boxShadow:'0 2px 4px rgba(0,0,0,0.05)'}}>
                <h3 style={{marginTop:0}}>Lịch sử Duyệt gần đây</h3>
                <table style={{width:'100%'}}>
                    <tbody>
                        {historyRequests.map(req => (
                            <tr key={req.RequestID} style={{borderBottom:'1px solid #eee'}}>
                                <td style={{padding:'10px'}}>{req.EmployeeName}</td>
                                <td>{req.StartDate}</td>
                                <td><span style={{padding:'3px 8px', borderRadius:'10px', background: req.Status === 'Approved' ? '#d1e7dd' : '#f8d7da', color: req.Status === 'Approved' ? '#0f5132' : '#842029', fontSize:'0.85em'}}>{req.Status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
export default LeaveApproval;