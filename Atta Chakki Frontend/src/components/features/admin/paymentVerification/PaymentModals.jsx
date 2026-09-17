import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../../common/dialog";
import { Button } from "../../../common/button";
import { Input } from "../../../common/input";
import { Label } from "../../../common/label";
import { ShieldCheck, ShieldX, CheckCircle2, Eye, Building2, Loader2 } from "lucide-react";
import { getMethodIcon, getMethodLabel, getStatusBadge, formatDate } from "./paymentHelpers";
import { sendWhatsAppMessage } from "../../../../utils/whatsappHelper";

export const VerifyPaymentDialog = ({
  showVerifyDialog,
  setShowVerifyDialog,
  selectedPayment,
  handleVerify,
  isProcessing,
  t = (s) => s,
}) => {
  return (
    <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700 text-base sm:text-lg">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            {t("Verify Payment")}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {t(
              "Confirm that you have received this bank transfer. The amount will be credited to the business wallet."
            )}
          </DialogDescription>
        </DialogHeader>
        {selectedPayment && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 space-y-2">
              <div className="flex justify-between gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
                  {t("Customer")}:
                </span>
                <span className="font-semibold text-xs sm:text-sm text-right break-words min-w-0">
                  {selectedPayment.user_name}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
                  {t("Amount")}:
                </span>
                <span className="font-bold text-green-700 text-base sm:text-lg break-all text-right">
                  Rs. {selectedPayment.amount?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
                  {t("Order")}:
                </span>
                <span className="font-medium text-xs sm:text-sm">#{selectedPayment.order_id}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
                  {t("Method")}:
                </span>
                <span className="font-medium text-xs sm:text-sm">
                  {getMethodLabel(selectedPayment.payment_method)}
                </span>
              </div>
              {selectedPayment.bank_account && (
                <div className="flex justify-between gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
                    {t("Bank Account")}:
                  </span>
                  <span className="font-mono text-xs sm:text-sm break-all text-right min-w-0">
                    {selectedPayment.bank_account}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground shrink-0">TXN ID:</span>
                <span className="font-mono text-[11px] sm:text-xs break-all text-right min-w-0">
                  {selectedPayment.transaction_id}
                </span>
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setShowVerifyDialog(false)}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            {t("Cancel")}
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
            onClick={handleVerify}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4 mr-2" />
            )}
            {t("Confirm Payment Received")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const RejectPaymentDialog = ({
  showRejectDialog,
  setShowRejectDialog,
  selectedPayment,
  rejectReason,
  setRejectReason,
  handleReject,
  isProcessing,
  t = (s) => s,
}) => {
  return (
    <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700 text-base sm:text-lg">
            <ShieldX className="h-5 w-5 shrink-0" />
            {t("Reject Payment")}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {t(
              "Reject this payment if the bank transfer was not received. The order will revert to cash payment."
            )}
          </DialogDescription>
        </DialogHeader>
        {selectedPayment && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 space-y-2">
              <div className="flex justify-between gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
                  {t("Customer")}:
                </span>
                <span className="font-semibold text-xs sm:text-sm text-right break-words min-w-0">
                  {selectedPayment.user_name}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
                  {t("Amount")}:
                </span>
                <span className="font-bold text-red-700 text-sm sm:text-base break-all text-right">
                  Rs. {selectedPayment.amount?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
                  {t("Order")}:
                </span>
                <span className="font-medium text-xs sm:text-sm">#{selectedPayment.order_id}</span>
              </div>
            </div>
            <div>
              <Label htmlFor="rejectReason" className="text-xs sm:text-sm">
                {t("Rejection reason")}
              </Label>
              <Input
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason && setRejectReason(e.target.value)}
                placeholder={t("e.g., Transfer not received, wrong amount...")}
                className="mt-1 text-sm"
              />
            </div>
          </div>
        )}
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setShowRejectDialog(false)}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            {t("Cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShieldX className="h-4 w-4 mr-2" />
            )}
            {t("Reject & Notify Customer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const RejectionSuccessDialog = ({
  showSuccessDialog,
  setShowSuccessDialog,
  rejectionSuccessData,
  t = (s) => s,
}) => {
  return (
    <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md text-center">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-2">
            <CheckCircle2 className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle className="text-center text-base sm:text-lg">
            {t("Payment Rejected")}
          </DialogTitle>
          <DialogDescription className="text-center text-xs sm:text-sm">
            {t("The payment was successfully marked as rejected.")}
          </DialogDescription>
        </DialogHeader>
        {rejectionSuccessData && (
          <div className="space-y-4 py-2 text-xs sm:text-sm">
            <div className="p-3 bg-secondary/40 rounded-lg text-left space-y-1.5 border border-border">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">{t("Customer")}:</span>
                <span className="font-semibold text-right break-words min-w-0">
                  {rejectionSuccessData.customer_name}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">{t("Phone")}:</span>
                <span className="font-mono text-right break-all min-w-0">
                  {rejectionSuccessData.phone}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">{t("Order")}:</span>
                <span className="font-medium">#{rejectionSuccessData.order_id}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">{t("Reason")}:</span>
                <span className="font-medium text-red-800 text-right break-words min-w-0">
                  {rejectionSuccessData.reason}
                </span>
              </div>
            </div>

            {rejectionSuccessData.phone && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-[11px] sm:text-xs text-green-800 text-left flex items-start gap-2">
                <span>ℹ️</span>
                <span>
                  {t(
                    "Browsers block auto-opening tabs. Please click the button below to guarantee WhatsApp opens successfully with the pre-filled notification."
                  )}
                </span>
              </div>
            )}
          </div>
        )}
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setShowSuccessDialog(false)}
          >
            {t("Close")}
          </Button>
          {rejectionSuccessData?.phone && (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto flex items-center justify-center gap-1.5 font-bold"
              onClick={() => sendWhatsAppMessage(rejectionSuccessData.phone, rejectionSuccessData.whatsappMsg)}
            >
              <span>💬</span>
              {t("Send WhatsApp Alert")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const PaymentDetailsDialog = ({
  showDetailsDialog,
  setShowDetailsDialog,
  selectedPayment,
  t = (s) => s,
}) => {
  return (
    <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto custom-modal-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Eye className="h-5 w-5 text-primary shrink-0" />
            {t("Payment Details")}
          </DialogTitle>
        </DialogHeader>
        {selectedPayment && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 bg-secondary/30 rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {getMethodIcon(selectedPayment.payment_method)}
                <span className="font-medium text-sm sm:text-base truncate">
                  {getMethodLabel(selectedPayment.payment_method)}
                </span>
              </div>
              <div className="shrink-0">{getStatusBadge(selectedPayment.payment_status)}</div>
            </div>

            <div className="space-y-2 text-xs sm:text-sm">
              {[
                {
                  label: t("Amount"),
                  value: `Rs. ${selectedPayment.amount?.toLocaleString()}`,
                  bold: true,
                },
                { label: t("Order"), value: `#${selectedPayment.order_id}` },
                { label: t("Customer"), value: selectedPayment.user_name },
                {
                  label: t("Phone"),
                  value:
                    selectedPayment.user_phone || selectedPayment.payment_phone || "-",
                },
                { label: "TXN ID", value: selectedPayment.transaction_id, mono: true },
                {
                  label: t("Gateway TXN"),
                  value: selectedPayment.gateway_txn_id || "-",
                  mono: true,
                },
                { label: t("Bank Account"), value: selectedPayment.bank_account || "-" },
                { label: t("Order Status"), value: selectedPayment.order_status },
                {
                  label: t("Payment Status"),
                  value: selectedPayment.order_payment_status,
                },
                { label: t("Created"), value: formatDate(selectedPayment.created_at) },
                {
                  label: t("Completed"),
                  value: selectedPayment.completed_at
                    ? formatDate(selectedPayment.completed_at)
                    : "-",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between gap-2 py-1.5 border-b border-border last:border-0"
                >
                  <span className="text-muted-foreground shrink-0">{item.label}:</span>
                  <span
                    className={`text-right break-all min-w-0 ${
                      item.bold ? "font-bold text-foreground" : "font-medium"
                    } ${item.mono ? "font-mono text-[11px] sm:text-xs" : ""}`}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {selectedPayment.error_message && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-800">{t("Error")}:</p>
                <p className="text-xs text-red-700 break-words">
                  {selectedPayment.error_message}
                </p>
              </div>
            )}

            {selectedPayment.is_sandbox && (
              <div className="text-center">
                <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                  SANDBOX TRANSACTION
                </span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const BankDetailsEditDialog = ({
  showBankEditDialog,
  setShowBankEditDialog,
  editBankForm,
  setEditBankForm,
  handleSaveBankDetails,
  isUpdatingBank,
  t = (s) => s,
}) => {
  return (
    <Dialog open={showBankEditDialog} onOpenChange={setShowBankEditDialog}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Building2 className="h-5 w-5 text-primary shrink-0" />
            {t("Edit Bank Transfer Account")}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {t(
              "Update bank account details displayed to customers during direct bank transfer checkout."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="editBankName">{t("Bank Name")}</Label>
            <Input
              id="editBankName"
              placeholder="e.g. Meezan Bank"
              value={editBankForm.bank_name}
              onChange={(e) =>
                setEditBankForm &&
                setEditBankForm((prev) => ({ ...prev, bank_name: e.target.value }))
              }
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="editAccountName">{t("Account Title")}</Label>
            <Input
              id="editAccountName"
              placeholder="e.g. Suchi Chakki"
              value={editBankForm.account_name}
              onChange={(e) =>
                setEditBankForm &&
                setEditBankForm((prev) => ({ ...prev, account_name: e.target.value }))
              }
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="editAccountNumber">{t("Account Number")}</Label>
            <Input
              id="editAccountNumber"
              placeholder="e.g. 0123-4567890"
              value={editBankForm.account_number}
              onChange={(e) =>
                setEditBankForm &&
                setEditBankForm((prev) => ({ ...prev, account_number: e.target.value }))
              }
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="editIban">{t("IBAN Number")}</Label>
            <Input
              id="editIban"
              placeholder="e.g. PK00 MEZN 0000 0000 0000 0000"
              value={editBankForm.iban}
              onChange={(e) =>
                setEditBankForm &&
                setEditBankForm((prev) => ({ ...prev, iban: e.target.value }))
              }
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setShowBankEditDialog(false)}
            disabled={isUpdatingBank}
          >
            {t("Cancel")}
          </Button>
          <Button onClick={handleSaveBankDetails} disabled={isUpdatingBank}>
            {isUpdatingBank ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {t("Save Changes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
