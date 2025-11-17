import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { useAuthStore } from './store/useAuthStore';
import React from 'react';
import LogoutButton from './components/LogoutButton';


function isAuthed() {
  const s = useAuthStore.getState();
  const defOk = !!(s.defence?.cameraId && s.defence?.token);
  const offOk = !!(s.offence?.cameraId && s.offence?.token);
  return defOk && offOk;
}

function RequireAuth({ children }: { children: React.ReactElement }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <DashboardPage />
      </RequireAuth>
    ),
  },
]);
