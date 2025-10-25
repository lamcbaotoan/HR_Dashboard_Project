// frontend/src/components/EditEmployeeModal.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion'; // <-- Thêm import

const EditEmployeeModal = ({ isOpen, onClose, onSuccess, employeeData }) => {
  const [formData, setFormData] = useState({
    FullName: '',
    DepartmentID: '',
    PositionID: '',
    Status: '',
    PhoneNumber: '',
  });
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDataAndPopulateForm = async () => {
      if (isOpen && employeeData) {
        setLoading(true);
        setError('');
        try {
          const [deptRes, posRes] = await Promise.all([
            api.get('/departments/'),
            api.get('/positions/')
          ]);
          setDepartments(deptRes.data);
          setPositions(posRes.data);
          setFormData({
            FullName: employeeData.FullName || '',
            DepartmentID: employeeData.department?.DepartmentID || '',
            PositionID: employeeData.position?.PositionID || '',
            Status: employeeData.Status || '',
            PhoneNumber: employeeData.PhoneNumber || '',
          });
        } catch (err) {
          console.error('Failed to fetch departments/positions for edit', err);
          setError('Không thể tải dữ liệu cần thiết để sửa.');
        } finally {
          setLoading(false);
        }
      }
    };
    fetchDataAndPopulateForm();
  }, [isOpen, employeeData]);

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
    const updateData = {
      FullName: formData.FullName,
      Status: formData.Status,
      PhoneNumber: formData.PhoneNumber || null,
      DepartmentID: parseInt(formData.DepartmentID, 10),
      PositionID: parseInt(formData.PositionID, 10),
    };
    if (isNaN(updateData.DepartmentID) || isNaN(updateData.PositionID)) {
      setError('Phòng ban hoặc Chức vụ không hợp lệ.');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/employees/${employeeData.EmployeeID}`, updateData);
      onSuccess();
    } catch (err) {
      console.error('Failed to update employee', err);
      setError(err.response?.data?.detail || 'Cập nhật nhân viên thất bại.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <motion.div
      style={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        style={styles.modal}
        initial={{ opacity: 0, scale: 0.9, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={styles.header}>Sửa thông tin Nhân viên (ID: {employeeData?.EmployeeID})</h2>
        {error && <p style={styles.errorText}>{error}</p>}

        {loading && !error ? <p>Đang tải dữ liệu...</p> : (
          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Họ tên:</label>
              <input type="text" name="FullName" value={formData.FullName} onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email:</label>
              <input type="email" value={employeeData.Email || ''} disabled style={{...styles.input, ...styles.inputDisabled}} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>SĐT:</label>
              <input type="tel" name="PhoneNumber" value={formData.PhoneNumber} onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Phòng ban:</label>
              <select name="DepartmentID" value={formData.DepartmentID} onChange={handleChange} required style={styles.input}>
                {departments.map(dept => (
                  <option key={dept.DepartmentID} value={dept.DepartmentID}>{dept.DepartmentName}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Chức vụ:</label>
              <select name="PositionID" value={formData.PositionID} onChange={handleChange} required style={styles.input}>
                {positions.map(pos => (
                  <option key={pos.PositionID} value={pos.PositionID}>{pos.PositionName}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Trạng thái:</label>
              <select name="Status" value={formData.Status} onChange={handleChange} required style={styles.input}>
                <option value="Đang làm việc">Đang làm việc</option>
                <option value="Nghỉ phép">Nghỉ phép</option>
                <option value="Thử việc">Thử việc</option>
                <option value="Thực tập">Thực tập</option>
              </select>
            </div>

            <div style={styles.buttonGroup}>
              <button type="button" onClick={onClose} disabled={loading} style={{...styles.button, ...styles.cancelButton}}>
                Hủy
              </button>
              <button type="submit" disabled={loading} style={{...styles.button, ...styles.submitButton}}>
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
};

// --- STYLES (Tương tự AddModal, nhưng đơn giản hơn) ---
const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff', padding: '20px 25px', borderRadius: '8px',
    width: '100%', maxWidth: '500px', // Modal này nhỏ hơn
    maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },
  header: {
    marginTop: 0, marginBottom: '20px',
    borderBottom: '1px solid #eee', paddingBottom: '10px',
  },
  formGroup: {
    marginBottom: '15px', // Tăng khoảng cách
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
    boxSizing: 'border-box',
  },
  inputDisabled: {
    backgroundColor: '#f4f4f4',
    color: '#777',
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
    backgroundColor: '#007bff', // Blue
    color: 'white',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    color: '#333',
    border: '1px solid #ccc',
  }
};

export default EditEmployeeModal;