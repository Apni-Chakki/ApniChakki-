import { useState, Suspense, useEffect, useRef } from 'react';
import { AdminSidebar } from '../pages/admin/AdminSidebar';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { Menu, Loader2, Bell, X } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { API_BASE_URL, SOCKET_URL } from '../config';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { PageLoader } from '../components/common/PageLoader';

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const initial = user?.name?.charAt(0)?.toUpperCase() || 'A';
  const notifRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [storeName, setStoreName] = useState('Admin');
  const [lastNotificationId, setLastNotificationId] = useState(null);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    if (!showNotifications) return;
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showNotifications]);

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
        const notifs = data.notifications || [];
        setNotifications(notifs);

        // Count unread based on local storage and backend status
        const readAdminIds = (JSON.parse(localStorage.getItem('read_admin_notifications') || '[]')).map(String);
        const unreadList = notifs.filter(n => !readAdminIds.includes(String(n.id)) && n.is_read == 0);
        setUnreadCount(unreadList.length);

        if (notifs.length > 0) {
          const maxId = Math.max(...notifs.map(n => parseInt(n.id) || 0));
          
          setLastNotificationId(prev => {
            if (prev !== null && maxId > prev) {
              const newUnread = notifs.filter(n => (parseInt(n.id) || 0) > prev && !readAdminIds.includes(String(n.id)) && n.is_read == 0 && n.type !== 'driver_status');
              newUnread.forEach(n => {
                toast.info(n.title, {
                  description: n.message,
                  action: {
                    label: 'View',
                    onClick: () => handleNotificationNavigation(n)
                  }
                });
              });
            }
            return maxId;
          });
        }
      }
    } catch (error) {
      console.error("Could not load admin notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchNotifications();
      }
    }, 12000); // Check every 12 seconds
    
    const handleFocus = () => fetchNotifications();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  // Real-time driver status notifications via Socket.io
  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_SOCKET === 'true' && SOCKET_URL) {
      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        timeout: 8000,
      });

      socket.on('driver:status_changed', (data) => {
        fetchNotifications();
        if (data) {
          const isAct = data.isActive;
          const name = data.driver_name || 'Driver';
          if (isAct) {
            toast.success(`🟢 Rider Online: ${name} is Active!`, {
              description: `Rider ${name} is now available for delivery assignments.`,
              action: {
                label: 'View',
                onClick: () => navigate('/admin/delivery')
              }
            });
          } else {
            toast.warning(`🔴 Rider Emergency: ${name} is Inactive!`, {
              description: `Rider ${name} went Off Duty / Emergency. Will not receive new orders.`,
              action: {
                label: 'View',
                onClick: () => navigate('/admin/delivery')
              }
            });
          }
        }
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [navigate]);

  const handleNotificationClick = async () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState) {
      // Immediately reset badge counter to 0 on click
      setUnreadCount(0);

      const currentIds = notifications.map(n => String(n.id));
      const readAdminIds = (JSON.parse(localStorage.getItem('read_admin_notifications') || '[]')).map(String);
      const allRead = Array.from(new Set([...readAdminIds, ...currentIds]));
      localStorage.setItem('read_admin_notifications', JSON.stringify(allRead));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));

      try {
        await fetch(`${API_BASE_URL}/admin/get_admin_notifications.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_read' })
        });
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
    } else if (notif.type === 'driver_status') {
      navigate('/admin/delivery');
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
              <button onClick={handleNotificationClick} className="relative p-2 rounded-full hover:bg-muted/50 transition-colors" aria-label="Admin Notifications">
                <Bell className="h-5 w-5 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 bg-red-600 text-white flex items-center justify-center rounded-full text-[10px] font-bold z-10 pointer-events-none">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <>
                  {/* Invisible backdrop for easy tap to close on mobile */}
                  <div
                    className="fixed inset-0 z-[95] sm:hidden"
                    onClick={() => setShowNotifications(false)}
                    aria-hidden="true"
                  />
                  <div
                    ref={notifRef}
                    className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[380px] max-w-[calc(100vw-24px)] bg-card border border-border rounded-2xl sm:rounded-xl shadow-2xl z-[100] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="p-3.5 sm:p-4 border-b bg-muted/20 flex justify-between items-center shrink-0">
                      <h3 className="font-bold text-sm sm:text-base text-foreground">{t('Admin Notifications')}</h3>
                      <button 
                        onClick={() => setShowNotifications(false)} 
                        className="hover:bg-muted p-1.5 rounded-full transition-colors text-muted-foreground hover:text-foreground"
                        aria-label="Close Notifications"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="max-h-[60vh] sm:max-h-[350px] overflow-y-auto w-full custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">{t('No new notifications')}</div>
                      ) : (
                        notifications.map(notif => {
                          const readAdminIds = (JSON.parse(localStorage.getItem('read_admin_notifications') || '[]')).map(String);
                          const isRead = notif.is_read == 1 || readAdminIds.includes(String(notif.id));
                          return (
                            <div
                              key={notif.id}
                              onClick={() => handleNotificationNavigation(notif)}
                              className={`p-3.5 sm:p-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors flex items-start gap-3 cursor-pointer ${isRead ? 'opacity-75' : 'bg-primary/5'}`}
                            >
                              <div className="mt-1 shrink-0">
                                <div className={`h-2.5 w-2.5 rounded-full ${isRead ? 'bg-transparent' : 'bg-red-500'}`}></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-xs sm:text-sm text-foreground mb-1 leading-snug">{notif.title}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed break-words">{notif.message}</p>
                                <p className="text-[10px] text-muted-foreground/70 mt-1.5 font-medium">
                                  {new Date(notif.created_at).toLocaleDateString()} {t('at')} {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
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





