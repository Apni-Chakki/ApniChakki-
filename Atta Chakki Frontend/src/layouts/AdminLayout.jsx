import { useState, Suspense } from 'react';
import { AdminSidebar } from '../pages/admin/AdminSidebar';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { Menu, Loader2 } from 'lucide-react';
import { useAuth } from '../store/AuthContext';

function PageLoader() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
    </div>
  );
}

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const initial = user?.name?.charAt(0)?.toUpperCase() || 'A';

  return (
    <div className="flex bg-background" style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      {/* Mobile overlay */}
      <div
        className={`admin-sidebar-overlay${sidebarOpen ? ' visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="admin-main-content">
        {/* Top header bar */}
        <div className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="admin-mobile-menu-btn"
              style={{ padding: '0.5rem', borderRadius: '0.375rem', display: 'none', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--foreground)' }}
            >
              <Menu style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>
            <span className="admin-topbar-title">Admin</span>
          </div>
          <div className="admin-topbar-actions">
            <LanguageToggle />
            <div className="admin-topbar-avatar" title={user?.name || 'Admin'}>{initial}</div>
          </div>
        </div>

        <main className="admin-main-inner">
          <Suspense fallback={<PageLoader />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}





