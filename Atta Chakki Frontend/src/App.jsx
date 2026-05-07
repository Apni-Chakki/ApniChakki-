import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { CartProvider } from './store/CartContext';
import { AuthProvider, useAuth } from './store/AuthContext';
import { Toaster } from './components/common/sonner';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { API_BASE_URL } from './config';

// saarey layout components yahan hain
import CustomerLayout from './layouts/CustomerLayout';
import AdminLayout from './layouts/AdminLayout';

// sari pages ko load kar rahe han yahan se
// customer ki pages
const Homepage = lazy(() => import('./pages/customer/Homepage').then(module => ({ default: module.Homepage })));
const Checkout = lazy(() => import('./pages/customer/Checkout').then(module => ({ default: module.Checkout })));
const OrderConfirmation = lazy(() => import('./pages/customer/OrderConfirmation').then(module => ({ default: module.OrderConfirmation })));
const TrackOrder = lazy(() => import('./pages/customer/TrackOrder').then(module => ({ default: module.TrackOrder })));
const Contact = lazy(() => import('./pages/customer/Contact').then(module => ({ default: module.Contact })));
const ReviewsPage = lazy(() => import('./pages/customer/ReviewsPage').then(module => ({ default: module.ReviewsPage })));
const UserAccount = lazy(() => import('./pages/customer/UserAccount').then(module => ({ default: module.UserAccount })));
const LiveTrackingPage = lazy(() => import('./pages/customer/LiveTrackingPage').then(module => ({ default: module.LiveTrackingPage })));

// login wagera ki pages
const AdminLogin = lazy(() => import('./pages/auth/AdminLogin').then(module => ({ default: module.AdminLogin })));
const DeliveryLogin = lazy(() => import('./pages/auth/DeliveryLogin').then(module => ({ default: module.DeliveryLogin })));
const CustomerLogin = lazy(() => import('./pages/auth/CustomerLogin').then(module => ({ default: module.CustomerLogin })));
const CustomerSignUp = lazy(() => import('./pages/auth/CustomerSignUp').then(module => ({ default: module.CustomerSignUp })));

// delivery wala panel yahan hai
const DeliveryPanel = lazy(() => import('./pages/delivery/DeliveryPanel').then(module => ({ default: module.DeliveryPanel })));

// admin ki sari pages yahan se import ho rahi hain
const Dashboard = lazy(() => import('./pages/admin/Dashboard').then(module => ({ default: module.Dashboard })));
const TodaysWork = lazy(() => import('./pages/admin/TodaysWork').then(module => ({ default: module.TodaysWork })));
const TomorrowsList = lazy(() => import('./pages/admin/TomorrowsList').then(module => ({ default: module.TomorrowsList })));
const ReadyOrders = lazy(() => import('./pages/admin/ReadyOrders').then(module => ({ default: module.ReadyOrders })));
const PickupRequests = lazy(() => import('./pages/admin/PickupRequests').then(module => ({ default: module.PickupRequests })));
const CompletedOrders = lazy(() => import('./pages/admin/CompletedOrders').then(module => ({ default: module.CompletedOrders })));
const OrdersRecord = lazy(() => import('./pages/admin/OrdersRecord').then(module => ({ default: module.OrdersRecord })));
const InventoryManagement = lazy(() => import('./pages/admin/InventoryManagement').then(module => ({ default: module.InventoryManagement })));
const ManageCategories = lazy(() => import('./pages/admin/ManageCategories').then(module => ({ default: module.ManageCategories })));
const ManageServices = lazy(() => import('./pages/admin/ManageServices').then(module => ({ default: module.ManageServices })));
const ManageDelivery = lazy(() => import('./pages/admin/ManageDelivery').then(module => ({ default: module.ManageDelivery })));
const Settings = lazy(() => import('./pages/admin/Settings').then(module => ({ default: module.Settings })));
const HeroSettings = lazy(() => import('./pages/admin/HeroSettings').then(module => ({ default: module.HeroSettings })));
const AddManualOrder = lazy(() => import('./pages/admin/AddManualOrder').then(module => ({ default: module.AddManualOrder })));
const DigitalKhata = lazy(() => import('./pages/admin/DigitalKhata').then(module => ({ default: module.DigitalKhata })));
const UdhaarKhata = lazy(() => import('./pages/admin/UdhaarKhata').then(module => ({ default: module.UdhaarKhata })));
const FinancialAnalytics = lazy(() => import('./pages/admin/FinancialAnalytics').then(module => ({ default: module.FinancialAnalytics })));
const PaymentVerification = lazy(() => import('./pages/admin/PaymentVerification').then(module => ({ default: module.PaymentVerification })));
const AdminComments = lazy(() => import('./pages/admin/AdminComments').then(module => ({ default: module.AdminComments })));
const LiveTrackingMap = lazy(() => import('./pages/admin/LiveTrackingMap').then(module => ({ default: module.LiveTrackingMap })));
const ContactMessages = lazy(() => import('./pages/admin/ContactMessages').then(module => ({ default: module.ContactMessages })));

function PageLoader() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
    </div>
  );
}

// admin ki routes ko lock kar rahe han
function ProtectedAdminRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  
  const storedUser = user || JSON.parse(localStorage.getItem('user') || 'null');

  if (!storedUser) console.warn("ProtectedRoute: No user found.");
  else if (storedUser.role && storedUser.role.toLowerCase() !== 'admin') console.warn(`ProtectedRoute: Role mismatch. Expected 'admin', got '${storedUser.role}'`);

  if (!storedUser || (storedUser.role && storedUser.role.toLowerCase() !== 'admin')) {
    return <Navigate to="/login/admin" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
}

