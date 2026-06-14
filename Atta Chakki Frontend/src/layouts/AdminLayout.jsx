import { useState, Suspense, useEffect } from 'react';
import { AdminSidebar } from '../pages/admin/AdminSidebar';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { Menu, Loader2, Bell, X } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const initial = user?.name?.charAt(0)?.toUpperCase() || 'A';

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [storeName, setStoreName] = useState('Admin');

  useEffect(() => {
    fetch(`${API_BASE_URL}/get_store_settings.php`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.settings?.storeName) {
          setStoreName(data.settings.storeName);
        }
      })
      .catch(err => console.error('Could not load store name:', err));
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/get_admin_notifications.php`);
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error("Could not load admin notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0) {
      try {
        await fetch(`${API_BASE_URL}/admin/get_admin_notifications.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_read' })
        });
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleNotificationNavigation = (notif) => {
    setShowNotifications(false);
    if (notif.type === 'new_order') {
      navigate('/admin/today');
    } else if (notif.type === 'pickup_request') {
      navigate('/admin/pickup-requests');
    } else if (notif.type === 'custom_order') {
      navigate('/admin/custom-mix-requests');
    } else if (notif.type === 'contact_message') {
      navigate('/admin/contact-messages');
    }
  };

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
            <span className="admin-topbar-title">{storeName}</span>
          </div>
          <div className="admin-topbar-actions flex items-center gap-4">
            <div className="relative">
              <button onClick={handleNotificationClick} className="relative p-2 rounded-full hover:bg-muted/50 transition-colors">
                <Bell className="h-5 w-5 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 bg-red-600 text-white flex items-center justify-center rounded-full text-[10px] font-bold z-10 pointer-events-none">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div 
                  className="absolute mt-2 bg-card border border-border rounded-xl shadow-2xl z-[100] flex flex-col overflow-hidden" 
                  style={{ 
                    top: 'calc(100% + 5px)', 
                    right: '-10px',
                    width: '380px', 
                    maxWidth: 'calc(100vw - 32px)' 
                  }}
                >
                  <div className="p-4 border-b bg-muted/20 flex justify-between items-center shrink-0">
                    <h3 className="font-semibold text-foreground">Admin Notifications</h3>
                    <button onClick={() => setShowNotifications(false)} className="hover:bg-muted p-1.5 rounded-full transition-colors text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto w-full custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">No new notifications</div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          onClick={() => handleNotificationNavigation(notif)}
                          className={`p-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors flex items-start gap-3 cursor-pointer ${notif.is_read ? 'opacity-75' : 'bg-primary/5'}`}
                        >
                          <div className="mt-1 shrink-0">
                            <div className={`h-2.5 w-2.5 rounded-full ${notif.is_read ? 'bg-transparent' : 'bg-red-500'}`}></div>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-foreground mb-1">{notif.title}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed break-words">{notif.message}</p>
                            <p className="text-[10px] text-muted-foreground/70 mt-2 font-medium">
                              {new Date(notif.created_at).toLocaleDateString()} at {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
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





