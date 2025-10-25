// frontend/src/components/EditSalaryModal.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion';

const EditSalaryModal = ({ isOpen, onClose, onSuccess, salaryData }) => {
  const [formData, setFormData] = useState({
    BaseSalary: 0,
    Bonus: 0,
    Deductions: 0,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (salaryData) {
      setFormData({
        BaseSalary: salaryData.BaseSalary || 0,
        Bonus: salaryData.Bonus || 0,
        Deductions: salaryData.Deductions || 0,
      });
      setError('');
    }
  }, [salaryData]);

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
    const updateData = {
      BaseSalary: parseFloat(formData.BaseSalary),
      Bonus: parseFloat(formData.Bonus),
      Deductions: parseFloat(formData.Deductions),
    };
    try {
      await api.put(`/payroll/salaries/${salaryData.SalaryID}`, updateData);
      onSuccess();
    } catch (err) {
      console.error('Failed to update salary', err);
      setError(err.response?.data?.detail || 'Cập nhật lương thất bại.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !salaryData) {
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
        <h2 style={styles.header}>Sửa Lương (ID: {salaryData.SalaryID})</h2>
        <p style={styles.subHeader}>Tháng: {salaryData.SalaryMonth}</p>

        {error && <p style={styles.errorText}>{error}</p>}
        
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Lương cơ bản:</label>
            <input type="number" step="0.01" name="BaseSalary" value={formData.BaseSalary} onChange={handleChange} required style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Thưởng:</label>
            <input type="number" step="0.01" name="Bonus" value={formData.Bonus} onChange={handleChange} style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Khấu trừ:</label>
            <input type="number" step="0.01" name="Deductions" value={formData.Deductions} onChange={handleChange} style={styles.input} />
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
      </motion.div>
    </motion.div>
  );
};

// --- STYLES NÂNG CẤP ---
const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff', padding: '20px 25px', borderRadius: '8px',
    width: '100%', maxWidth: '450px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },
  header: {
    marginTop: 0,
    marginBottom: '10px', // <-- SỬA Ở ĐÂY
  },
  subHeader: {
    fontSize: '0.9em',
    color: '#666',
    marginTop: '-5px', // <-- SỬA Ở ĐÂY
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '15px',
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

export default EditSalaryModal;