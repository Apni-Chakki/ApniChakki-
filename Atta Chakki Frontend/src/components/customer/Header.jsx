import { ShoppingCart, Wheat, Package, User, Menu, X } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import { LanguageToggle } from '../LanguageToggle';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';

export function Header() {
  const { getTotalItems } = useCart();
  const { user } = useAuth();
  const { t } = useTranslation();
  const itemCount = getTotalItems();
  const navigate = useNavigate();
  const location = useLocation();
  const [storeName, setStoreName] = useState("Apni Chakki");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const fetchStoreName = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_store_settings.php`);
      const data = await response.json();
      if (data.success && data.settings && data.settings.storeName) {
        setStoreName(data.settings.storeName);
      }
    } catch (error) {
      console.error("Could not load store name:", error);
    }
  };

  useEffect(() => {
    fetchStoreName();
    const handleSettingsUpdate = () => fetchStoreName();
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
      <Button variant="ghost" size="icon" className="rounded-full">
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-success text-success-foreground text-[10px] font-bold">
            {itemCount}
          </Badge>
        )}
      </Button>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm" style={{ position: 'sticky' }}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-sm">
            <Wheat className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">
            {t(storeName)}
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

          <CartIcon />
        </div>

        {/* Mobile: Cart + Hamburger — shown only on mobile via CSS */}
        <div className="nav-mobile-btn">
          <CartIcon />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(prev => !prev)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
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
