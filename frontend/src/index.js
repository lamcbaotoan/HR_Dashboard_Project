import React from 'react';
import ReactDOM from 'react-dom/client'; // Đảm bảo đã sửa import này
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

const rootElement = document.getElementById('root'); // <-- Lấy phần tử
const root = ReactDOM.createRoot(rootElement); // <-- Sử dụng phần tử đó

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);