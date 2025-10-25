// frontend/src/components/ResetPasswordModal.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion'; // <-- Thêm import

const ResetPasswordModal = ({ isOpen, onClose, onSuccess, userData }) => {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewPassword('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.trim().length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.put(`/users/${userData.id}/password`, { new_password: newPassword });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Đặt lại mật khẩu thất bại.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !userData) return null;

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
        <h2 style={styles.header}>Đặt lại mật khẩu cho:</h2>
        <p style={styles.emailText}>{userData.email}</p>

        {error && <p style={styles.errorText}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Mật khẩu mới:</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              required
              style={styles.input}
              placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
            />
          </div>
          <div style={styles.buttonGroup}>
            <button type="button" onClick={onClose} disabled={loading} style={{...styles.button, ...styles.cancelButton}}>
              Hủy
            </button>
            <button type="submit" disabled={loading} style={{...styles.button, ...styles.submitButton}}>
              {loading ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- STYLES (Giống hệt SetRoleModal) ---
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
    marginBottom: '5px',
  },
  emailText: {
    fontSize: '1.1em',
    fontWeight: 'bold',
    color: '#007bff',
    marginTop: '-10px',
    marginBottom: '20px',
    wordBreak: 'break-all',
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
    backgroundColor: '#ffc107', // Warning/Yellow
    color: '#333',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    color: '#333',
    border: '1px solid #ccc',
  }
};

export default ResetPasswordModal;