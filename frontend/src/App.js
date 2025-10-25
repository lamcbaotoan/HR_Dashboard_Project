// --- frontend/src/App.js ---

import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import các components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Import các trang (Pages)
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeList from './pages/EmployeeList';
import EmployeeDetail from './pages/EmployeeDetail';
import AdminManagement from './pages/AdminManagement'; // For Quản lý Tổ chức
import PayrollManagement from './pages/PayrollManagement'; // For Quản lý Bảng lương
import Reports from './pages/Reports'; // For Báo cáo
import UserManagement from './pages/UserManagement'; // For Quản lý Tài khoản

// Các vai trò
const ROLES = {
    ADMIN: 'Admin',
    HR: 'HR Manager',
    PAYROLL: 'Payroll Manager',
    EMPLOYEE: 'Employee'
};

function App() {
    const location = useLocation();

    return (
        <>
            {/* Configure Toast Notifications */}
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
            />

            {/* AnimatePresence and Routes */}
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/"
                        element={<ProtectedRoute><Layout /></ProtectedRoute>}
                    >
                        {/* 1. Dashboard */}
                        <Route index element={<Dashboard />} />

                        {/* 2. Quản lý Tài khoản (Moved Up) */}
                        <Route
                            path="user-management"
                            element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><UserManagement /></ProtectedRoute>}
                        />

                        {/* 3. Quản lý Nhân viên */}
                        <Route
                            path="employees"
                            element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR]}><EmployeeList /></ProtectedRoute>}
                        />
                        {/* Keep Employee Detail route close to the list */}
                        <Route
                            path="employees/:id"
                            element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE]}><EmployeeDetail /></ProtectedRoute>}
                        />

                        {/* 4. Quản lý Tổ chức */}
                        <Route
                            path="management" // Assuming this is for AdminManagement (Departments/Positions)
                            element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR]}><AdminManagement /></ProtectedRoute>}
                        />

                        {/* 5. Quản lý Bảng lương */}
                        <Route
                            path="payroll"
                            element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.PAYROLL]}><PayrollManagement /></ProtectedRoute>}
                        />

                        {/* 6. Báo cáo */}
                        <Route
                            path="reports"
                            element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR, ROLES.PAYROLL]}><Reports /></ProtectedRoute>}
                        />

                    </Route>
                    {/* Fallback 404 Route */}
                    <Route path="*" element={<h2>404 Not Found</h2>} />
                </Routes>
            </AnimatePresence>
        </>
    );
}

export default App;