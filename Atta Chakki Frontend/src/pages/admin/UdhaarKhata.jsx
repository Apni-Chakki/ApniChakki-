import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../components/common/card";
import { Input } from "../../components/common/input";
import { Search, Wallet, Truck, User } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "../../config";
import { CustomerLedgerTable } from "../../components/features/admin/udhaar/CustomerLedgerTable";
import { DriverLedgerCards } from "../../components/features/admin/udhaar/DriverLedgerCards";
import { CustomerLedgerModal } from "../../components/features/admin/udhaar/CustomerLedgerModal";
import { DriverLedgerModal } from "../../components/features/admin/udhaar/DriverLedgerModal";

export function UdhaarKhata() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("customer"); // "customer" | "driver"

  // ================= CUSTOMER UDHAAR STATE =================
  const [ledgers, setLedgers] = useState([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [customerSearch, setCustomerSearch] = useState("");
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerPayDialog, setShowCustomerPayDialog] = useState(false);
  const [customerPayAmount, setCustomerPayAmount] = useState("");
  const [isProcessingCustomerPay, setIsProcessingCustomerPay] = useState(false);

  // ================= DRIVER SETTLEMENT STATE =================
  const [driversData, setDriversData] = useState([]);
  const [driverSummary, setDriverSummary] = useState({
    grand_total_cash_due: 0,
    grand_total_orders: 0,
    drivers_with_due: 0,
    total_drivers: 0,
  });
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [driverSearch, setDriverSearch] = useState("");
  const [debouncedDriverSearch, setDebouncedDriverSearch] = useState("");
  const [driverStatusFilter, setDriverStatusFilter] = useState("all"); // "all" | "pending_cash" | "cleared"

  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverPayAmount, setDriverPayAmount] = useState("");
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

  // ================= FETCH CUSTOMER LEDGERS =================
  const loadCustomerLedgers = async () => {
    setLoadingCustomer(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (debouncedCustomerSearch.trim()) {
        queryParams.append("search", debouncedCustomerSearch.trim());
      }

      const response = await fetch(`${API_BASE_URL}/get_udhaar_ledger.php?${queryParams.toString()}`);
      const result = await response.json();

      if (result.success) {
        const list = result.ledgers || result.data || [];
        setLedgers(list);
        setTotalOutstanding(result.totalOutstanding ?? result.total_outstanding ?? 0);
        if (result.pagination) {
          setTotalItems(result.pagination.total_items || 0);
        } else {
          setTotalItems(result.total ?? list.length);
        }

        // If customer modal is open, refresh selectedCustomer object
        if (selectedCustomer) {
          const updated = list.find((c) => c.phone === selectedCustomer.phone);
          if (updated) {
            setSelectedCustomer(updated);
          }
        }
      } else {
        toast.error(result.message || "Failed to fetch customer ledgers");
      }
    } catch (error) {
      console.error("Customer ledger fetch error:", error);
      toast.error("Network error while loading customer ledgers");
    } finally {
      setLoadingCustomer(false);
    }
  };

  useEffect(() => {
    if (activeTab === "customer") {
      loadCustomerLedgers();
    }
  }, [debouncedCustomerSearch, page, pageSize, activeTab]);

  // ================= FETCH DRIVER SETTLEMENTS =================
  const loadDriverSettlements = async () => {
    setLoadingDrivers(true);
    try {
      const queryParams = new URLSearchParams();
      if (debouncedDriverSearch.trim()) {
        queryParams.append("search", debouncedDriverSearch.trim());
      }
      if (driverStatusFilter !== "all") {
        queryParams.append("status", driverStatusFilter);
      }

      const response = await fetch(`${API_BASE_URL}/get_driver_settlements.php?${queryParams.toString()}`);
      const result = await response.json();

      if (result.success) {
        setDriversData(result.drivers || []);
        if (result.summary) {
          setDriverSummary(result.summary);
        } else {
          setDriverSummary({
            grand_total_cash_due: result.grand_total_cash_due || 0,
            grand_total_orders: result.grand_total_orders || 0,
            drivers_with_due: result.drivers_with_due || 0,
            total_drivers: result.total_drivers || (result.drivers ? result.drivers.length : 0),
          });
        }

        // If a driver modal is open, update selected driver data
        if (selectedDriver) {
          const updated = (result.drivers || []).find(
            (d) =>
              (d.driver_phone && d.driver_phone === selectedDriver.driver_phone) ||
              d.driver_name === selectedDriver.driver_name
          );
          if (updated) {
            setSelectedDriver(updated);
          }
        }
      } else {
        toast.error(result.message || "Failed to load driver settlements");
      }
    } catch (error) {
      console.error("Driver settlements fetch error:", error);
      toast.error("Network error while loading driver settlements");
    } finally {
      setLoadingDrivers(false);
    }
  };

  useEffect(() => {
    if (activeTab === "driver") {
      loadDriverSettlements();
    }
  }, [debouncedDriverSearch, driverStatusFilter, activeTab]);

  // ================= HANDLE CUSTOMER PAYMENT (FIFO) =================
  const handleReceiveCustomerPayment = async () => {
    const amount = parseFloat(customerPayAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid positive payment amount");
      return;
    }

    if (!selectedCustomer?.phone) {
      toast.error("Customer information missing");
      return;
    }

    setIsProcessingCustomerPay(true);
    try {
      const response = await fetch(`${API_BASE_URL}/record_udhaar_payment.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: selectedCustomer.phone,
          amount: amount,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || `Payment of Rs. ${amount.toLocaleString()} received successfully!`);
        setShowCustomerPayDialog(false);
        setCustomerPayAmount("");
        loadCustomerLedgers();
      } else {
        toast.error(result.message || "Failed to process customer payment");
      }
    } catch (error) {
      console.error("Customer payment error:", error);
      toast.error("Network error while recording customer payment");
    } finally {
      setIsProcessingCustomerPay(false);
    }
  };

  // ================= HANDLE DRIVER SETTLEMENT =================
  const handleSettleDriverPayment = async () => {
    let payload = {};
    let targetAmount = 0;

    if (selectedOrderForSettle) {
      targetAmount = parseFloat(driverPayAmount) || selectedOrderForSettle.cash_due;
      payload = {
        order_id: selectedOrderForSettle.order_id,
        driver_phone: selectedDriver?.driver_phone || "",
        driver_name: selectedDriver?.driver_name || "",
        amount: targetAmount,
      };
    } else if (selectedDriver) {
      targetAmount = parseFloat(driverPayAmount) || selectedDriver.total_cash_due;
      payload = {
        driver_phone: selectedDriver.driver_phone,
        driver_name: selectedDriver.driver_name,
        amount: targetAmount,
      };
    }

    if (isNaN(targetAmount) || targetAmount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    setIsProcessingDriverPay(true);
    try {
      const response = await fetch(`${API_BASE_URL}/record_driver_settlement.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || `Payment of Rs. ${targetAmount.toLocaleString()} recorded successfully`);
        setShowDriverPayConfirm(false);
        setDriverPayAmount("");
        setSelectedOrderForSettle(null);
        loadDriverSettlements();
      } else {
        toast.error(result.message || "Failed to record driver settlement");
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
            {activeTab === "customer"
              ? t("Manual Customer Ledger & Credit Accounts")
              : t("Driver COD Cash Collection & Daily Reconciliation")}
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center p-1 bg-muted rounded-xl border border-border shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("customer")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "customer"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-4 w-4" />
            <span>{t("Customer Udhaar")}</span>
          </button>
          <button
            onClick={() => setActiveTab("driver")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all relative ${
              activeTab === "driver"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
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
      {activeTab === "customer" && (
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
                <p className="text-[11px] sm:text-xs text-red-600 dark:text-red-400 font-medium">
                  {t("Total Outstanding Customer Debt")}
                </p>
                <p className="text-lg sm:text-xl font-bold text-red-700 dark:text-red-300 break-all">
                  Rs. {totalOutstanding.toLocaleString()}
                </p>
              </div>
            </Card>
          </div>

          <CustomerLedgerTable
            ledgers={ledgers}
            loadingCustomer={loadingCustomer}
            customerSearch={customerSearch}
            setSelectedCustomer={setSelectedCustomer}
            totalItems={totalItems}
            page={page}
            setPage={setPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            t={t}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: DRIVER CASH SETTLEMENT (COD RECONCILIATION) */}
      {/* ======================================================== */}
      {activeTab === "driver" && (
        <DriverLedgerCards
          driverSummary={driverSummary}
          driverSearch={driverSearch}
          setDriverSearch={setDriverSearch}
          driverStatusFilter={driverStatusFilter}
          setDriverStatusFilter={setDriverStatusFilter}
          loadingDrivers={loadingDrivers}
          driversData={driversData}
          setSelectedDriver={setSelectedDriver}
          setDriverPayAmount={setDriverPayAmount}
          t={t}
        />
      )}

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}
      <CustomerLedgerModal
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
        customerPayAmount={customerPayAmount}
        setCustomerPayAmount={setCustomerPayAmount}
        showCustomerPayDialog={showCustomerPayDialog}
        setShowCustomerPayDialog={setShowCustomerPayDialog}
        isProcessingCustomerPay={isProcessingCustomerPay}
        handleReceiveCustomerPayment={handleReceiveCustomerPayment}
        t={t}
      />

      <DriverLedgerModal
        selectedDriver={selectedDriver}
        setSelectedDriver={setSelectedDriver}
        driverPayAmount={driverPayAmount}
        setDriverPayAmount={setDriverPayAmount}
        showDriverPayConfirm={showDriverPayConfirm}
        setShowDriverPayConfirm={setShowDriverPayConfirm}
        selectedOrderForSettle={selectedOrderForSettle}
        setSelectedOrderForSettle={setSelectedOrderForSettle}
        isProcessingDriverPay={isProcessingDriverPay}
        handleSettleDriverPayment={handleSettleDriverPayment}
        t={t}
      />
    </div>
  );
}

export default UdhaarKhata;
