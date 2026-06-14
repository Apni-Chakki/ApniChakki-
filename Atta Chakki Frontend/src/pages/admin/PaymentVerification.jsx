import { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/card';
import { Button } from '../../components/common/button';
import { Badge } from '../../components/common/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/common/dialog';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import {
  Wallet, CreditCard, Smartphone, Building2, CheckCircle2, XCircle, Clock,
  RefreshCcw, Loader2, AlertCircle, ShieldCheck, ShieldX, ArrowDownRight,
  ArrowUpRight, DollarSign, Eye, Filter, Search, Banknote, TrendingUp, Settings2
} from 'lucide-react';
import { Switch } from '../../components/common/switch';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../store/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function PaymentVerification() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Data states
  const [walletBalance, setWalletBalance] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [paymentStats, setPaymentStats] = useState(null);

  // UI states
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'history', 'wallet'
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Dialog states
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionSuccessData, setRejectionSuccessData] = useState(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [paySettings, setPaySettings] = useState({
    pay_method_cod_enabled: '1',
    pay_method_jazzcash_enabled: '1',
    pay_method_card_enabled: '1',
    pay_method_bank_enabled: '1',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // API helper
  const apiCall = useCallback(async (action, extraData = {}) => {
    const response = await fetch(`${API_BASE_URL}/manage_wallets.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, user_id: user?.id, ...extraData }),
    });
    return response.json();
  }, [user]);

  // Fetch all data
  const fetchData = useCallback(async (showToast = false) => {
    setRefreshing(true);
    try {
      const [balanceRes, historyRes, pendingRes, statsRes, settingsRes] = await Promise.all([
        apiCall('get_balance'),
        apiCall('get_payment_history', { status: statusFilter, method: methodFilter, limit: 100 }),
        apiCall('get_pending_verification'),
        apiCall('get_payment_stats'),
        fetch(`${API_BASE_URL}/get_store_settings.php`).then(r => r.json())
      ]);

      if (balanceRes.success) setWalletBalance(balanceRes);
      if (historyRes.success) setPaymentHistory(historyRes.payments || []);
      if (pendingRes.success) setPendingTransfers(pendingRes.pending_transfers || []);
      if (statsRes.success) setPaymentStats(statsRes);
      
      if (settingsRes.success && settingsRes.settings) {
        setPaySettings({
          pay_method_cod_enabled: settingsRes.settings.pay_method_cod_enabled ?? '1',
          pay_method_jazzcash_enabled: settingsRes.settings.pay_method_jazzcash_enabled ?? '1',
          pay_method_card_enabled: settingsRes.settings.pay_method_card_enabled ?? '1',
          pay_method_bank_enabled: settingsRes.settings.pay_method_bank_enabled ?? '1',
        });
      }

      if (showToast) toast.success(t('Data refreshed'));
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(t('Failed to load payment data'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiCall, statusFilter, methodFilter, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Verify bank payment
  const handleVerify = async () => {
    if (!selectedPayment) return;
    setIsProcessing(true);
    try {
      const result = await apiCall('verify_bank_payment', {
        payment_transaction_id: selectedPayment.id,
      });
      if (result.success) {
        toast.success(result.message);
        setShowVerifyDialog(false);
        setSelectedPayment(null);
        fetchData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(t('Verification failed'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject bank payment
  const handleReject = async () => {
    if (!selectedPayment) return;
    setIsProcessing(true);
    try {
      const result = await apiCall('reject_bank_payment', {
        payment_transaction_id: selectedPayment.id,
        reason: rejectReason || 'Rejected by admin',
      });
      if (result.success) {
        toast.success(result.message);
        setShowRejectDialog(false);
        setRejectReason('');
        
        // ── Formulate WhatsApp redirection message ──
        let formattedPhone = '';
        let whatsappMsg = '';
        if (result.customer_phone) {
          const customerPhone = result.customer_phone.replace(/\D/g, '');
          formattedPhone = customerPhone.startsWith('0') 
            ? '92' + customerPhone.substring(1) 
            : customerPhone.startsWith('92') ? customerPhone : '92' + customerPhone;

          whatsappMsg = encodeURIComponent(
            `❌ *Apni Chakki — Payment Rejection & COD Conversion* ❌\n\n` +
            `Assalam-o-Alaikum ${result.customer_name || 'Customer'}!\n\n` +
            `We regret to inform you that your Bank Transfer payment of *Rs. ${result.amount?.toLocaleString()}* for *Order #${result.order_id}* (TXN ID: ${result.transaction_id || 'N/A'}) could not be verified and has been rejected.\n\n` +
            `⚠️ *Reason for Rejection:* ${result.reason || 'Incorrect transaction ID or amount not received'}\n\n` +
            `🔄 *Convert to COD:* Your order has been converted to *Cash on Delivery (COD)*. / آپ کا آرڈر کیش آن ڈلیوری پر منتقل کر دیا گیا ہے۔\n\n` +
            `Please pay *Rs. ${result.amount?.toLocaleString()}* in cash upon delivery. Thank you. / برائے مہربانی ڈلیوری کے وقت کیش ادا کریں۔\n\n` +
            `JazakAllah! 🙏🌾`
          );
        }

        // Set rejection success data for the zero-block dialog
        setRejectionSuccessData({
          order_id: result.order_id,
          customer_name: result.customer_name || 'Customer',
          amount: result.amount,
          reason: result.reason,
          phone: formattedPhone,
          whatsappMsg: whatsappMsg
        });
        
        setSelectedPayment(null);
        fetchData();
        setShowSuccessDialog(true); // Open the success popup
        
        // Open WhatsApp link in new tab (as automatic attempt)
        if (formattedPhone) {
          setTimeout(() => {
            window.open(`https://wa.me/${formattedPhone}?text=${whatsappMsg}`, '_blank');
          }, 1000);
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(t('Rejection failed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePaySettings = async (key, value) => {
    const newValue = value ? '1' : '0';
    setSettingsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/update_store_settings.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { [key]: newValue }
        }),
      });
      const data = await response.json();
      if (data.success) {
        setPaySettings(prev => ({ ...prev, [key]: newValue }));
        toast.success(t('Payment method updated'));
      } else {
        toast.error(data.message || t('Update failed'));
      }
    } catch (error) {
      toast.error(t('Network error'));
    } finally {
      setSettingsLoading(false);
    }
  };

  // Helpers
  const getMethodIcon = (method) => {
    switch (method) {
      case 'jazzcash': return <Smartphone className="h-4 w-4" style={{ color: '#e1272c' }} />;
      case 'card': return <CreditCard className="h-4 w-4" style={{ color: '#1a1f71' }} />;
      case 'bank': return <Building2 className="h-4 w-4 text-blue-600" />;
      default: return <Banknote className="h-4 w-4 text-green-600" />;
    }
  };

  const getMethodLabel = (method) => {
    switch (method) {
      case 'jazzcash': return 'JazzCash';
      case 'card': return 'Card';
      case 'bank': return 'Bank Transfer';
      default: return method;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const timeSince = (dateStr) => {
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Filter history
  const filteredHistory = paymentHistory.filter(p => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.user_name?.toLowerCase().includes(q) ||
        p.transaction_id?.toLowerCase().includes(q) ||
        String(p.order_id).includes(q) ||
        p.user_phone?.includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{t('Loading payment data...')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-8 sm:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-5 w-5 sm:h-7 sm:w-7 text-primary shrink-0" />
            <span className="truncate">{t('Payments & Wallet')}</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">{t('Verify payments, check wallet balance, and view transaction history')}</p>
        </div>
        <Button onClick={() => fetchData(true)} variant="outline" size="sm" disabled={refreshing} className="w-full sm:w-auto">
          <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {t('Refresh')}
        </Button>
      </div>

      {/* Wallet Balance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5 border-green-200" style={{ background: 'linear-gradient(135deg, #dcfce7, #d1fae5)' }}>
          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3 bg-green-200 rounded-full shrink-0">
              <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-green-700" />
            </div>
            <div className="min-w-0 w-full sm:w-auto">
              <p className="text-[11px] sm:text-xs text-green-800 font-medium leading-tight">{t('Business Wallet')}</p>
              <p className="text-base sm:text-2xl font-black text-green-900 break-all mt-0.5 sm:mt-0">
                Rs. {(walletBalance?.balance || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 border-blue-200" style={{ background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)' }}>
          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3 bg-blue-200 rounded-full shrink-0">
              <ArrowDownRight className="h-5 w-5 sm:h-6 sm:w-6 text-blue-700" />
            </div>
            <div className="min-w-0 w-full sm:w-auto">
              <p className="text-[11px] sm:text-xs text-blue-800 font-medium leading-tight">{t("Today's Received")}</p>
              <p className="text-base sm:text-2xl font-black text-blue-900 break-all mt-0.5 sm:mt-0">
                Rs. {(walletBalance?.today_received || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 border-purple-200" style={{ background: 'linear-gradient(135deg, #f3e8ff, #ede9fe)' }}>
          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3 bg-purple-200 rounded-full shrink-0">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-700" />
            </div>
            <div className="min-w-0 w-full sm:w-auto">
              <p className="text-[11px] sm:text-xs text-purple-800 font-medium leading-tight">{t('Total Online Received')}</p>
              <p className="text-base sm:text-2xl font-black text-purple-900 break-all mt-0.5 sm:mt-0">
                Rs. {(walletBalance?.total_online_received || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card
          className={`p-4 sm:p-5 ${(walletBalance?.pending_verification_count || 0) > 0 ? 'border-yellow-200 animate-pulse' : 'border-gray-200'}`}
          style={{ background: (walletBalance?.pending_verification_count || 0) > 0 ? 'linear-gradient(135deg, #fef9c3, #fed7aa)' : 'linear-gradient(135deg, #f3f4f6, #f1f5f9)' }}
        >
          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-3">
            <div className={`p-2.5 sm:p-3 rounded-full shrink-0 ${(walletBalance?.pending_verification_count || 0) > 0 ? 'bg-yellow-200' : 'bg-gray-200'}`}>
              <AlertCircle className={`h-5 w-5 sm:h-6 sm:w-6 ${(walletBalance?.pending_verification_count || 0) > 0 ? 'text-yellow-700' : 'text-gray-500'}`} />
            </div>
            <div className="min-w-0 w-full sm:w-auto">
              <p className={`text-[11px] sm:text-xs font-medium leading-tight ${(walletBalance?.pending_verification_count || 0) > 0 ? 'text-yellow-800' : 'text-gray-600'}`}>
                {t('Pending Verification')}
              </p>
              <p className={`text-base sm:text-2xl font-black mt-0.5 sm:mt-0 ${(walletBalance?.pending_verification_count || 0) > 0 ? 'text-yellow-900' : 'text-gray-400'}`}>
                {walletBalance?.pending_verification_count || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Payment method stats */}
      {paymentStats?.totals && paymentStats.totals.total_transactions > 0 && (
        <Card className="p-3 sm:p-5">
          <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            {t('Transaction Summary')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
            <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{paymentStats.totals.total_transactions}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{t('Total')}</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-green-700">{paymentStats.totals.completed}</p>
              <p className="text-[10px] sm:text-xs text-green-600">{t('Completed')}</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-yellow-50 rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-yellow-700">{paymentStats.totals.pending}</p>
              <p className="text-[10px] sm:text-xs text-yellow-600">{t('Pending')}</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-blue-700">{paymentStats.totals.processing}</p>
              <p className="text-[10px] sm:text-xs text-blue-600">{t('Processing')}</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg col-span-2 sm:col-span-1">
              <p className="text-lg sm:text-2xl font-bold text-red-700">{paymentStats.totals.failed}</p>
              <p className="text-[10px] sm:text-xs text-red-600">{t('Failed')}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab Navigation — 2×2 grid on mobile, horizontal tabs on sm+ */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2 sm:border-b sm:border-border sm:pb-1">
        {[
          { id: 'pending', label: t('Pending Verification'), shortLabel: t('Pending'), icon: AlertCircle, count: pendingTransfers.length },
          { id: 'history', label: t('Payment History'), shortLabel: t('History'), icon: CreditCard, count: null },
          { id: 'wallet', label: t('Wallet Log'), shortLabel: t('Wallet'), icon: Wallet, count: null },
          { id: 'settings', label: t('Manage Methods'), shortLabel: t('Methods'), icon: Settings2, count: null },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium rounded-lg sm:rounded-t-lg sm:rounded-b-none border sm:border-0 transition-colors whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-secondary hover:border-secondary'
              }`}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">{tab.shortLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count > 0 && (
              <Badge className="ml-0.5 bg-red-500 text-white text-[10px] px-1.5 py-0">{tab.count}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* ====================================== */}
      {/* TAB: PENDING VERIFICATION */}
      {/* ====================================== */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingTransfers.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">{t('All Clear!')}</h3>
              <p className="text-muted-foreground">{t('No payments waiting for verification')}</p>
            </Card>
          ) : (
            pendingTransfers.map(transfer => (
              <Card key={transfer.id} className="p-3 sm:p-5 border-yellow-200 hover:border-yellow-300 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                    <div className="p-2.5 sm:p-3 bg-yellow-100 rounded-full shrink-0">
                      {getMethodIcon(transfer.payment_method)}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-bold text-base sm:text-lg text-foreground">Rs. {transfer.amount.toLocaleString()}</span>
                        <Badge variant="outline" className="text-[10px] sm:text-xs">{getMethodLabel(transfer.payment_method)}</Badge>
                        <Badge className="bg-yellow-100 text-yellow-800 text-[10px] sm:text-xs"><Clock className="h-3 w-3 mr-1" /> {t('Awaiting Verification')}</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-foreground break-words">
                        <strong>{transfer.user_name}</strong> — {transfer.user_phone}
                      </p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground break-all">
                        {t('Order')} #{transfer.order_id} • TXN: <span className="font-mono">{transfer.transaction_id}</span>
                      </p>
                      {transfer.bank_account && (
                        <p className="text-[11px] sm:text-xs text-muted-foreground break-all">
                          {t('Bank Account')}: <strong>{transfer.bank_account}</strong>
                        </p>
                      )}
                      <p className="text-[11px] sm:text-xs text-muted-foreground">{timeSince(transfer.created_at)} • {formatDate(transfer.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto shrink-0">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                      onClick={() => { setSelectedPayment(transfer); setShowVerifyDialog(true); }}
                    >
                      <ShieldCheck className="h-4 w-4 mr-1.5" />
                      {t('Verify')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 sm:flex-none"
                      onClick={() => { setSelectedPayment(transfer); setShowRejectDialog(true); }}
                    >
                      <ShieldX className="h-4 w-4 mr-1.5" />
                      {t('Reject')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ====================================== */}
      {/* TAB: PAYMENT HISTORY */}
      {/* ====================================== */}
      {activeTab === 'history' && (
        <div className="space-y-3 sm:space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('Search by name, phone, TXN ID, or order #...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 sm:px-3 py-2 border border-border rounded-lg bg-background text-xs sm:text-sm w-full sm:w-auto"
              >
                <option value="all">{t('All Status')}</option>
                <option value="completed">{t('Completed')}</option>
                <option value="pending">{t('Pending')}</option>
                <option value="processing">{t('Processing')}</option>
                <option value="failed">{t('Failed')}</option>
              </select>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="px-2 sm:px-3 py-2 border border-border rounded-lg bg-background text-xs sm:text-sm w-full sm:w-auto"
              >
                <option value="all">{t('All Methods')}</option>
                <option value="jazzcash">JazzCash</option>
                <option value="card">{t('Card')}</option>
                <option value="bank">{t('Bank Transfer')}</option>
              </select>
            </div>
          </div>

          {/* Payment list */}
          {filteredHistory.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center">
              <CreditCard className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm sm:text-base text-muted-foreground">{t('No payment transactions found')}</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map(payment => (
                <Card key={payment.id} className="p-3 sm:p-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => { setSelectedPayment(payment); setShowDetailsDialog(true); }}
                >
                  <div className="flex items-center justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="shrink-0">
                        {getMethodIcon(payment.payment_method)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-semibold text-sm sm:text-base text-foreground">Rs. {payment.amount.toLocaleString()}</span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">→ #{payment.order_id}</span>
                          {payment.is_sandbox && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1 rounded">SB</span>}
                        </div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                          {payment.user_name} • {payment.user_phone} • {timeSince(payment.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      {getStatusBadge(payment.payment_status)}
                      <Eye className="h-4 w-4 text-muted-foreground hidden sm:block" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====================================== */}
      {/* TAB: WALLET LOG */}
      {/* ====================================== */}
      {activeTab === 'wallet' && (
        <div className="space-y-3 sm:space-y-4">
          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{t('Business Account Details')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-[11px] sm:text-xs text-muted-foreground">{t('Account Name')}</p>
                <p className="font-medium text-sm sm:text-base break-words">{walletBalance?.account_name || '-'}</p>
              </div>
              <div>
                <p className="text-[11px] sm:text-xs text-muted-foreground">{t('Bank')}</p>
                <p className="font-medium text-sm sm:text-base break-words">{walletBalance?.bank_name || 'Not configured'}</p>
              </div>
              <div>
                <p className="text-[11px] sm:text-xs text-muted-foreground">{t('Account Number')}</p>
                <p className="font-medium font-mono text-sm sm:text-base break-all">{walletBalance?.account_number || '-'}</p>
              </div>
              <div>
                <p className="text-[11px] sm:text-xs text-muted-foreground">{t('Current Balance')}</p>
                <p className="font-bold text-lg sm:text-xl text-green-700 break-all">Rs. {(walletBalance?.balance || 0).toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <ArrowDownRight className="h-4 w-4 text-green-600 shrink-0" />
              <ArrowUpRight className="h-4 w-4 text-red-600 shrink-0" />
              <span className="break-words">{t('Recent Wallet Transactions (Auto-loaded)')}</span>
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              {t('Wallet transactions appear here when online payments are verified or completed. Each payment creates a credit entry in the business wallet.')}
            </p>
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <Wallet className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm sm:text-base">{t('Wallet transactions will appear after payments are processed')}</p>
              <p className="text-[11px] sm:text-xs mt-1">{t('Try testing a JazzCash or Card payment first')}</p>
            </div>
          </Card>
        </div>
      )}

      {/* ====================================== */}
      {/* TAB: MANAGE METHODS */}
      {/* ====================================== */}
      {activeTab === 'settings' && (
        <div className="space-y-3 sm:space-y-4">
          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm sm:text-base">
              <Settings2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              {t('Payment Method Settings')}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
              {t('Enable or disable payment methods for your customers according to your business needs.')}
            </p>

            <div className="space-y-3 sm:space-y-6">
              {[
                { key: 'pay_method_cod_enabled', icon: Banknote, label: t('Cash on Delivery'), desc: t('Allow customers to pay when they receive their order'), iconBg: 'bg-green-100', iconColor: 'text-green-700' },
                { key: 'pay_method_jazzcash_enabled', icon: Smartphone, label: 'JazzCash', desc: t('Enable online mobile wallet payments via JazzCash'), iconBg: 'bg-red-100', iconColor: 'text-red-700' },
                { key: 'pay_method_card_enabled', icon: CreditCard, label: t('Credit / Debit Card'), desc: t('Visa, Mastercard and international card support'), iconBg: 'bg-blue-100', iconColor: 'text-blue-700' },
                { key: 'pay_method_bank_enabled', icon: Building2, label: t('Bank Transfer'), desc: t('Manual verification of direct bank account transfers'), iconBg: 'bg-purple-100', iconColor: 'text-purple-700' },
              ].map(method => {
                const isEnabled = paySettings[method.key] === '1';
                const Icon = method.icon;
                return (
                  <div
                    key={method.key}
                    className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 border rounded-xl hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-4 min-w-0 sm:flex-1 w-full sm:w-auto">
                      <div className={`p-3 ${method.iconBg} rounded-full shrink-0`}>
                        <Icon className={`h-6 w-6 ${method.iconColor}`} />
                      </div>
                      <div className="min-w-0 sm:flex-1">
                        <p className="font-bold text-base text-foreground">{method.label}</p>
                        <p className="text-xs text-muted-foreground leading-snug mt-0.5">{method.desc}</p>
                      </div>
                    </div>
                    {isEnabled ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleUpdatePaySettings(method.key, false)}
                        disabled={settingsLoading}
                        className="w-full sm:w-auto px-4 shrink-0"
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        {t('Disable')}
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleUpdatePaySettings(method.key, true)}
                        disabled={settingsLoading}
                        className="w-full sm:w-auto px-4 shrink-0 bg-green-600 hover:bg-green-700 text-white border-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        {t('Enable')}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-blue-50 border-blue-200">
            <div className="flex gap-2 sm:gap-3">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-blue-800">{t('Important Note')}</p>
                <p className="text-[11px] sm:text-xs text-blue-700 mt-1 leading-relaxed">
                  {t('Disabling a payment method will hide it from the checkout page for all customers immediately. Ensure at least one payment method is always enabled to allow customers to place orders.')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ====================================== */}
      {/* DIALOG: VERIFY PAYMENT */}
      {/* ====================================== */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700 text-base sm:text-lg">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              {t('Verify Payment')}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t('Confirm that you have received this bank transfer. The amount will be credited to the business wallet.')}
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground shrink-0">{t('Customer')}:</span>
                  <span className="font-semibold text-xs sm:text-sm text-right break-words min-w-0">{selectedPayment.user_name}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground shrink-0">{t('Amount')}:</span>
                  <span className="font-bold text-green-700 text-base sm:text-lg break-all text-right">Rs. {selectedPayment.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground shrink-0">{t('Order')}:</span>
                  <span className="font-medium text-xs sm:text-sm">#{selectedPayment.order_id}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground shrink-0">{t('Method')}:</span>
                  <span className="font-medium text-xs sm:text-sm">{getMethodLabel(selectedPayment.payment_method)}</span>
                </div>
                {selectedPayment.bank_account && (
                  <div className="flex justify-between gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground shrink-0">{t('Bank Account')}:</span>
                    <span className="font-mono text-xs sm:text-sm break-all text-right min-w-0">{selectedPayment.bank_account}</span>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground shrink-0">TXN ID:</span>
                  <span className="font-mono text-[11px] sm:text-xs break-all text-right min-w-0">{selectedPayment.transaction_id}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)} disabled={isProcessing} className="w-full sm:w-auto">
              {t('Cancel')}
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 w-full sm:w-auto" onClick={handleVerify} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              {t('Confirm Payment Received')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====================================== */}
      {/* DIALOG: REJECT PAYMENT */}
      {/* ====================================== */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700 text-base sm:text-lg">
              <ShieldX className="h-5 w-5 shrink-0" />
              {t('Reject Payment')}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t('Reject this payment if the bank transfer was not received. The order will revert to cash payment.')}
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground shrink-0">{t('Customer')}:</span>
                  <span className="font-semibold text-xs sm:text-sm text-right break-words min-w-0">{selectedPayment.user_name}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground shrink-0">{t('Amount')}:</span>
                  <span className="font-bold text-red-700 text-sm sm:text-base break-all text-right">Rs. {selectedPayment.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground shrink-0">{t('Order')}:</span>
                  <span className="font-medium text-xs sm:text-sm">#{selectedPayment.order_id}</span>
                </div>
              </div>
              <div>
                <Label htmlFor="rejectReason" className="text-xs sm:text-sm">{t('Rejection reason')}</Label>
                <Input
                  id="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t('e.g., Transfer not received, wrong amount...')}
                  className="mt-1 text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={isProcessing} className="w-full sm:w-auto">
              {t('Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing} className="w-full sm:w-auto">
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldX className="h-4 w-4 mr-2" />}
              {t('Reject Payment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: REJECTION SUCCESS & WHATSAPP NOTIFICATION */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-650 text-base sm:text-lg font-bold">
              <span>❌</span>
              <span className="break-words">{t('Payment Rejected & Marked Unpaid')}</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t('The payment has been marked failed in the database and an automated Gmail notification has been sent directly to the customer.')}
            </DialogDescription>
          </DialogHeader>
          {rejectionSuccessData && (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-left">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">{t('Customer')}:</span>
                  <span className="font-semibold text-foreground text-right break-words min-w-0">{rejectionSuccessData.customer_name}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">{t('Order')}:</span>
                  <span className="font-semibold text-foreground">#{rejectionSuccessData.order_id}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">{t('Amount')}:</span>
                  <span className="font-bold text-red-700 break-all text-right">Rs. {rejectionSuccessData.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between gap-2 border-t border-red-100 pt-2">
                  <span className="text-muted-foreground shrink-0">{t('Reason')}:</span>
                  <span className="font-medium text-red-800 text-right break-words min-w-0">{rejectionSuccessData.reason}</span>
                </div>
              </div>

              {rejectionSuccessData.phone && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-[11px] sm:text-xs text-green-800 text-left flex items-start gap-2">
                  <span>ℹ️</span>
                  <span>
                    {t('Browsers block auto-opening tabs. Please click the button below to guarantee WhatsApp opens successfully with the pre-filled notification.')}
                  </span>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowSuccessDialog(false)}>
              {t('Close')}
            </Button>
            {rejectionSuccessData?.phone && (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto flex items-center justify-center gap-1.5 font-bold"
                onClick={() => {
                  window.open(`https://wa.me/${rejectionSuccessData.phone}?text=${rejectionSuccessData.whatsappMsg}`, '_blank');
                }}
              >
                <span>💬</span>
                {t('Send WhatsApp Alert')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====================================== */}
      {/* DIALOG: PAYMENT DETAILS */}
      {/* ====================================== */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Eye className="h-5 w-5 text-primary shrink-0" />
              {t('Payment Details')}
            </DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 bg-secondary/30 rounded-lg p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {getMethodIcon(selectedPayment.payment_method)}
                  <span className="font-medium text-sm sm:text-base truncate">{getMethodLabel(selectedPayment.payment_method)}</span>
                </div>
                <div className="shrink-0">{getStatusBadge(selectedPayment.payment_status)}</div>
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                {[
                  { label: t('Amount'), value: `Rs. ${selectedPayment.amount?.toLocaleString()}`, bold: true },
                  { label: t('Order'), value: `#${selectedPayment.order_id}` },
                  { label: t('Customer'), value: selectedPayment.user_name },
                  { label: t('Phone'), value: selectedPayment.user_phone || selectedPayment.payment_phone || '-' },
                  { label: 'TXN ID', value: selectedPayment.transaction_id, mono: true },
                  { label: t('Gateway TXN'), value: selectedPayment.gateway_txn_id || '-', mono: true },
                  { label: t('Bank Account'), value: selectedPayment.bank_account || '-' },
                  { label: t('Order Status'), value: selectedPayment.order_status },
                  { label: t('Payment Status'), value: selectedPayment.order_payment_status },
                  { label: t('Created'), value: formatDate(selectedPayment.created_at) },
                  { label: t('Completed'), value: selectedPayment.completed_at ? formatDate(selectedPayment.completed_at) : '-' },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between gap-2 py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground shrink-0">{item.label}:</span>
                    <span className={`text-right break-all min-w-0 ${item.bold ? 'font-bold text-foreground' : 'font-medium'} ${item.mono ? 'font-mono text-[11px] sm:text-xs' : ''}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {selectedPayment.error_message && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-800">{t('Error')}:</p>
                  <p className="text-xs text-red-700 break-words">{selectedPayment.error_message}</p>
                </div>
              )}

              {selectedPayment.is_sandbox && (
                <div className="text-center">
                  <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">SANDBOX TRANSACTION</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}





