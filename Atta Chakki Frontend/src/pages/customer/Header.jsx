import { ShoppingCart, Wheat, Package, User, Menu, X, Megaphone, Bell } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Badge } from '../../components/common/badge';
import { Button } from '../../components/common/button';
import { useCart } from '../../store/CartContext';
import { useAuth } from '../../store/AuthContext';
import { LanguageToggle } from '../../components/common/LanguageToggle';
import { useDynamicTranslation } from '../../hooks/useDynamicTranslation';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';

export function Header() {
  const { getTotalItems } = useCart();
  const { user } = useAuth();
  const { t, tDynamic } = useDynamicTranslation();
  const itemCount = getTotalItems();
  const navigate = useNavigate();
  const location = useLocation();
  const [storeName, setStoreName] = useState("Apni Chakki");
  const [settings, setSettings] = useState({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/get_global_notifications.php`);
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
        
        // Count unread based on local storage
        const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
        const unread = data.notifications.filter(n => !readIds.includes(n.id)).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Could not load notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = () => {
    setShowNotificationsDropdown(!showNotificationsDropdown);
    if (!showNotificationsDropdown && unreadCount > 0) {
      const allIds = notifications.map(n => n.id);
      localStorage.setItem('read_notifications', JSON.stringify(allIds));
      setUnreadCount(0);
    }
  };

  const handleNotificationNavigation = (notif) => {
    setShowNotificationsDropdown(false);
    if (notif.type === 'coupon') {
      navigate('/checkout'); // They can use the coupon here
    } else if (notif.type === 'product') {
      navigate('/');
    } else {
      navigate('/');
    }
  };
  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_store_settings.php`);
      const data = await response.json();
      if (data.success && data.settings) {
        if (data.settings.storeName) setStoreName(data.settings.storeName);
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Could not load store settings:", error);
    }
  };

  useEffect(() => {
    fetchSettings();
    const handleSettingsUpdate = () => fetchSettings();
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleCartClick = (e) => {
    if (!user) {
      e.preventDefault();
      toast.info(t('Please log in or sign up to proceed to checkout.'));
      navigate('/login/customer', { state: { from: { pathname: '/checkout' } } });
    }
  };

  const CartIcon = () => (
    <Link to="/checkout" className="relative" onClick={handleCartClick}>
      <Button variant="ghost" size="icon" className="rounded-full px-0 py-0 flex items-center justify-center">
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-success text-success-foreground text-[10px] font-bold">
            {itemCount}
          </Badge>
        )}
      </Button>
    </Link>
  );

  const NotificationIcon = () => (
    <div className="relative inline-flex items-center justify-center">
      <Button variant="ghost" size="icon" className="relative rounded-full h-10 w-10 text-foreground hover:bg-muted" onClick={handleNotificationClick}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute top-0 right-0 h-4 w-4 flex items-center justify-center p-0 bg-red-600 text-white text-[10px] font-bold rounded-full border-none shadow-sm pointer-events-none">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notifications Dropdown */}
      {showNotificationsDropdown && (
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
            <h3 className="font-semibold text-foreground">Notifications</h3>
            <button onClick={() => setShowNotificationsDropdown(false)} className="hover:bg-muted p-1.5 rounded-full transition-colors text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[350px] overflow-y-auto w-full custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">{t('No new notifications')}</div>
            ) : (
              notifications.map(notif => {
                const isRead = JSON.parse(localStorage.getItem('read_notifications') || '[]').includes(notif.id);
                return (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationNavigation(notif)}
                    className={`p-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors flex items-start gap-3 cursor-pointer ${isRead ? 'opacity-75' : 'bg-primary/5'}`}
                  >
                    <div className="mt-1 shrink-0">
                      <div className={`h-2.5 w-2.5 rounded-full ${isRead ? 'bg-transparent' : 'bg-primary'}`}></div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground mb-1">{notif.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed break-words">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-2 font-medium">
                        {new Date(notif.created_at).toLocaleDateString()} at {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <header className="fixed top-0 left-0 w-full flex flex-col shadow-sm" style={{ position: 'fixed', zIndex: 110 }}>
      {/* Announcement Bar */}
      {settings.announcement && isAnnouncementVisible && (
        <div className="bg-primary text-primary-foreground py-1.5 px-4 flex items-center justify-between w-full" style={{ zIndex: 110 }}>
           <div className="overflow-hidden flex-1 relative flex items-center group">
              <div className="flex w-max">
                 {[...Array(6)].map((_, i) => (
                   <div key={i} className="animate-marquee flex shrink-0 items-center whitespace-nowrap" style={{ paddingRight: '4rem' }} aria-hidden={i > 0 ? "true" : "false"}>
                     <Megaphone className="h-4 w-4 mr-2 animate-pulse flex-shrink-0 text-primary-foreground/80"/>
                     <span className="text-sm font-medium tracking-wide pr-4">{tDynamic(settings.announcement)}</span>
                   </div>
                 ))}
              </div>
           </div>
           <Button 
             variant="ghost" 
             size="icon" 
             onClick={() => setIsAnnouncementVisible(false)} 
             className="ml-2 flex-shrink-0 text-primary-foreground hover:bg-primary-foreground/20 h-6 w-6 rounded-full"
           >
             <X className="h-3 w-3" />
           </Button>
        </div>
      )}

      <div className="bg-card border-b border-border w-full">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-sm">
            <Wheat className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">
            {tDynamic(storeName)}
          </span>
        </Link>

        {/* Desktop Actions — hidden on mobile via CSS */}
        <div className="nav-desktop-actions">
          <LanguageToggle />

          <Button variant="ghost" size="sm" asChild className="flex">
            <Link to="/track-order">
              <Package className="h-4 w-4 mr-2" />
              {t('Track Order')}
            </Link>
          </Button>

          {user ? (
            <Button variant="ghost" size="sm" asChild className="flex">
              <Link to="/account">
                {user.profile_image ? (
                  <img src={user.profile_image} alt={user.name} className="h-6 w-6 rounded-full object-cover mr-2" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center mr-2">
                    <User className="h-4 w-4" />
                  </div>
                )}
                {t('Account')}
              </Link>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" asChild className="flex">
              <Link to="/login/customer">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center mr-2">
                  <User className="h-4 w-4" />
                </div>
                {t('Login')}
              </Link>
            </Button>
          )}

          <div className="flex items-center gap-2">
            <NotificationIcon />
            <CartIcon />
          </div>
        </div>

        {/* Mobile: Cart + Hamburger — shown only on mobile via CSS */}
        <div className="nav-mobile-btn gap-2">
          <NotificationIcon />
          <CartIcon />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full px-0 py-0 flex items-center justify-center"
            onClick={() => setIsMenuOpen(prev => !prev)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      <div className={`nav-mobile-menu ${isMenuOpen ? 'open' : ''}`}>
        <div style={{ paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
          <LanguageToggle />
        </div>
        <hr className="nav-mobile-divider" />

        <Link
          to="/track-order"
          className="nav-mobile-link"
          onClick={() => setIsMenuOpen(false)}
        >
          <Package className="h-4 w-4" />
          {t('Track Order')}
        </Link>

        {user ? (
          <Link
            to="/account"
            className="nav-mobile-link"
            onClick={() => setIsMenuOpen(false)}
          >
            {user.profile_image ? (
              <img
                src={user.profile_image}
                alt={user.name}
                style={{ height: '1.5rem', width: '1.5rem', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ height: '1.5rem', width: '1.5rem', borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User className="h-4 w-4" />
              </div>
            )}
            {t('Account')}
          </Link>
        ) : (
          <Link
            to="/login/customer"
            className="nav-mobile-link"
            onClick={() => setIsMenuOpen(false)}
          >
            <div style={{ height: '1.5rem', width: '1.5rem', borderRadius: '50%', background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User className="h-4 w-4" />
            </div>
            {t('Login')}
          </Link>
        )}
      </div>
    </header>
  );
}





