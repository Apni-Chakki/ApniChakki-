import { useState, useEffect, useCallback } from "react";
import { Button } from "../../components/common/button";
import { Badge } from "../../components/common/badge";
import {
  Wallet,
  CreditCard,
  Clock,
  RefreshCcw,
  Loader2,
  Settings2,
} from "lucide-react";
import { API_BASE_URL } from "../../config";
import { useAuth } from "../../store/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { sendWhatsAppMessage } from "../../utils/whatsappHelper";

import { PaymentStatsCards } from "../../components/features/admin/paymentVerification/PaymentStatsCards";
import { PendingTransfersTab } from "../../components/features/admin/paymentVerification/PendingTransfersTab";
import { PaymentHistoryTab } from "../../components/features/admin/paymentVerification/PaymentHistoryTab";
import { WalletLogTab } from "../../components/features/admin/paymentVerification/WalletLogTab";
import { PaymentMethodsTab } from "../../components/features/admin/paymentVerification/PaymentMethodsTab";
import {
  VerifyPaymentDialog,
  RejectPaymentDialog,
  RejectionSuccessDialog,
  PaymentDetailsDialog,
  BankDetailsEditDialog,
} from "../../components/features/admin/paymentVerification/PaymentModals";

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
  const [activeTab, setActiveTab] = useState("pending"); // "pending", "history", "wallet", "settings"
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, methodFilter, pageSize, activeTab]);

  // Dialog states
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionSuccessData, setRejectionSuccessData] = useState(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [paySettings, setPaySettings] = useState({
    pay_method_cod_enabled: "1",
    pay_method_jazzcash_enabled: "1",
    pay_method_card_enabled: "1",
    pay_method_bank_enabled: "1",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Bank Account edit state
  const [showBankEditDialog, setShowBankEditDialog] = useState(false);
  const [editBankForm, setEditBankForm] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
    iban: "",
  });
  const [isUpdatingBank, setIsUpdatingBank] = useState(false);

  // API helper
  const apiCall = useCallback(
    async (action, extraData = {}) => {
      const response = await fetch(`${API_BASE_URL}/manage_wallets.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, user_id: user?.id, ...extraData }),
      });
      return response.json();
    },
    [user]
  );

  // Fetch all data
  const fetchData = useCallback(
    async (showToast = false) => {
      setRefreshing(true);
      try {
        const [balanceRes, historyRes, pendingRes, statsRes, settingsRes] =
          await Promise.all([
            apiCall("get_balance"),
            apiCall("get_payment_history", {
              status: statusFilter,
              method: methodFilter,
              search: debouncedSearch,
              page,
              limit: pageSize,
            }),
            apiCall("get_pending_verification"),
            apiCall("get_payment_stats"),
            fetch(`${API_BASE_URL}/get_store_settings.php`).then((r) => r.json()),
          ]);

        if (balanceRes.success) setWalletBalance(balanceRes);
        if (historyRes.success) {
          setPaymentHistory(historyRes.payments || []);
          setTotalItems(historyRes.total || 0);
        }
        if (pendingRes.success) setPendingTransfers(pendingRes.pending_transfers || []);
        if (statsRes.success) setPaymentStats(statsRes);

        if (settingsRes.success && settingsRes.settings) {
          setPaySettings({
            pay_method_cod_enabled: settingsRes.settings.pay_method_cod_enabled ?? "1",
            pay_method_jazzcash_enabled:
              settingsRes.settings.pay_method_jazzcash_enabled ?? "1",
            pay_method_card_enabled:
              settingsRes.settings.pay_method_card_enabled ?? "1",
            pay_method_bank_enabled:
              settingsRes.settings.pay_method_bank_enabled ?? "1",
          });
        }

        if (showToast) toast.success(t("Data refreshed"));
      } catch (error) {
        console.error("Fetch error:", error);
        toast.error(t("Failed to load payment data"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiCall, statusFilter, methodFilter, debouncedSearch, page, pageSize, t]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Verify bank payment
  const handleVerify = async () => {
    if (!selectedPayment) return;
    setIsProcessing(true);
    try {
      const result = await apiCall("verify_bank_payment", {
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
      toast.error(t("Verification failed"));
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject bank payment
  const handleReject = async () => {
    if (!selectedPayment) return;
    setIsProcessing(true);
    try {
      const result = await apiCall("reject_bank_payment", {
        payment_transaction_id: selectedPayment.id,
        reason: rejectReason || "Rejected by admin",
      });
      if (result.success) {
        toast.success(result.message);
        setShowRejectDialog(false);
        setRejectReason("");

        // Formulate WhatsApp redirection message
        let formattedPhone = "";
        let whatsappMsg = "";
        if (result.customer_phone) {
          const customerPhone = result.customer_phone.replace(/\D/g, "");
          formattedPhone = customerPhone.startsWith("0")
            ? "92" + customerPhone.substring(1)
            : customerPhone.startsWith("92")
            ? customerPhone
            : "92" + customerPhone;

          whatsappMsg = encodeURIComponent(
            `❌ *Suchi Chakki — Payment Rejection & COD Conversion* ❌\n\n` +
              `Assalam-o-Alaikum ${result.customer_name || "Customer"}!\n\n` +
              `We regret to inform you that your Bank Transfer payment of *Rs. ${result.amount?.toLocaleString()}* for *Order #${result.order_id}* (TXN ID: ${result.transaction_id || "N/A"}) could not be verified and has been rejected.\n\n` +
              `⚠️ *Reason for Rejection:* ${result.reason || "Incorrect transaction ID or amount not received"}\n\n` +
              `🔄 *Convert to COD:* Your order has been converted to *Cash on Delivery (COD)*. / آپ کا آرڈر کیش آن ڈلیوری پر منتقل کر دیا گیا ہے۔\n\n` +
              `Please pay *Rs. ${result.amount?.toLocaleString()}* in cash upon delivery. Thank you. / برائے مہربانی ڈلیوری کے وقت کیش ادا کریں۔\n\n` +
              `JazakAllah! 🙏🌾`
          );
        }

        // Set rejection success data for the zero-block dialog
        setRejectionSuccessData({
          order_id: result.order_id,
          customer_name: result.customer_name || "Customer",
          amount: result.amount,
          reason: result.reason,
          phone: formattedPhone,
          whatsappMsg: whatsappMsg,
        });

        setSelectedPayment(null);
        fetchData();
        setShowSuccessDialog(true); // Open the success popup

        // Open WhatsApp link in new tab (as automatic attempt)
        if (formattedPhone) {
          setTimeout(() => {
            sendWhatsAppMessage(formattedPhone, whatsappMsg);
          }, 1000);
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(t("Rejection failed"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePaySettings = async (key, value) => {
    const newValue = value ? "1" : "0";
    setSettingsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/update_store_settings.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { [key]: newValue },
        }),
      });
      const data = await response.json();
      if (data.success) {
        setPaySettings((prev) => ({ ...prev, [key]: newValue }));
        toast.success(t("Payment method updated"));
      } else {
        toast.error(data.message || t("Update failed"));
      }
    } catch (error) {
      toast.error(t("Network error"));
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveBankDetails = async () => {
    if (!editBankForm.bank_name || !editBankForm.account_name || !editBankForm.account_number) {
      toast.error(t("Bank Name, Account Title, and Account Number are required"));
      return;
    }
    setIsUpdatingBank(true);
    try {
      const res = await apiCall("update_bank_details", editBankForm);
      if (res.success) {
        toast.success(res.message || t("Bank transfer details updated successfully"));
        setShowBankEditDialog(false);
        fetchData();
      } else {
        toast.error(res.message || t("Failed to update bank details"));
      }
    } catch (err) {
      toast.error(t("Network error while updating bank details"));
    } finally {
      setIsUpdatingBank(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{t("Loading payment data...")}</p>
      </div>
    );
  }

  const tabsConfig = [
    {
      id: "pending",
      label: t("Pending Verification"),
      shortLabel: t("Pending"),
      icon: Clock,
      count: pendingTransfers.length,
    },
    {
      id: "history",
      label: t("Payment History"),
      shortLabel: t("History"),
      icon: CreditCard,
      count: null,
    },
    {
      id: "wallet",
      label: t("Wallet Log"),
      shortLabel: t("Wallet"),
      icon: Wallet,
      count: null,
    },
    {
      id: "settings",
      label: t("Manage Methods"),
      shortLabel: t("Methods"),
      icon: Settings2,
      count: null,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 pb-8 sm:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-5 w-5 sm:h-7 sm:w-7 text-primary shrink-0" />
            <span className="truncate">{t("Payments & Wallet")}</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            {t("Verify payments, check wallet balance, and view transaction history")}
          </p>
        </div>
        <Button
          onClick={() => fetchData(true)}
          variant="outline"
          size="sm"
          disabled={refreshing}
          className="w-full sm:w-auto"
        >
          <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {t("Refresh")}
        </Button>
      </div>

      {/* Wallet Balance Cards */}
      <PaymentStatsCards walletBalance={walletBalance} t={t} />

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:flex gap-1.5 sm:gap-2 border-b border-border/40 pb-2 sm:pb-0">
        {tabsConfig.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium rounded-lg sm:rounded-t-lg sm:rounded-b-none border sm:border-0 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-secondary hover:border-secondary"
            }`}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">{tab.shortLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count > 0 && (
              <Badge className="ml-0.5 bg-red-500 text-white text-[10px] px-1.5 py-0">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* TAB: PENDING VERIFICATION */}
      {activeTab === "pending" && (
        <PendingTransfersTab
          pendingTransfers={pendingTransfers}
          setSelectedPayment={setSelectedPayment}
          setShowVerifyDialog={setShowVerifyDialog}
          setShowRejectDialog={setShowRejectDialog}
          t={t}
        />
      )}

      {/* TAB: PAYMENT HISTORY */}
      {activeTab === "history" && (
        <PaymentHistoryTab
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          methodFilter={methodFilter}
          setMethodFilter={setMethodFilter}
          filteredHistory={paymentHistory}
          totalItems={totalItems}
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          setSelectedPayment={setSelectedPayment}
          setShowDetailsDialog={setShowDetailsDialog}
          t={t}
        />
      )}

      {/* TAB: WALLET LOG */}
      {activeTab === "wallet" && (
        <WalletLogTab
          walletBalance={walletBalance}
          setEditBankForm={setEditBankForm}
          setShowBankEditDialog={setShowBankEditDialog}
          t={t}
        />
      )}

      {/* TAB: MANAGE METHODS */}
      {activeTab === "settings" && (
        <PaymentMethodsTab
          paySettings={paySettings}
          handleUpdatePaySettings={handleUpdatePaySettings}
          settingsLoading={settingsLoading}
          walletBalance={walletBalance}
          setEditBankForm={setEditBankForm}
          setShowBankEditDialog={setShowBankEditDialog}
          t={t}
        />
      )}

      {/* MODALS */}
      <VerifyPaymentDialog
        showVerifyDialog={showVerifyDialog}
        setShowVerifyDialog={setShowVerifyDialog}
        selectedPayment={selectedPayment}
        handleVerify={handleVerify}
        isProcessing={isProcessing}
        t={t}
      />

      <RejectPaymentDialog
        showRejectDialog={showRejectDialog}
        setShowRejectDialog={setShowRejectDialog}
        selectedPayment={selectedPayment}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        handleReject={handleReject}
        isProcessing={isProcessing}
        t={t}
      />

      <RejectionSuccessDialog
        showSuccessDialog={showSuccessDialog}
        setShowSuccessDialog={setShowSuccessDialog}
        rejectionSuccessData={rejectionSuccessData}
        t={t}
      />

      <PaymentDetailsDialog
        showDetailsDialog={showDetailsDialog}
        setShowDetailsDialog={setShowDetailsDialog}
        selectedPayment={selectedPayment}
        t={t}
      />

      <BankDetailsEditDialog
        showBankEditDialog={showBankEditDialog}
        setShowBankEditDialog={setShowBankEditDialog}
        editBankForm={editBankForm}
        setEditBankForm={setEditBankForm}
        handleSaveBankDetails={handleSaveBankDetails}
        isUpdatingBank={isUpdatingBank}
        t={t}
      />
    </div>
  );
}

export default PaymentVerification;
