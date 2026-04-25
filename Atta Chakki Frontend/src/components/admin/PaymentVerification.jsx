import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Wallet, CreditCard, Smartphone, Building2, CheckCircle2, XCircle, Clock,
  RefreshCcw, Loader2, AlertCircle, ShieldCheck, ShieldX, ArrowDownRight,
  ArrowUpRight, DollarSign, Eye, Filter, Search, Banknote, TrendingUp
} from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../lib/AuthContext';
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

  // API helper
  const apiCall = useCallback(async (action, extraData = {}) => {
    const response = await fetch(`${API_BASE_URL}/payments/manage_wallets.php`, {
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
      const [balanceRes, historyRes, pendingRes, statsRes] = await Promise.all([
        apiCall('get_balance'),
        apiCall('get_payment_history', { status: statusFilter, method: methodFilter, limit: 100 }),
        apiCall('get_pending_verification'),
        apiCall('get_payment_stats'),
      ]);

      if (balanceRes.success) setWalletBalance(balanceRes);
      if (historyRes.success) setPaymentHistory(historyRes.payments || []);
      if (pendingRes.success) setPendingTransfers(pendingRes.pending_transfers || []);
      if (statsRes.success) setPaymentStats(statsRes);

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
        setSelectedPayment(null);
        setRejectReason('');
        fetchData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(t('Rejection failed'));
    } finally {
      setIsProcessing(false);
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
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-7 w-7 text-primary" />
            {t('Payments & Wallet')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('Verify payments, check wallet balance, and view transaction history')}</p>
        </div>
        <Button onClick={() => fetchData(true)} variant="outline" size="sm" disabled={refreshing}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {t('Refresh')}
        </Button>
      </div>

      {/* Wallet Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-200 rounded-full">
              <Wallet className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-xs text-green-800 font-medium">{t('Business Wallet')}</p>
              <p className="text-2xl font-black text-green-900">
                Rs. {(walletBalance?.balance || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-200 rounded-full">
              <ArrowDownRight className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <p className="text-xs text-blue-800 font-medium">{t("Today's Received")}</p>
              <p className="text-2xl font-black text-blue-900">
                Rs. {(walletBalance?.today_received || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-200 rounded-full">
              <TrendingUp className="h-6 w-6 text-purple-700" />
            </div>
            <div>
              <p className="text-xs text-purple-800 font-medium">{t('Total Online Received')}</p>
              <p className="text-2xl font-black text-purple-900">
                Rs. {(walletBalance?.total_online_received || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className={`p-5 border-yellow-200 ${(walletBalance?.pending_verification_count || 0) > 0 ? 'bg-gradient-to-br from-yellow-50 to-orange-50 animate-pulse' : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${(walletBalance?.pending_verification_count || 0) > 0 ? 'bg-yellow-200' : 'bg-gray-200'}`}>
              <AlertCircle className={`h-6 w-6 ${(walletBalance?.pending_verification_count || 0) > 0 ? 'text-yellow-700' : 'text-gray-500'}`} />
            </div>
            <div>
              <p className={`text-xs font-medium ${(walletBalance?.pending_verification_count || 0) > 0 ? 'text-yellow-800' : 'text-gray-600'}`}>
                {t('Pending Verification')}
              </p>
              <p className={`text-2xl font-black ${(walletBalance?.pending_verification_count || 0) > 0 ? 'text-yellow-900' : 'text-gray-400'}`}>
                {walletBalance?.pending_verification_count || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Payment method stats */}
      {paymentStats?.totals && paymentStats.totals.total_transactions > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            {t('Transaction Summary')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{paymentStats.totals.total_transactions}</p>
              <p className="text-xs text-muted-foreground">{t('Total')}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{paymentStats.totals.completed}</p>
              <p className="text-xs text-green-600">{t('Completed')}</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-700">{paymentStats.totals.pending}</p>
              <p className="text-xs text-yellow-600">{t('Pending')}</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{paymentStats.totals.processing}</p>
              <p className="text-xs text-blue-600">{t('Processing')}</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-700">{paymentStats.totals.failed}</p>
              <p className="text-xs text-red-600">{t('Failed')}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border pb-1">
        {[
          { id: 'pending', label: t('Pending Verification'), icon: AlertCircle, count: pendingTransfers.length },
          { id: 'history', label: t('Payment History'), icon: CreditCard, count: null },
          { id: 'wallet', label: t('Wallet Log'), icon: Wallet, count: null },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors
              ${activeTab === tab.id 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:bg-secondary'
              }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count > 0 && (
              <Badge className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0">{tab.count}</Badge>
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
              <Card key={transfer.id} className="p-5 border-yellow-200 hover:border-yellow-300 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-yellow-100 rounded-full flex-shrink-0">
                      {getMethodIcon(transfer.payment_method)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg text-foreground">Rs. {transfer.amount.toLocaleString()}</span>
                        <Badge variant="outline" className="text-xs">{getMethodLabel(transfer.payment_method)}</Badge>
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs"><Clock className="h-3 w-3 mr-1" /> {t('Awaiting Verification')}</Badge>
                      </div>
                      <p className="text-sm text-foreground">
                        <strong>{transfer.user_name}</strong> — {transfer.user_phone}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('Order')} #{transfer.order_id} • TXN: <span className="font-mono">{transfer.transaction_id}</span>
                      </p>
                      {transfer.bank_account && (
                        <p className="text-xs text-muted-foreground">
                          {t('Bank Account')}: <strong>{transfer.bank_account}</strong>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{timeSince(transfer.created_at)} • {formatDate(transfer.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => { setSelectedPayment(transfer); setShowVerifyDialog(true); }}
                    >
                      <ShieldCheck className="h-4 w-4 mr-1.5" />
                      {t('Verify')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
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
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('Search by name, phone, TXN ID, or order #...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
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
              className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
            >
              <option value="all">{t('All Methods')}</option>
              <option value="jazzcash">JazzCash</option>
              <option value="card">{t('Card')}</option>
              <option value="bank">{t('Bank Transfer')}</option>
            </select>
          </div>

          {/* Payment list */}
          {filteredHistory.length === 0 ? (
            <Card className="p-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{t('No payment transactions found')}</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map(payment => (
                <Card key={payment.id} className="p-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => { setSelectedPayment(payment); setShowDetailsDialog(true); }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0">
                        {getMethodIcon(payment.payment_method)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">Rs. {payment.amount.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">→ Order #{payment.order_id}</span>
                          {payment.is_sandbox && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1 rounded">SB</span>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {payment.user_name} • {payment.user_phone} • {timeSince(payment.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(payment.payment_status)}
                      <Eye className="h-4 w-4 text-muted-foreground" />
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
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">{t('Business Account Details')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t('Account Name')}</p>
                <p className="font-medium">{walletBalance?.account_name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('Bank')}</p>
                <p className="font-medium">{walletBalance?.bank_name || 'Not configured'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('Account Number')}</p>
                <p className="font-medium font-mono">{walletBalance?.account_number || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('Current Balance')}</p>
                <p className="font-bold text-xl text-green-700">Rs. {(walletBalance?.balance || 0).toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-green-600" />
              <ArrowUpRight className="h-4 w-4 text-red-600" />
              {t('Recent Wallet Transactions (Auto-loaded)')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('Wallet transactions appear here when online payments are verified or completed. Each payment creates a credit entry in the business wallet.')}
            </p>
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>{t('Wallet transactions will appear after payments are processed')}</p>
              <p className="text-xs mt-1">{t('Try testing a JazzCash or Card payment first')}</p>
            </div>
          </Card>
        </div>
      )}

      {/* ====================================== */}
      {/* DIALOG: VERIFY PAYMENT */}
      {/* ====================================== */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <ShieldCheck className="h-5 w-5" />
              {t('Verify Payment')}
            </DialogTitle>
            <DialogDescription>
              {t('Confirm that you have received this bank transfer. The amount will be credited to the business wallet.')}
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('Customer')}:</span>
                  <span className="font-semibold">{selectedPayment.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('Amount')}:</span>
                  <span className="font-bold text-green-700 text-lg">Rs. {selectedPayment.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('Order')}:</span>
                  <span className="font-medium">#{selectedPayment.order_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('Method')}:</span>
                  <span className="font-medium">{getMethodLabel(selectedPayment.payment_method)}</span>
                </div>
                {selectedPayment.bank_account && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t('Bank Account')}:</span>
                    <span className="font-mono text-sm">{selectedPayment.bank_account}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">TXN ID:</span>
                  <span className="font-mono text-xs">{selectedPayment.transaction_id}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)} disabled={isProcessing}>
              {t('Cancel')}
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleVerify} disabled={isProcessing}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <ShieldX className="h-5 w-5" />
              {t('Reject Payment')}
            </DialogTitle>
            <DialogDescription>
              {t('Reject this payment if the bank transfer was not received. The order will revert to cash payment.')}
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('Customer')}:</span>
                  <span className="font-semibold">{selectedPayment.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('Amount')}:</span>
                  <span className="font-bold text-red-700">Rs. {selectedPayment.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('Order')}:</span>
                  <span className="font-medium">#{selectedPayment.order_id}</span>
                </div>
              </div>
              <div>
                <Label htmlFor="rejectReason">{t('Rejection reason')}</Label>
                <Input
                  id="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t('e.g., Transfer not received, wrong amount...')}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={isProcessing}>
              {t('Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldX className="h-4 w-4 mr-2" />}
              {t('Reject Payment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====================================== */}
      {/* DIALOG: PAYMENT DETAILS */}
      {/* ====================================== */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              {t('Payment Details')}
            </DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-secondary/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  {getMethodIcon(selectedPayment.payment_method)}
                  <span className="font-medium">{getMethodLabel(selectedPayment.payment_method)}</span>
                </div>
                {getStatusBadge(selectedPayment.payment_status)}
              </div>

              <div className="space-y-2 text-sm">
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
                  <div key={i} className="flex justify-between py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{item.label}:</span>
                    <span className={`${item.bold ? 'font-bold text-foreground' : 'font-medium'} ${item.mono ? 'font-mono text-xs' : ''}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {selectedPayment.error_message && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-800">{t('Error')}:</p>
                  <p className="text-xs text-red-700">{selectedPayment.error_message}</p>
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
