
import React from 'react';
import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';

const AuthLayout: React.FC = () => {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
};

export default AuthLayout;
