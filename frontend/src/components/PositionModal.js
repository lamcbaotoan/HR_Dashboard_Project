// frontend/src/components/PositionModal.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion';

const PositionModal = ({ isOpen, onClose, onSuccess, positionData }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isEditMode = !!positionData;

  useEffect(() => {
    if (isEditMode) setName(positionData.PositionName || '');
    else setName('');
    setError('');
  }, [isOpen, positionData, isEditMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tên chức vụ không được để trống.');
      return;
    }
    setLoading(true);
    setError('');
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
        <h2 style={styles.header}>{isEditMode ? 'Sửa Chức vụ' : 'Thêm Chức vụ mới'}</h2>
        {isEditMode && <p style={styles.subHeader}>ID: {positionData.PositionID}</p>}
        {error && <p style={styles.errorText}>{error}</p>}
        
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Tên Chức vụ:</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              disabled={loading} 
              style={styles.input} 
              required 
            />
          </div>
          <div style={styles.buttonGroup}>
            <button type="button" onClick={onClose} disabled={loading} style={{...styles.button, ...styles.cancelButton}}>
              Hủy
            </button>
            <button type="submit" disabled={loading} style={{...styles.button, ...styles.submitButton}}>
              {loading ? 'Đang lưu...' : (isEditMode ? 'Lưu thay đổi' : 'Thêm mới')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- STYLES (Giống hệt DepartmentModal) ---
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

export default PositionModal;