// delivery ki routes ko lock kar rahe han
function ProtectedDeliveryRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  const storedUser = user || JSON.parse(localStorage.getItem('user') || 'null');

  if (!storedUser || (storedUser.role && storedUser.role.toLowerCase() !== 'delivery')) {
    return <Navigate to="/login/delivery" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { i18n } = useTranslation();

  // db se store ki setting nikal rahe han title k liye
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/get_store_settings.php`);
        const data = await response.json();
        if (data.success && data.settings && data.settings.storeName) {
          document.title = data.settings.storeName;
        }
        
        // favicon set ho raha hai yahan
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%238b6f47"/><g transform="translate(8,8)" fill="none" stroke="%23fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22 16 8"/><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M20 2h2v2a8 8 0 0 1-8 8h-2V2a8 8 0 0 1 8 8Z"/></g></svg>';
      } catch (error) {
        console.error("Could not load store settings for title:", error);
      }
    };
    
    fetchSettings();

    const handleSettingsUpdate = () => {
      fetchSettings();
    };
    
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

  // urdu/english language change karne ka logic
  useEffect(() => {
    const isUrdu = i18n.language === 'ur';
    document.documentElement.dir = isUrdu ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
    if (isUrdu) {
      document.documentElement.classList.add('font-urdu');
    } else {
      document.documentElement.classList.remove('font-urdu');
    }
  }, [i18n.language]);

  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* login wagera ki routes */}
            <Route path="/login/admin" element={<Suspense fallback={<PageLoader />}><AdminLogin /></Suspense>} />
            <Route path="/login/delivery" element={<Suspense fallback={<PageLoader />}><DeliveryLogin /></Suspense>} />
            <Route path="/login/customer" element={<Suspense fallback={<PageLoader />}><CustomerLogin /></Suspense>} />
            <Route path="/signup/customer" element={<Suspense fallback={<PageLoader />}><CustomerSignUp /></Suspense>} />

            {/* customer ki routes */}
            <Route path="/" element={<CustomerLayout><Homepage /></CustomerLayout>} />
            <Route path="/checkout" element={<CustomerLayout><Checkout /></CustomerLayout>} />
            <Route path="/order-confirmation/:orderId" element={<CustomerLayout><OrderConfirmation /></CustomerLayout>} />
            <Route path="/track-order" element={<CustomerLayout><TrackOrder /></CustomerLayout>} />
            <Route path="/contact" element={<CustomerLayout><Contact /></CustomerLayout>} />
            <Route path="/reviews" element={<CustomerLayout><Suspense fallback={<PageLoader />}><ReviewsPage /></Suspense></CustomerLayout>} />
            <Route path="/account" element={<CustomerLayout><UserAccount /></CustomerLayout>} />

            {/* whatsapp wala tracking link */}
            <Route path="/track/:token" element={<Suspense fallback={<PageLoader />}><LiveTrackingPage /></Suspense>} />

            {/* delivery panel */}
            <Route path="/delivery" element={<ProtectedDeliveryRoute><Suspense fallback={<PageLoader />}><DeliveryPanel /></Suspense></ProtectedDeliveryRoute>} />

            {/* admin ki sari routes yahan hain */}
            <Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminLayout><Dashboard /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/add-order" element={<ProtectedAdminRoute><AdminLayout><AddManualOrder /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin" element={<Navigate to="/admin/today" replace />} />
            <Route path="/admin/today" element={<ProtectedAdminRoute><AdminLayout><TodaysWork /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/tomorrow" element={<ProtectedAdminRoute><AdminLayout><TomorrowsList /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/ready" element={<ProtectedAdminRoute><AdminLayout><ReadyOrders /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/pickup-requests" element={<ProtectedAdminRoute><AdminLayout><PickupRequests /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/completed" element={<ProtectedAdminRoute><AdminLayout><CompletedOrders /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/records" element={<ProtectedAdminRoute><AdminLayout><OrdersRecord /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/udhaar" element={<ProtectedAdminRoute><AdminLayout><UdhaarKhata /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/khata" element={<ProtectedAdminRoute><AdminLayout><DigitalKhata /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/analytics" element={<ProtectedAdminRoute><AdminLayout><FinancialAnalytics /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/payments" element={<ProtectedAdminRoute><AdminLayout><PaymentVerification /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/inventory" element={<ProtectedAdminRoute><AdminLayout><InventoryManagement /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/categories" element={<ProtectedAdminRoute><AdminLayout><ManageCategories /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/services" element={<ProtectedAdminRoute><AdminLayout><ManageServices /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/delivery" element={<ProtectedAdminRoute><AdminLayout><ManageDelivery /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/live-tracking" element={<ProtectedAdminRoute><AdminLayout><LiveTrackingMap /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/comments" element={<ProtectedAdminRoute><AdminLayout><AdminComments /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/contact-messages" element={<ProtectedAdminRoute><AdminLayout><ContactMessages /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/settings" element={<ProtectedAdminRoute><AdminLayout><Settings /></AdminLayout></ProtectedAdminRoute>} />
            <Route path="/admin/hero-settings" element={<ProtectedAdminRoute><AdminLayout><HeroSettings /></AdminLayout></ProtectedAdminRoute>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}





