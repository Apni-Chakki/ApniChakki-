import React from "react";
import { Card } from "../../../common/card";
import { Button } from "../../../common/button";
import { Badge } from "../../../common/badge";
import { CheckCircle2, Clock, ShieldCheck, ShieldX } from "lucide-react";
import { getMethodIcon, getMethodLabel, formatDate, timeSince } from "./paymentHelpers";

export const PendingTransfersTab = ({
  pendingTransfers = [],
  setSelectedPayment,
  setShowVerifyDialog,
  setShowRejectDialog,
  t = (s) => s,
}) => {
  if (pendingTransfers.length === 0) {
    return (
      <Card className="p-12 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground">{t("All Clear!")}</h3>
        <p className="text-muted-foreground">{t("No payments waiting for verification")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pendingTransfers.map((transfer) => (
        <Card
          key={transfer.id}
          className="p-3 sm:p-5 border-yellow-200 hover:border-yellow-300 transition-colors"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0">
              <div className="p-2.5 sm:p-3 bg-yellow-100 rounded-full shrink-0">
                {getMethodIcon(transfer.payment_method)}
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="font-bold text-base sm:text-lg text-foreground">
                    Rs. {transfer.amount.toLocaleString()}
                  </span>
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    {getMethodLabel(transfer.payment_method)}
                  </Badge>
                  <Badge className="bg-yellow-100 text-yellow-800 text-[10px] sm:text-xs">
                    <Clock className="h-3 w-3 mr-1" /> {t("Awaiting Verification")}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-foreground break-words">
                  <strong>{transfer.user_name}</strong> — {transfer.user_phone}
                </p>
                <p className="text-[11px] sm:text-xs text-muted-foreground break-all">
                  {t("Order")} #{transfer.order_id} • TXN:{" "}
                  <span className="font-mono">{transfer.transaction_id}</span>
                </p>
                {transfer.bank_account && (
                  <p className="text-[11px] sm:text-xs text-muted-foreground break-all">
                    {t("Bank Account")}: <strong>{transfer.bank_account}</strong>
                  </p>
                )}
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  {timeSince(transfer.created_at)} • {formatDate(transfer.created_at)}
                </p>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                onClick={() => {
                  if (setSelectedPayment) setSelectedPayment(transfer);
                  if (setShowVerifyDialog) setShowVerifyDialog(true);
                }}
              >
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                {t("Verify")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1 sm:flex-none"
                onClick={() => {
                  if (setSelectedPayment) setSelectedPayment(transfer);
                  if (setShowRejectDialog) setShowRejectDialog(true);
                }}
              >
                <ShieldX className="h-4 w-4 mr-1.5" />
                {t("Reject")}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default PendingTransfersTab;
