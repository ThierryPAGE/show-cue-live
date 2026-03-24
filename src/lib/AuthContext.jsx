import React from 'react';

// Auth removed — app runs without authentication
export const AuthProvider = ({ children }) => <>{children}</>;

export const useAuth = () => ({
  user: null,
  isAuthenticated: false,
  isLoadingAuth: false,
  isLoadingPublicSettings: false,
  authError: null,
  appPublicSettings: null,
  logout: () => {},
  navigateToLogin: () => {},
  checkAppState: () => {},
});
