import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../components/common/card';
import { Button } from '../../components/common/button';
import { Input } from '../../components/common/input';
import { Label } from '../../components/common/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/common/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/common/dialog';
import { Badge } from '../../components/common/badge';
import { 
  Search, Phone, ChevronRight, History, CheckCircle, Wallet, Loader2, 
  Truck, User, DollarSign, ArrowRight, ShieldCheck, MapPin, PackageCheck, AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { Pagination } from '../../components/common/Pagination';

export function UdhaarKhata() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('customer'); // 'customer' | 'driver'

  // ================= CUSTOMER UDHAAR STATE =================
  const [ledgers, setLedgers] = useState([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerPayDialog, setShowCustomerPayDialog] = useState(false);
  const [customerPayAmount, setCustomerPayAmount] = useState('');
  const [isProcessingCustomerPay, setIsProcessingCustomerPay] = useState(false);

  // ================= DRIVER SETTLEMENT STATE =================
  const [driversData, setDriversData] = useState([]);
  const [driverSummary, setDriverSummary] = useState({
    grand_total_cash_due: 0,
    grand_total_orders: 0,
    drivers_with_due: 0,
    total_drivers: 0
  });
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [driverSearch, setDriverSearch] = useState('');
  const [debouncedDriverSearch, setDebouncedDriverSearch] = useState('');
  const [driverStatusFilter, setDriverStatusFilter] = useState('all'); // 'all' | 'pending_cash' | 'cleared'

  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverPayAmount, setDriverPayAmount] = useState('');
  const [selectedOrderForSettle, setSelectedOrderForSettle] = useState(null);
  const [showDriverPayConfirm, setShowDriverPayConfirm] = useState(false);
  const [isProcessingDriverPay, setIsProcessingDriverPay] = useState(false);

  // ================= DEBOUNCE SEARCHES =================
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCustomerSearch(customerSearch), 350);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDriverSearch(driverSearch), 350);
    return () => clearTimeout(timer);
  }, [driverSearch]);

  // Load Customer Ledgers
  useEffect(() => {
    if (activeTab === 'customer') {
      loadCustomerLedgers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedCustomerSearch, activeTab]);

  // Load Driver Settlements
  useEffect(() => {
    if (activeTab === 'driver') {
      loadDriverSettlements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDriverSearch, driverStatusFilter, activeTab]);

  const loadCustomerLedgers = async () => {
    try {
      setLoadingCustomer(true);
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (debouncedCustomerSearch) params.set('search', debouncedCustomerSearch);
      const response = await fetch(`${API_BASE_URL}/get_udhaar_ledger.php?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setLedgers(data.ledgers || []);
        setTotalOutstanding(data.totalOutstanding || 0);
        setTotalItems(data.total || 0);
      } else {
        toast.error(data.message || 'Failed to load ledger');
      }
    } catch (error) {
      console.error("Network Error:", error);
      toast.error("Network error: Could not connect to database");
    } finally {
      setLoadingCustomer(false);
    }
  };

  const loadDriverSettlements = async () => {
    try {
      setLoadingDrivers(true);
      const params = new URLSearchParams();
      if (debouncedDriverSearch) params.set('search', debouncedDriverSearch);
      if (driverStatusFilter !== 'all') params.set('status', driverStatusFilter);

      const response = await fetch(`${API_BASE_URL}/get_driver_cash_settlement.php?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setDriversData(data.drivers || []);
        setDriverSummary({
          grand_total_cash_due: data.grand_total_cash_due || 0,
          grand_total_orders: data.grand_total_orders || 0,
          drivers_with_due: data.drivers_with_due || 0,
          total_drivers: data.total_drivers || 0
        });

        // Update selected driver in modal if currently open
        if (selectedDriver) {
          const updatedDriver = (data.drivers || []).find(
            d => (d.driver_phone && d.driver_phone === selectedDriver.driver_phone) || d.driver_name === selectedDriver.driver_name
          );
          if (updatedDriver) {
            setSelectedDriver(updatedDriver);
          }
        }
      } else {
        toast.error(data.message || 'Failed to load driver settlements');
      }
    } catch (error) {
      console.error("Driver fetch error:", error);
      toast.error("Network error while fetching driver cash data");
    } finally {
      setLoadingDrivers(false);
    }
  };

  // ================= CUSTOMER PAYMENT HANDLER =================
  const handleReceiveCustomerPayment = async () => {
    if (!selectedCustomer || !customerPayAmount) return;

    const amountReceived = parseFloat(customerPayAmount);
    if (isNaN(amountReceived) || amountReceived <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const customerDebt = parseFloat(selectedCustomer.totalDebt) || 0;
    if (amountReceived > customerDebt) {
      toast.error(`Amount exceeds total debt of Rs. ${customerDebt.toLocaleString()}`);
      return;
    }

    setIsProcessingCustomerPay(true);
    try {
      const response = await fetch(`${API_BASE_URL}/record_udhaar_payment.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedCustomer.phone,
          amount: amountReceived
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || `Payment of Rs. ${amountReceived.toLocaleString()} recorded successfully`);
        setShowCustomerPayDialog(false);
        setCustomerPayAmount('');
        setSelectedCustomer(null);
        loadCustomerLedgers();
      } else {
        toast.error(result.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error("Payment Error:", error);
      toast.error('Network error while recording payment');
    } finally {
      setIsProcessingCustomerPay(false);
    }
  };

  // ================= DRIVER PAYMENT HANDLER =================
  const handleSettleDriverPayment = async () => {
    if (!selectedDriver && !selectedOrderForSettle) return;

    let payload = {};
    let targetAmount = 0;

    if (selectedOrderForSettle) {
      targetAmount = parseFloat(driverPayAmount) || selectedOrderForSettle.cash_due;
      payload = {
        order_id: selectedOrderForSettle.order_id,
        driver_phone: selectedDriver?.driver_phone || '',
        driver_name: selectedDriver?.driver_name || '',
        amount: targetAmount
      };
    } else if (selectedDriver) {
      targetAmount = parseFloat(driverPayAmount) || selectedDriver.total_cash_due;
      payload = {
        driver_phone: selectedDriver.driver_phone,
        driver_name: selectedDriver.driver_name,
        amount: targetAmount
      };
    }

    if (isNaN(targetAmount) || targetAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setIsProcessingDriverPay(true);
    try {
      const response = await fetch(`${API_BASE_URL}/record_driver_settlement.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || `Payment of Rs. ${targetAmount.toLocaleString()} recorded successfully`);
        setShowDriverPayConfirm(false);
        setDriverPayAmount('');
        setSelectedOrderForSettle(null);
        loadDriverSettlements();
      } else {
        toast.error(result.message || 'Failed to record driver settlement');
      }
    } catch (error) {
      console.error("Driver settlement error:", error);
      toast.error("Network error while recording settlement");
    } finally {
      setIsProcessingDriverPay(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header & Main Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">{t("Udhaar Khata")}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {activeTab === 'customer' 
              ? t("Manual Customer Ledger & Credit Accounts") 
              : t("Driver COD Cash Collection & Daily Reconciliation")}
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center p-1 bg-muted rounded-xl border border-border shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('customer')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'customer'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-4 w-4" />
            <span>{t("Customer Udhaar")}</span>
          </button>
          <button
            onClick={() => setActiveTab('driver')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all relative ${
              activeTab === 'driver'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>{t("Driver Cash Settlement")}</span>
            {driverSummary.grand_total_cash_due > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CUSTOMER UDHAAR (MANUAL CREDIT ONLY) */}
      {/* ======================================================== */}
      {activeTab === 'customer' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Top Stat Summary */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("Search by customer name or phone...")}
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>

            <Card className="px-4 py-2.5 bg-red-500/10 border-red-500/20 flex items-center gap-3 shrink-0">
              <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs text-red-600 dark:text-red-400 font-medium">{t("Total Outstanding Customer Debt")}</p>
                <p className="text-lg sm:text-xl font-bold text-red-700 dark:text-red-300 break-all">
                  Rs. {totalOutstanding.toLocaleString()}
                </p>
              </div>
            </Card>
          </div>

          {loadingCustomer && ledgers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">{t("Loading Customer Udhaar Ledger...")}</p>
            </div>
          ) : (
            <>
              {/* Mobile View: Cards */}
              <div className="md:hidden space-y-3">
                {ledgers.length === 0 ? (
                  <Card className="p-6 text-center text-sm text-muted-foreground">
                    {customerSearch ? t("No customers found matching your search.") : t("No outstanding customer debts! Good job.")}
                  </Card>
                ) : (
                  ledgers.map((customer) => (
                    <Card key={customer.phone} className="p-3.5 space-y-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm break-words">{customer.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 break-all">
                            <Phone className="h-3 w-3 shrink-0" />
                            {customer.phone}
                          </p>
                        </div>
                        <Badge variant="destructive" className="shrink-0 text-xs">
                          Rs. {customer.totalDebt.toLocaleString()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-center">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase">{t("Pending Orders")}</p>
                          <p className="text-sm font-semibold">{customer.orderCount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase">{t("Last Order")}</p>
                          <p className="text-xs font-medium">{customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        {t("View & Settle")} <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Card>
                  ))
                )}
              </div>

              {/* Desktop View: Table */}
              <Card className="hidden md:block overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>{t("Customer")}</TableHead>
                      <TableHead>{t("Phone")}</TableHead>
                      <TableHead>{t("Pending Orders")}</TableHead>
                      <TableHead>{t("Last Order")}</TableHead>
                      <TableHead>{t("Total Debt")}</TableHead>
                      <TableHead className="text-right">{t("Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          {customerSearch ? t("No customers found matching your search.") : t("No outstanding customer debts! Good job.")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledgers.map((customer) => (
                        <TableRow key={customer.phone}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                {customer.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold">{customer.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                              <Phone className="h-3.5 w-3.5" />
                              {customer.phone}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{customer.orderCount} {t("Orders")}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <span className="text-red-600 font-bold text-base">Rs. {customer.totalDebt.toLocaleString()}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedCustomer(customer)}
                            >
                              {t("View & Settle")} <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {totalItems > 0 && (
                  <Pagination
                    currentPage={page}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                    className="p-4"
                  />
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: DRIVER CASH SETTLEMENT (COD RECONCILIATION) */}
      {/* ======================================================== */}
      {activeTab === 'driver' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card className="p-4 bg-amber-500/10 border-amber-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium uppercase tracking-wider">{t("Total Cash Due from Drivers")}</p>
                  <p className="text-xl sm:text-2xl font-bold text-amber-800 dark:text-amber-300 mt-1">
                    Rs. {driverSummary.grand_total_cash_due.toLocaleString()}
                  </p>
                </div>
                <div className="h-11 w-11 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <DollarSign className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-blue-500/10 border-blue-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium uppercase tracking-wider">{t("Pending COD Orders")}</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-800 dark:text-blue-300 mt-1">
                    {driverSummary.grand_total_orders}
                  </p>
                </div>
                <div className="h-11 w-11 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-emerald-500/10 border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium uppercase tracking-wider">{t("Riders with Cash")}</p>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">
                    {driverSummary.drivers_with_due} / {driverSummary.total_drivers}
                  </p>
                </div>
                <div className="h-11 w-11 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </Card>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("Search by rider name, phone, or order #...")}
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg border border-border overflow-x-auto shrink-0">
              <button
                onClick={() => setDriverStatusFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  driverStatusFilter === 'all'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t("All Riders")}
              </button>
              <button
                onClick={() => setDriverStatusFilter('pending_cash')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  driverStatusFilter === 'pending_cash'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t("Cash Due Only")}
              </button>
              <button
                onClick={() => setDriverStatusFilter('cleared')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  driverStatusFilter === 'cleared'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t("Cleared / Settled")}
              </button>
            </div>
          </div>

          {/* Drivers List */}
          {loadingDrivers && driversData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">{t("Loading Rider Settlements...")}</p>
            </div>
          ) : driversData.length === 0 ? (
            <Card className="p-8 text-center space-y-2">
              <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="text-base font-semibold">{t("No driver cash pending settlement!")}</p>
              <p className="text-xs text-muted-foreground">
                {driverSearch ? t("No riders match your search criteria.") : t("All COD collections from drivers are fully reconciled.")}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {driversData.map((driver) => {
                const hasCashDue = driver.total_cash_due > 0;
                return (
                  <Card 
                    key={driver.driver_phone || driver.driver_name} 
                    className={`p-4 space-y-4 transition-all hover:shadow-md border ${
                      hasCashDue ? 'border-amber-500/30 bg-card' : 'border-border/60 bg-muted/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-base font-bold shrink-0 ${
                          hasCashDue ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Truck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm sm:text-base text-foreground truncate">{driver.driver_name}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            {driver.driver_phone || 'No phone'}
                          </p>
                        </div>
                      </div>

                      {hasCashDue ? (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs px-2.5 py-0.5">
                          {t("Cash Due")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-xs px-2.5 py-0.5">
                          {t("Settled")}
                        </Badge>
                      )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-muted/40 rounded-lg border border-border text-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">{t("Assigned")}</p>
                        <p className="text-xs sm:text-sm font-semibold">{driver.total_orders}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">{t("Pending Cash")}</p>
                        <p className="text-xs sm:text-sm font-semibold text-amber-600">{driver.pending_cash_orders}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">{t("Delivered")}</p>
                        <p className="text-xs sm:text-sm font-semibold text-emerald-600">{driver.delivered_orders}</p>
                      </div>
                    </div>

                    {/* Cash Owed Highlight */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground font-medium">{t("Cash Due to Admin")}:</span>
                      <span className={`text-base font-bold ${hasCashDue ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                        Rs. {driver.total_cash_due.toLocaleString()}
                      </span>
                    </div>

                    {/* Actions */}
                    <Button
                      className={`w-full font-medium ${
                        hasCashDue 
                          ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm' 
                          : 'variant-outline'
                      }`}
                      size="sm"
                      variant={hasCashDue ? 'default' : 'outline'}
                      onClick={() => {
                        setSelectedDriver(driver);
                        setDriverPayAmount(driver.total_cash_due > 0 ? String(driver.total_cash_due) : '');
                      }}
                    >
                      {hasCashDue ? t("Settle Driver Cash") : t("View Order History")}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CUSTOMER UDHAAR SETTLEMENT DIALOG */}
      {/* ======================================================== */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => { 
        if(!open) {
          setSelectedCustomer(null);
          setCustomerPayAmount('');
        }
      }}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-lg md:max-w-xl w-full flex flex-col p-4 sm:p-6" style={{ maxHeight: '90vh', overflow: 'hidden' }}>
          <DialogHeader className="flex-shrink-0 border-b pb-3 text-left">
            <div className="flex items-start justify-between gap-2 pr-10 sm:pr-12">
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground truncate">
                  {selectedCustomer?.name}
                </DialogTitle>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Phone className="h-3 w-3 shrink-0" /> {selectedCustomer?.phone}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">{t("Total Due")}</p>
                <p className="text-base sm:text-lg font-extrabold text-red-600 dark:text-red-400">
                  Rs. {parseFloat(selectedCustomer?.totalDebt || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
            {/* Payment Action */}
            <div className="bg-muted/40 p-3 sm:p-4 rounded-xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="payAmount" className="text-xs sm:text-sm font-semibold">{t("Receive Customer Payment")}</Label>
                <button 
                  type="button"
                  onClick={() => setCustomerPayAmount(String(selectedCustomer?.totalDebt || ''))}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  {t("Pay Full Due")}
                </button>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  id="payAmount"
                  type="number"
                  placeholder={t("Enter amount...")}
                  value={customerPayAmount}
                  onChange={(e) => setCustomerPayAmount(e.target.value)}
                  className="w-full text-sm"
                  disabled={isProcessingCustomerPay}
                />
                <Button
                  onClick={() => setShowCustomerPayDialog(true)}
                  disabled={!customerPayAmount || parseFloat(customerPayAmount) <= 0 || isProcessingCustomerPay}
                  className="bg-green-600 hover:bg-green-700 text-white shrink-0 font-medium w-full sm:w-auto"
                >
                  <CheckCircle className="h-4 w-4 mr-1.5 text-white" />
                  {t("Settle Payment")}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t("This will automatically pay off oldest manual orders first (FIFO).")}
              </p>
            </div>

            {/* Order History */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center justify-between text-xs sm:text-sm">
                <span className="flex items-center gap-1.5">
                  <History className="h-4 w-4 text-primary" /> {t("Outstanding Orders History")}
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  {selectedCustomer?.orders?.length || 0} {t("Orders")}
                </span>
              </h4>

              {/* Mobile View: Order Cards */}
              <div className="sm:hidden space-y-2.5">
                {selectedCustomer?.orders?.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">{t("No outstanding orders found.")}</p>
                ) : (
                  selectedCustomer?.orders?.map(order => (
                    <div key={order.order_id} className="p-3 rounded-lg border border-border bg-card space-y-2 shadow-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded">
                            #{order.order_id}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <Badge
                          variant={order.payment_status === 'pending' ? 'destructive' : 'secondary'}
                          className="capitalize text-[10px] px-2 py-0.5"
                        >
                          {order.payment_status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 py-1.5 px-2 bg-muted/40 rounded-md text-center text-xs">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase">{t("Total")}</p>
                          <p className="font-semibold text-foreground">Rs. {order.total?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase">{t("Paid")}</p>
                          <p className="font-semibold text-emerald-600">Rs. {(order.amount_paid || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase">{t("Due")}</p>
                          <p className="font-bold text-red-600">Rs. {(order.outstanding || order.total)?.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden sm:block border rounded-md overflow-x-auto" style={{ maxHeight: 'calc(85vh - 300px)', overflowY: 'auto' }}>
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background border-b">
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="px-3 py-2 text-xs">{t("Date")}</TableHead>
                      <TableHead className="px-3 py-2 text-xs">{t("#ID")}</TableHead>
                      <TableHead className="px-3 py-2 text-xs">{t("Total")}</TableHead>
                      <TableHead className="px-3 py-2 text-xs">{t("Paid")}</TableHead>
                      <TableHead className="px-3 py-2 text-xs">{t("Due")}</TableHead>
                      <TableHead className="px-3 py-2 text-xs">{t("Status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCustomer?.orders?.map(order => (
                      <TableRow key={order.order_id}>
                        <TableCell className="px-3 py-2 text-xs">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="px-3 py-2 font-mono text-xs">#{order.order_id}</TableCell>
                        <TableCell className="px-3 py-2 text-xs">Rs. {order.total?.toLocaleString()}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-green-600">Rs. {(order.amount_paid || 0).toLocaleString()}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-red-600 font-bold">Rs. {(order.outstanding || order.total)?.toLocaleString()}</TableCell>
                        <TableCell className="px-3 py-2">
                          <Badge
                            variant={order.payment_status === 'pending' ? 'destructive' : 'secondary'}
                            className="capitalize text-xs px-2 py-0.5"
                          >
                            {order.payment_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)} className="w-full sm:w-auto">{t("Close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Customer Payment Dialog */}
      <Dialog open={showCustomerPayDialog} onOpenChange={setShowCustomerPayDialog}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{t("Confirm Customer Payment")}</DialogTitle>
            <DialogDescription className="pt-2">
              {t("Are you sure you want to receive")} <strong>Rs. {parseFloat(customerPayAmount || 0).toLocaleString()}</strong> {t("from")} <strong>{selectedCustomer?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCustomerPayDialog(false)} disabled={isProcessingCustomerPay} className="w-full sm:w-auto">{t("Cancel")}</Button>
            <Button onClick={handleReceiveCustomerPayment} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" disabled={isProcessingCustomerPay}>
              {isProcessingCustomerPay ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {isProcessingCustomerPay ? t("Processing...") : t("Confirm & Update Ledger")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 2: DRIVER CASH SETTLEMENT DETAILS & ACTION DIALOG */}
      {/* ======================================================== */}
      <Dialog open={!!selectedDriver} onOpenChange={(open) => { 
        if(!open) {
          setSelectedDriver(null);
          setDriverPayAmount('');
          setSelectedOrderForSettle(null);
        }
      }}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-2xl w-full flex flex-col p-4 sm:p-6" style={{ maxHeight: '90vh', overflow: 'hidden' }}>
          <DialogHeader className="flex-shrink-0 border-b pb-3 text-left">
            <div className="flex items-start justify-between gap-2 pr-10 sm:pr-12">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-600 font-bold shrink-0">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base sm:text-lg font-bold truncate">{selectedDriver?.driver_name}</DialogTitle>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" /> {selectedDriver?.driver_phone || 'No phone'}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">{t("Cash Due to Admin")}</p>
                <p className="text-base sm:text-lg font-extrabold text-amber-600 dark:text-amber-400">
                  Rs. {parseFloat(selectedDriver?.total_cash_due || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
            {/* Quick Settle All Card */}
            {selectedDriver?.total_cash_due > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 sm:p-4 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                      {t("Receive Cash Handover from Rider")}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      {t("Admin records COD collected by driver and marks orders as paid.")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs shrink-0 font-semibold w-full sm:w-auto"
                    onClick={() => {
                      setSelectedOrderForSettle(null);
                      setDriverPayAmount(String(selectedDriver.total_cash_due));
                      setShowDriverPayConfirm(true);
                    }}
                  >
                    {t("Settle Full Due (Rs. ")}{parseFloat(selectedDriver.total_cash_due || 0).toLocaleString()})
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-amber-500/20">
                  <Input
                    type="number"
                    placeholder={t("Or enter custom partial amount...")}
                    value={driverPayAmount}
                    onChange={(e) => setDriverPayAmount(e.target.value)}
                    className="h-9 text-xs flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-300 w-full sm:w-auto"
                    disabled={!driverPayAmount || parseFloat(driverPayAmount) <= 0}
                    onClick={() => {
                      setSelectedOrderForSettle(null);
                      setShowDriverPayConfirm(true);
                    }}
                  >
                    {t("Receive Custom Amount")}
                  </Button>
                </div>
              </div>
            )}

            {/* Assigned Orders List */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs sm:text-sm flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <PackageCheck className="h-4 w-4 text-primary" /> {t("Assigned Orders Breakdown")}
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  {selectedDriver?.orders?.length || 0} {t("Orders")}
                </span>
              </h4>

              {/* Mobile View: Order Cards */}
              <div className="sm:hidden space-y-2.5">
                {selectedDriver?.orders?.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">{t("No orders assigned to this driver yet.")}</p>
                ) : (
                  selectedDriver?.orders?.map((ord) => {
                    const isPaid = ord.payment_status === 'paid' || ord.cash_due <= 0;
                    return (
                      <div 
                        key={ord.order_id} 
                        className={`p-3 rounded-lg border border-border space-y-2.5 ${
                          isPaid ? 'bg-muted/20 opacity-75' : 'bg-card shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded">
                              #{ord.order_id}
                            </span>
                            <span className="text-[11px] text-muted-foreground ml-2">
                              {new Date(ord.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] px-1.5 py-0 capitalize ${
                                ord.status === 'completed' 
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                  : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                              }`}
                            >
                              {ord.status}
                            </Badge>
                            <Badge 
                              className={`text-[10px] px-1.5 py-0 capitalize ${
                                isPaid ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                              }`}
                            >
                              {isPaid ? t("Paid") : t("Unpaid COD")}
                            </Badge>
                          </div>
                        </div>

                        <div className="text-xs space-y-0.5">
                          <p className="font-semibold text-foreground">{ord.customer_name}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5 shrink-0" /> {ord.customer_phone}
                          </p>
                          {ord.shipping_address && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                              <MapPin className="h-2.5 w-2.5 shrink-0" /> {ord.shipping_address}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-border text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground">{t("Total")}: </span>
                            <span className="font-medium">Rs. {ord.total_amount?.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground">{t("COD Due")}: </span>
                            <span className={`font-bold ${ord.cash_due > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                              Rs. {ord.cash_due?.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {ord.cash_due > 0 ? (
                          <Button
                            size="sm"
                            className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            onClick={() => {
                              setSelectedOrderForSettle(ord);
                              setDriverPayAmount(String(ord.cash_due));
                              setShowDriverPayConfirm(true);
                            }}
                          >
                            {t("Collect Cash (Rs. ")}{ord.cash_due?.toLocaleString()})
                          </Button>
                        ) : (
                          <div className="text-center text-xs text-emerald-600 font-semibold py-1 flex items-center justify-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> {t("Settled & Cleared")}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden sm:block border rounded-lg overflow-x-auto" style={{ maxHeight: 'calc(80vh - 280px)', overflowY: 'auto' }}>
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background border-b">
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs px-3 py-2">{t("Order #")}</TableHead>
                      <TableHead className="text-xs px-3 py-2">{t("Customer")}</TableHead>
                      <TableHead className="text-xs px-3 py-2">{t("Status")}</TableHead>
                      <TableHead className="text-xs px-3 py-2">{t("Total")}</TableHead>
                      <TableHead className="text-xs px-3 py-2">{t("COD Due")}</TableHead>
                      <TableHead className="text-xs px-3 py-2 text-right">{t("Action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDriver?.orders?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                          {t("No orders assigned to this driver yet.")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedDriver?.orders?.map((ord) => {
                        const isPaid = ord.payment_status === 'paid' || ord.cash_due <= 0;
                        return (
                          <TableRow key={ord.order_id} className={isPaid ? 'opacity-70 bg-muted/20' : ''}>
                            <TableCell className="px-3 py-2 font-mono text-xs font-bold">
                              #{ord.order_id}
                              <p className="text-[10px] text-muted-foreground font-normal">
                                {new Date(ord.created_at).toLocaleDateString()}
                              </p>
                            </TableCell>
                            <TableCell className="px-3 py-2 text-xs">
                              <p className="font-semibold truncate max-w-[140px]">{ord.customer_name}</p>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" /> {ord.customer_phone}
                              </p>
                              {ord.shipping_address && (
                                <p className="text-[10px] text-muted-foreground truncate max-w-[140px] flex items-center gap-1">
                                  <MapPin className="h-2.5 w-2.5" /> {ord.shipping_address}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <div className="space-y-1">
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] px-1.5 py-0 capitalize ${
                                    ord.status === 'completed' 
                                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                      : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                  }`}
                                >
                                  {ord.status}
                                </Badge>
                                <div>
                                  <Badge 
                                    className={`text-[10px] px-1.5 py-0 capitalize ${
                                      isPaid 
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-amber-600 text-white'
                                    }`}
                                  >
                                    {isPaid ? t("Paid") : t("Unpaid COD")}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-2 text-xs font-medium">
                              Rs. {ord.total_amount?.toLocaleString()}
                            </TableCell>
                            <TableCell className="px-3 py-2 text-xs font-bold">
                              {ord.cash_due > 0 ? (
                                <span className="text-amber-600 dark:text-amber-400">Rs. {ord.cash_due?.toLocaleString()}</span>
                              ) : (
                                <span className="text-emerald-600 font-normal">Rs. 0</span>
                              )}
                            </TableCell>
                            <TableCell className="px-3 py-2 text-right">
                              {ord.cash_due > 0 ? (
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5"
                                  onClick={() => {
                                    setSelectedOrderForSettle(ord);
                                    setDriverPayAmount(String(ord.cash_due));
                                    setShowDriverPayConfirm(true);
                                  }}
                                >
                                  {t("Collect Cash")}
                                </Button>
                              ) : (
                                <span className="text-xs text-emerald-600 font-semibold flex items-center justify-end gap-1">
                                  <CheckCircle className="h-3.5 w-3.5" /> {t("Settled")}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => setSelectedDriver(null)} className="w-full sm:w-auto">{t("Close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Driver Cash Settlement Dialog */}
      <Dialog open={showDriverPayConfirm} onOpenChange={setShowDriverPayConfirm}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-600" />
              {t("Confirm Driver Cash Handover")}
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              {selectedOrderForSettle ? (
                <div>
                  <p>{t("Record cash collected from rider")} <strong>{selectedDriver?.driver_name}</strong> {t("for order")} <strong>#{selectedOrderForSettle.order_id}</strong>:</p>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    Rs. {parseFloat(driverPayAmount || selectedOrderForSettle.cash_due || 0).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div>
                  <p>{t("Record lump-sum cash handover from rider")} <strong>{selectedDriver?.driver_name}</strong> {t("to clear pending COD orders")}:</p>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    Rs. {parseFloat(driverPayAmount || selectedDriver?.total_cash_due || 0).toLocaleString()}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDriverPayConfirm(false)} disabled={isProcessingDriverPay} className="w-full sm:w-auto">{t("Cancel")}</Button>
            <Button onClick={handleSettleDriverPayment} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto" disabled={isProcessingDriverPay}>
              {isProcessingDriverPay ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {isProcessingDriverPay ? t("Recording...") : t("Confirm & Update System")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default UdhaarKhata;
