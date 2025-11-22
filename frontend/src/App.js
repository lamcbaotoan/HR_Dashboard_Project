// frontend/src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeList from './pages/EmployeeList';
import EmployeeDetail from './pages/EmployeeDetail';
import AdminManagement from './pages/AdminManagement'; // Quản lý tổ chức
import PayrollManagement from './pages/PayrollManagement';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';

// --- IMPORT MỚI ---
import ShareholderManagement from './pages/ShareholderManagement';
import SystemAdmin from './pages/SystemAdmin';
import LeaveApproval from './pages/LeaveApproval';
import MyAttendance from './pages/MyAttendance';
import MyPayslips from './pages/MyPayslips';

const ROLES = {
    ADMIN: 'Admin',
    HR: 'HR Manager',
    PAYROLL: 'Payroll Manager',
    EMPLOYEE: 'Employee'
};

function App() {
    return (
        <>
            <ToastContainer theme="colored" />
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route index element={<Dashboard />} />
                    
                    {/* Các route cũ */}
                    <Route path="employees" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR]}><EmployeeList /></ProtectedRoute>} />
                    <Route path="employees/:id" element={<ProtectedRoute><EmployeeDetail /></ProtectedRoute>} />
                    <Route path="management" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR]}><AdminManagement /></ProtectedRoute>} />
                    <Route path="payroll" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.PAYROLL]}><PayrollManagement /></ProtectedRoute>} />
                    <Route path="reports" element={<ProtectedRoute allowedRoles={[ROLES.HR, ROLES.PAYROLL]}><Reports /></ProtectedRoute>} />
                    <Route path="user-management" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><UserManagement /></ProtectedRoute>} />

                    {/* --- ROUTE MỚI --- */}
                    <Route path="shareholders" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.HR, ROLES.PAYROLL]}><ShareholderManagement /></ProtectedRoute>} />
                    <Route path="system-admin" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><SystemAdmin /></ProtectedRoute>} />
                    <Route path="leave-approval" element={<ProtectedRoute allowedRoles={[ROLES.HR]}><LeaveApproval /></ProtectedRoute>} />
                    
                    {/* Employee Portal */}
                    <Route path="my-attendance" element={<ProtectedRoute allowedRoles={[ROLES.EMPLOYEE]}><MyAttendance /></ProtectedRoute>} />
                    <Route path="my-payslips" element={<ProtectedRoute allowedRoles={[ROLES.EMPLOYEE]}><MyPayslips /></ProtectedRoute>} />
                </Route>
                <Route path="*" element={<h2>404 Not Found</h2>} />
            </Routes>
        </>
    );
}

export default App;