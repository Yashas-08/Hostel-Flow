import type { ReactNode } from 'react';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lg:flex lg:min-h-screen lg:items-start">
      <AdminSidebar />
      <div className="min-w-0 lg:flex-1">{children}</div>
    </div>
  );
}
