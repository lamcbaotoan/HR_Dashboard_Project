// frontend/src/services/authService.js
import api from './api';
import { jwtDecode } from 'jwt-decode';

export const login = async (email, password) => {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);

  try {
    const response = await api.post('/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const { access_token } = response.data;
    
    localStorage.setItem('access_token', access_token);
    
    // Sửa: Giải mã token để lấy thông tin user
    const decoded = jwtDecode(access_token);
    const user = { 
      email: decoded.sub, 
      role: decoded.role,
      emp_id: decoded.emp_id // <-- LƯU EMP_ID
    };
    return user;

  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('access_token');
};

export const getCurrentUser = () => {
  const token = localStorage.getItem('access_token');
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    if (decoded.exp * 1000 < Date.now()) {
      logout();
      return null;
    }
    // Sửa: Trả về đầy đủ thông tin user
    return { 
      email: decoded.sub, 
      role: decoded.role,
      emp_id: decoded.emp_id // <-- TRẢ VỀ EMP_ID
    };
  } catch (error) {
    console.error('Invalid token:', error);
    logout();
    return null;
  }
};