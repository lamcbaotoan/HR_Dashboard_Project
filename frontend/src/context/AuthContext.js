import React, { createContext, useState, useContext } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(authService.getCurrentUser());

  const handleLogin = async (email, password) => {
    try {
      const loggedInUser = await authService.login(email, password);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (error) {
      setUser(null);
      throw error;
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    login: handleLogin,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};