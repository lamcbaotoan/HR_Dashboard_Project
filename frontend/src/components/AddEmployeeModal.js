// frontend/src/components/AddEmployeeModal.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion'; // <-- Thêm import

const AddEmployeeModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    FullName: '',
    Email: '',
    DateOfBirth: '',
    HireDate: '',
    DepartmentID: '',
    PositionID: '',
    Status: 'Đang làm việc',
    Gender: '',
    PhoneNumber: '',
    password: '',
  });
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (isOpen) {
        setLoading(true);
        setError('');
        try {
          const [deptRes, posRes] = await Promise.all([
            api.get('/departments/'),
            api.get('/positions/')
          ]);
          setDepartments(deptRes.data);
          setPositions(posRes.data);
          if (deptRes.data.length > 0) {
            setFormData(prev => ({ ...prev, DepartmentID: deptRes.data[0].DepartmentID }));
          }
          if (posRes.data.length > 0) {
            setFormData(prev => ({ ...prev, PositionID: posRes.data[0].PositionID }));
          }
        } catch (err) {
          console.error('Failed to fetch departments/positions', err);
          setError('Không thể tải danh sách phòng ban/chức vụ.');
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!formData.FullName || !formData.Email || !formData.DateOfBirth || !formData.HireDate || !formData.DepartmentID || !formData.PositionID || !formData.password) {
      setError('Vui lòng điền đầy đủ các trường bắt buộc.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/employees/', formData);
      onSuccess();
      setFormData({
        FullName: '', Email: '', DateOfBirth: '', HireDate: '',
        DepartmentID: departments.length > 0 ? departments[0].DepartmentID : '',
        PositionID: positions.length > 0 ? positions[0].PositionID : '',
        Status: 'Đang làm việc', Gender: '', PhoneNumber: '', password: ''
      });
    } catch (err) {
      console.error('Failed to add employee', err);
      setError(err.response?.data?.detail || 'Thêm nhân viên thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    // --- BỌC HIỆU ỨNG FADE CHO OVERLAY ---
    <motion.div
      style={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose} // Cho phép đóng khi click bên ngoài
    >
      {/* --- BỌC HIỆU ỨNG FADE + SCALE CHO MODAL --- */}
      <motion.div
        style={styles.modal}
        initial={{ opacity: 0, scale: 0.9, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()} // Ngăn click bên trong modal
      >
        <h2 style={styles.header}>Thêm Nhân viên mới</h2>
        {error && <p style={styles.errorText}>{error}</p>}
        
        <form onSubmit={handleSubmit}>
          {/* --- SỬA LẠI GRID ĐỂ ĐẸP HƠN --- */}
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Họ tên (*):</label>
              <input type="text" name="FullName" value={formData.FullName} onChange={handleChange} required style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email (*):</label>
              <input type="email" name="Email" value={formData.Email} onChange={handleChange} required style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Ngày sinh (*):</label>
              <input type="date" name="DateOfBirth" value={formData.DateOfBirth} onChange={handleChange} required style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Ngày vào làm (*):</label>
              <input type="date" name="HireDate" value={formData.HireDate} onChange={handleChange} required style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Giới tính:</label>
              <select name="Gender" value={formData.Gender} onChange={handleChange} style={styles.input}>
                <option value="">Chọn giới tính</option>
                <option value="Male">Nam</option>
                <option value="Female">Nữ</option>
                <option value="Other">Khác</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>SĐT:</label>
              <input type="tel" name="PhoneNumber" value={formData.PhoneNumber} onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Phòng ban (*):</label>
              <select name="DepartmentID" value={formData.DepartmentID} onChange={handleChange} required disabled={loading} style={styles.input}>
                {departments.length === 0 && !loading && <option value="">Không có phòng ban</option>}
                {departments.map(dept => (
                  <option key={dept.DepartmentID} value={dept.DepartmentID}>{dept.DepartmentName}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Chức vụ (*):</label>
              <select name="PositionID" value={formData.PositionID} onChange={handleChange} required disabled={loading} style={styles.input}>
                {positions.length === 0 && !loading && <option value="">Không có chức vụ</option>}
                {positions.map(pos => (
                  <option key={pos.PositionID} value={pos.PositionID}>{pos.PositionName}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Trạng thái (*):</label>
              <select name="Status" value={formData.Status} onChange={handleChange} required style={styles.input}>
                <option value="Đang làm việc">Đang làm việc</option>
                <option value="Nghỉ phép">Nghỉ phép</option>
                <option value="Thử việc">Thử việc</option>
                <option value="Thực tập">Thực tập</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Mật khẩu (*):</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required style={styles.input} />
              <small> (Tài khoản sẽ dùng mật khẩu này để đăng nhập)</small>
            </div>
          </div>

          <div style={styles.buttonGroup}>
            <button type="button" onClick={onClose} disabled={loading} style={{...styles.button, ...styles.cancelButton}}>
              Hủy
            </button>
            <button type="submit" disabled={loading} style={{...styles.button, ...styles.submitButton}}>
              {loading ? 'Đang thêm...' : 'Thêm'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- CẬP NHẬT CSS STYLES ---
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    padding: '20px 25px',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '700px', // Tăng chiều rộng cho form 2 cột
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },
  header: {
    marginTop: 0,
    marginBottom: '20px',
    borderBottom: '1px solid #eee',
    paddingBottom: '10px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr', // Chia 2 cột
    gap: '15px 20px', // Khoảng cách giữa các ô
  },
  formGroup: {
    marginBottom: '5px',
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontWeight: 'bold',
    marginBottom: '5px',
    fontSize: '0.9em',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box', // Đảm bảo padding không làm vỡ layout
  },
  errorText: {
    color: '#D8000C',
    backgroundColor: '#FFD2D2',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  buttonGroup: {
    marginTop: '20px',
    textAlign: 'right',
    borderTop: '1px solid #eee',
    paddingTop: '15px',
  },
  button: {
    padding: '8px 15px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginLeft: '10px',
  },
  submitButton: {
    backgroundColor: '#28a745', // Green
    color: 'white',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    color: '#333',
    border: '1px solid #ccc',
  }
};

export default AddEmployeeModal;