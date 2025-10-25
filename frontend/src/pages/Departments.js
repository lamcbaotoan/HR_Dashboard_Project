// frontend/src/pages/Departments.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Component Modal dùng chung cho Thêm/Sửa
const DepartmentModal = ({ isOpen, onClose, onSuccess, departmentData }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isEditMode = !!departmentData;

  useEffect(() => {
    setName(isEditMode ? departmentData.DepartmentName : '');
    setError('');
  }, [isOpen, departmentData, isEditMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Tên phòng ban không được để trống.'); return; }
    setLoading(true); setError('');
    try {
      if (isEditMode) {
        await api.put(`/departments/${departmentData.DepartmentID}`, { DepartmentName: name });
      } else {
        await api.post('/departments/', { DepartmentName: name });
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Lưu thất bại.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2>{isEditMode ? 'Sửa Phòng ban' : 'Thêm Phòng ban mới'}</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label>Tên Phòng ban:</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} style={{ width: '95%', padding: '8px' }} required />
          </div>
          <div style={styles.buttonGroup}>
            <button type="submit" disabled={loading}>{loading ? 'Đang lưu...' : (isEditMode ? 'Lưu thay đổi' : 'Thêm mới')}</button>
            <button type="button" onClick={onClose} disabled={loading} style={{ marginLeft: '10px' }}>Hủy</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Component trang chính
function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const response = await api.get('/departments/');
      setDepartments(response.data);
    } catch (err) {
      setError('Không thể tải danh sách phòng ban.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenModal = (dept = null) => { setCurrentItem(dept); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setCurrentItem(null); };
  const handleSuccess = () => { handleCloseModal(); fetchData(); };

  const handleDelete = async (deptId, deptName) => {
    if (window.confirm(`Bạn có chắc muốn xóa phòng ban "${deptName}" không?`)) {
      setError('');
      try {
        await api.delete(`/departments/${deptId}`);
        fetchData();
      } catch (err) {
        setError(err.response?.data?.detail || 'Xóa thất bại. Phòng ban có thể đang được gán cho nhân viên.');
      }
    }
  };

  if (loading && departments.length === 0) return <p>Đang tải...</p>;

  return (
    <div>
      <h2>Quản lý Phòng ban</h2>
      {error && <p style={{ color: 'red', border: '1px solid red', padding: '10px' }}>{error}</p>}
      {isAdmin && <button onClick={() => handleOpenModal(null)} style={{ margin: '10px 0' }}>Thêm Phòng ban mới</button>}
      <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên Phòng ban</th>
            {isAdmin && <th>Hành động</th>}
          </tr>
        </thead>
        <tbody>
          {departments.map(dept => (
            <tr key={dept.DepartmentID}>
              <td>{dept.DepartmentID}</td>
              <td>{dept.DepartmentName}</td>
              {isAdmin && (
                <td>
                  <button onClick={() => handleOpenModal(dept)} style={{ marginRight: '5px' }}>Sửa</button>
                  <button onClick={() => handleDelete(dept.DepartmentID, dept.DepartmentName)} style={{ color: 'red' }}>Xóa</button>
                </td>
              )}
            </tr>
          ))}
          {departments.length === 0 && !loading && (
             <tr><td colSpan={isAdmin ? 3 : 2} style={{textAlign: 'center'}}>Không có phòng ban nào.</td></tr>
          )}
        </tbody>
      </table>
      <DepartmentModal isOpen={isModalOpen} onClose={handleCloseModal} onSuccess={handleSuccess} departmentData={currentItem} />
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#fff', padding: '25px', borderRadius: '8px', minWidth: '400px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
  formGroup: { marginBottom: '15px' },
  buttonGroup: { marginTop: '20px', textAlign: 'right' }
};

export default Departments;