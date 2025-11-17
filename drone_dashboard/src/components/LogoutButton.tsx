// src/components/LogoutButton.tsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

/**
 * LogoutButton
 * - Fixed at top-right via portal
 * - Clears stored auth for both sides and redirects to /login
 */
const LogoutButton: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    const ok = window.confirm('Logout and clear camera tokens?');
    if (!ok) return;

    try {
      // clear zustand auth state
      useAuthStore.getState().clear();

      // clear persisted storage (zustand persist)
      try {
        localStorage.removeItem('tesa-auth');
      } catch {
        // ignore
      }
      try {
        sessionStorage.removeItem('tesa-auth');
      } catch {
        // ignore
      }
    } catch (err) {
      console.error('logout error', err);
    }

    navigate('/login', { replace: true });
  };

  if (!mounted) return null;

  const btn = (
    <div className="pointer-events-none fixed top-4 right-4 z-50">
      <button
        type="button"
        onClick={handleLogout}
        className="pointer-events-auto px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white shadow-lg text-sm font-semibold"
        title="Logout"
        aria-label="Logout"
      >
        Logout
      </button>
    </div>
  );

  return createPortal(btn, document.body);
};

export default LogoutButton;
