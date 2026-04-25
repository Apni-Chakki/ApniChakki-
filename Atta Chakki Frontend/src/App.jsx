import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense, useState } from 'react';
import { CartProvider } from './lib/CartContext';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Toaster } from './components/ui/sonner';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { API_BASE_URL } from './config';
import wheatLogo from './assets/Wheat and Flour.png';

// layout components
import { Header } from './components/customer/Header';
import { Footer } from './components/customer/Footer';
import { AdminSidebar } from './components/admin/AdminSidebar';

// lazy loading all pages

// customer pages
const Homepage = lazy(() => import('./components/customer/Homepage').then(module => ({ default: module.Homepage })));
const Checkout = lazy(() => import('./components/customer/Checkout').then(module => ({ default: module.Checkout })));
const OrderConfirmation = lazy(() => import('./components/customer/OrderConfirmation').then(module => ({ default: module.OrderConfirmation })));
const TrackOrder = lazy(() => import('./components/customer/TrackOrder').then(module => ({ default: module.TrackOrder })));
const Contact = lazy(() => import('./components/customer/Contact').then(module => ({ default: module.Contact })));
const ReviewsPage = lazy(() => import('./components/customer/ReviewsPage').then(module => ({ default: module.ReviewsPage })));
const UserAccount = lazy(() => import('./components/customer/UserAccount').then(module => ({ default: module.UserAccount })));
const LiveTrackingPage = lazy(() => import('./components/customer/LiveTrackingPage').then(module => ({ default: module.LiveTrackingPage })));

// auth pages
const AdminLogin = lazy(() => import('./components/auth/AdminLogin').then(module => ({ default: module.AdminLogin })));
const DeliveryLogin = lazy(() => import('./components/auth/DeliveryLogin').then(module => ({ default: module.DeliveryLogin })));
const CustomerLogin = lazy(() => import('./components/auth/CustomerLogin').then(module => ({ default: module.CustomerLogin })));
const CustomerSignUp = lazy(() => import('./components/auth/CustomerSignUp').then(module => ({ default: module.CustomerSignUp })));

// delivery panel
const DeliveryPanel = lazy(() => import('./components/delivery/DeliveryPanel').then(module => ({ default: module.DeliveryPanel })));

// admin pages
const Dashboard = lazy(() => import('./components/admin/Dashboard').then(module => ({ default: module.Dashboard })));
const TodaysWork = lazy(() => import('./components/admin/TodaysWork').then(module => ({ default: module.TodaysWork })));
const TomorrowsList = lazy(() => import('./components/admin/TomorrowsList').then(module => ({ default: module.TomorrowsList })));
const ReadyOrders = lazy(() => import('./components/admin/ReadyOrders').then(module => ({ default: module.ReadyOrders })));
const PickupRequests = lazy(() => import('./components/admin/PickupRequests').then(module => ({ default: module.PickupRequests })));
const CompletedOrders = lazy(() => import('./components/admin/CompletedOrders').then(module => ({ default: module.CompletedOrders })));
const OrdersRecord = lazy(() => import('./components/admin/OrdersRecord').then(module => ({ default: module.OrdersRecord })));
const InventoryManagement = lazy(() => import('./components/admin/InventoryManagement').then(module => ({ default: module.InventoryManagement })));
const ManageCategories = lazy(() => import('./components/admin/ManageCategories').then(module => ({ default: module.ManageCategories })));
const ManageServices = lazy(() => import('./components/admin/ManageServices').then(module => ({ default: module.ManageServices })));
const ManageDelivery = lazy(() => import('./components/admin/ManageDelivery').then(module => ({ default: module.ManageDelivery })));
const Settings = lazy(() => import('./components/admin/Settings').then(module => ({ default: module.Settings })));
const AddManualOrder = lazy(() => import('./components/admin/AddManualOrder').then(module => ({ default: module.AddManualOrder })));
const DigitalKhata = lazy(() => import('./components/admin/DigitalKhata').then(module => ({ default: module.DigitalKhata })));
const UdhaarKhata = lazy(() => import('./components/admin/UdhaarKhata').then(module => ({ default: module.UdhaarKhata })));
const FinancialAnalytics = lazy(() => import('./components/admin/FinancialAnalytics').then(module => ({ default: module.FinancialAnalytics })));
const PaymentVerification = lazy(() => import('./components/admin/PaymentVerification').then(module => ({ default: module.PaymentVerification })));
const AdminComments = lazy(() => import('./components/admin/AdminComments').then(module => ({ default: module.AdminComments })));
const LiveTrackingMap = lazy(() => import('./components/admin/LiveTrackingMap').then(module => ({ default: module.LiveTrackingMap })));

function PageLoader() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
    </div>
  );
}

// customer page layout
function CustomerLayout({ children }) {
  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <Header />
      <main className="flex-1 mt-16 pb-20 md:pb-24">
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

// admin page layout
function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}

// protecting admin routes
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

// protecting delivery routes
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

  // fetching store settings for title
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/get_store_settings.php`);
        const data = await response.json();
        if (data.success && data.settings && data.settings.storeName) {
          document.title = data.settings.storeName;
        }
        
        // setting favicon
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

  // handling language direction
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
            {/* auth routes */}
            <Route path="/login/admin" element={<Suspense fallback={<PageLoader />}><AdminLogin /></Suspense>} />
            <Route path="/login/delivery" element={<Suspense fallback={<PageLoader />}><DeliveryLogin /></Suspense>} />
            <Route path="/login/customer" element={<Suspense fallback={<PageLoader />}><CustomerLogin /></Suspense>} />
            <Route path="/signup/customer" element={<Suspense fallback={<PageLoader />}><CustomerSignUp /></Suspense>} />

            {/* customer routes */}
            <Route path="/" element={<CustomerLayout><Homepage /></CustomerLayout>} />
            <Route path="/checkout" element={<CustomerLayout><Checkout /></CustomerLayout>} />
            <Route path="/order-confirmation/:orderId" element={<CustomerLayout><OrderConfirmation /></CustomerLayout>} />
            <Route path="/track-order" element={<CustomerLayout><TrackOrder /></CustomerLayout>} />
            <Route path="/contact" element={<CustomerLayout><Contact /></CustomerLayout>} />
            <Route path="/reviews" element={<CustomerLayout><Suspense fallback={<PageLoader />}><ReviewsPage /></Suspense></CustomerLayout>} />
            <Route path="/account" element={<CustomerLayout><UserAccount /></CustomerLayout>} />

            {/* live tracking via whatsapp link */}
            <Route path="/track/:token" element={<Suspense fallback={<PageLoader />}><LiveTrackingPage /></Suspense>} />

            {/* delivery panel */}
            <Route path="/delivery" element={<ProtectedDeliveryRoute><Suspense fallback={<PageLoader />}><DeliveryPanel /></Suspense></ProtectedDeliveryRoute>} />

            {/* admin routes */}
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
            <Route path="/admin/settings" element={<ProtectedAdminRoute><AdminLayout><Settings /></AdminLayout></ProtectedAdminRoute>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
