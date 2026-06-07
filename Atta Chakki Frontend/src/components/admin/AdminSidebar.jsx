import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Clock, Calendar, CheckCircle, Settings, LayoutDashboard, Package, FileText, Truck, LogOut, Archive, Plus, BookOpen, Users, BarChart3, PackageCheck, Wallet, MessageSquare, Radio, X, Store, ShoppingBag } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../store/AuthContext';
import { useTranslation } from 'react-i18next';

export function AdminSidebar({ isOpen = false, onClose = () => {} }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/analytics', label: 'Analytics (P&L)', icon: BarChart3 },
    { path: '/admin/payments', label: 'Payments & Wallet', icon: Wallet },
    { path: '/admin/add-order', label: 'Add Manual Order', icon: Plus },
    { path: '/admin/today', label: "Today's Work", icon: Clock },
    { path: '/admin/tomorrow', label: "Tomorrow's List", icon: Calendar },
    { path: '/admin/ready', label: 'Ready Orders', icon: PackageCheck },
    { path: '/admin/pickup-requests', label: 'Pickup Requests', icon: Truck },
    { path: '/admin/completed', label: 'Completed Orders', icon: CheckCircle },
    { path: '/admin/records', label: 'Orders Record', icon: FileText },
    { path: '/admin/udhaar', label: 'Udhaar Khata', icon: Users },
    { path: '/admin/khata', label: 'Digital Khata', icon: BookOpen },
    { path: '/admin/inventory', label: 'Inventory', icon: Archive },
    { path: '/admin/categories', label: 'Manage Categories', icon: Package },
    { path: '/admin/services', label: 'Manage Products', icon: ShoppingBag },
    { path: '/admin/delivery', label: 'Delivery Team', icon: Truck },
    { path: '/admin/live-tracking', label: 'Live Tracking', icon: Radio },
    { path: '/admin/comments', label: 'Manage Comments', icon: MessageSquare },
    { path: '/admin/settings', label: 'Store Settings', icon: Settings },
    { path: '/admin/hero-settings', label: 'Hero Settings', icon: LayoutDashboard }
  ];

  return (
    <aside className={`admin-sidebar-el w-64 bg-white border-r border-gray-100 h-screen sticky top-0 flex flex-col${isOpen ? ' sidebar-open' : ''}`}>
      {/* Brand Header */}
      <div className="admin-brand-header">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="admin-sidebar-close"
          style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </Button>

        <Link to="/admin/dashboard" className="block" onClick={onClose}>
          <h1 className="admin-brand-title">{t('Admin Panel')}</h1>
          <p className="admin-brand-subtitle">{t('Store Management')}</p>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 overflow-y-auto admin-nav-scroll">
        <ul className="space-y-1 pr-2">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={`admin-nav-link ${isActive ? 'admin-nav-link-active' : ''}`}
                >
                  <Icon className="admin-nav-icon" strokeWidth={2} />
                  <span className="admin-nav-label">{t(item.label)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom: Back to store + Logout */}
      <div className="py-3 border-t border-gray-100 space-y-1 pr-2">
        <Link
          to="/"
          className="admin-nav-link"
        >
          <Store className="admin-nav-icon" strokeWidth={2} />
          <span className="admin-nav-label">{t('Back to Store')}</span>
        </Link>
        <button
          onClick={handleLogout}
          className="admin-nav-link admin-nav-logout w-full text-left"
        >
          <LogOut className="admin-nav-icon" strokeWidth={2} />
          <span className="admin-nav-label">{t('Logout')}</span>
        </button>
      </div>
    </aside>
  );
}
