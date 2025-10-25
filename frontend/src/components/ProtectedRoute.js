import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Component này bảo vệ 1 route
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const location = useLocation();

  // 1. Kiểm tra đã đăng nhập chưa
  if (!user) {
    // Nếu chưa, đá về trang login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // 2. Kiểm tra có yêu cầu vai trò (role) không
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Nếu có, nhưng user không có vai trò đó, đá về trang "Unauthorized"
    // (Bạn có thể tạo trang /unauthorized)
    console.warn(`User role '${user.role}' not in allowedRoles:`, allowedRoles);
    return <Navigate to="/" replace />; // Tạm thời đá về Dashboard
  }

  // Nếu ổn, cho phép truy cập
  return children;
};

export default ProtectedRoute;