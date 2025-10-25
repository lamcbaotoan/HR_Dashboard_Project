import axios from 'axios';
console.log('API Base URL:', process.env.REACT_APP_API_BASE_URL);
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
});

// Interceptor: Tự động đính kèm JWT token vào mỗi request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor: Xử lý lỗi 401 (Unauthorized)
// Nếu token hết hạn, tự động logout và đá về trang login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token');
      // Chuyển hướng về trang login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;