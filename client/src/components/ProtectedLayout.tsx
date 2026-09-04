import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/States';
import BottomNav from '../components/BottomNav';
import AdminLayout from '../components/admin/AdminLayout';
import type { Role } from '../types';

export function ProtectedLayout({ role }: { role: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState label="Checking your session" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // A student must never reach admin-only screens (and vice versa) even via direct URL.
  if (user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />;
  }

  // Admin gets a persistent desktop sidebar shell (hidden below lg, where it
  // falls back to the same stacked-page + bottom-nav pattern as Student).
  if (role === 'admin') {
    return (
      <div className="min-h-screen">
        <AdminLayout>
          <Outlet />
        </AdminLayout>
        <BottomNav role={role} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Outlet />
      <BottomNav role={role} />
    </div>
  );
}

export function RequireGuest({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />;
  }
  return <>{children}</>;
}
