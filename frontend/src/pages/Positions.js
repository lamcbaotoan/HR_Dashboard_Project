// frontend/src/pages/Positions.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Component Modal dùng chung cho Thêm/Sửa
const PositionModal = ({ isOpen, onClose, onSuccess, positionData }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isEditMode = !!positionData;

  useEffect(() => {
    setName(isEditMode ? positionData.PositionName : '');
    setError('');
  }, [isOpen, positionData, isEditMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Tên chức vụ không được để trống.'); return; }
    setLoading(true); setError('');
    try {
      if (isEditMode) {
        await api.put(`/positions/${positionData.PositionID}`, { PositionName: name });
      } else {
        await api.post('/positions/', { PositionName: name });
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
        <h2>{isEditMode ? 'Sửa Chức vụ' : 'Thêm Chức vụ mới'}</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label>Tên Chức vụ:</label>
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
function Positions() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const response = await api.get('/positions/');
      setPositions(response.data);
    } catch (err) {
      setError('Không thể tải danh sách chức vụ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenModal = (pos = null) => { setCurrentItem(pos); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setCurrentItem(null); };
  const handleSuccess = () => { handleCloseModal(); fetchData(); };

  const handleDelete = async (posId, posName) => {
    if (window.confirm(`Bạn có chắc muốn xóa chức vụ "${posName}" không?`)) {
      setError('');
      try {
        await api.delete(`/positions/${posId}`);
        fetchData();
      } catch (err) {
        setError(err.response?.data?.detail || 'Xóa thất bại. Chức vụ có thể đang được gán cho nhân viên.');
      }
    }
  };

  if (loading && positions.length === 0) return <p>Đang tải...</p>;

  return (
    <div>
      <h2>Quản lý Chức vụ</h2>
      {error && <p style={{ color: 'red', border: '1px solid red', padding: '10px' }}>{error}</p>}
      {isAdmin && <button onClick={() => handleOpenModal(null)} style={{ margin: '10px 0' }}>Thêm Chức vụ mới</button>}
      <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên Chức vụ</th>
            {isAdmin && <th>Hành động</th>}
          </tr>
        </thead>
        <tbody>
          {positions.map(pos => (
            <tr key={pos.PositionID}>
              <td>{pos.PositionID}</td>
              <td>{pos.PositionName}</td>
              {isAdmin && (
                <td>
                  <button onClick={() => handleOpenModal(pos)} style={{ marginRight: '5px' }}>Sửa</button>
                  <button onClick={() => handleDelete(pos.PositionID, pos.PositionName)} style={{ color: 'red' }}>Xóa</button>
                </td>
              )}
            </tr>
          ))}
          {positions.length === 0 && !loading && (
             <tr><td colSpan={isAdmin ? 3 : 2} style={{textAlign: 'center'}}>Không có chức vụ nào.</td></tr>
          )}
        </tbody>
      </table>
      <PositionModal isOpen={isModalOpen} onClose={handleCloseModal} onSuccess={handleSuccess} positionData={currentItem} />
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#fff', padding: '25px', borderRadius: '8px', minWidth: '400px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
  formGroup: { marginBottom: '15px' },
  buttonGroup: { marginTop: '20px', textAlign: 'right' }
};

export default Positions;