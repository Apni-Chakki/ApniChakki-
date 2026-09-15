import React from "react";
import { Card } from "../../../common/card";
import { Button } from "../../../common/button";
import { Settings2, ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";

export const WalletLogTab = ({
  walletBalance,
  setEditBankForm,
  setShowBankEditDialog,
  t = (s) => s,
}) => {
  return (
    <div className="space-y-3 sm:space-y-4">
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4">
          <h3 className="font-semibold text-sm sm:text-base">
            {t("Business Account Details")}
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (setEditBankForm) {
                setEditBankForm({
                  bank_name: walletBalance?.bank_name || "",
                  account_name: walletBalance?.account_name || "",
                  account_number: walletBalance?.account_number || "",
                  iban: walletBalance?.iban || "",
                });
              }
              if (setShowBankEditDialog) setShowBankEditDialog(true);
            }}
            className="w-full sm:w-auto"
          >
            <Settings2 className="h-4 w-4 mr-1.5" />
            {t("Edit Bank Details")}
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              {t("Account Name")}
            </p>
            <p className="font-medium text-sm sm:text-base break-words">
              {walletBalance?.account_name || "-"}
            </p>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs text-muted-foreground">{t("Bank")}</p>
            <p className="font-medium text-sm sm:text-base break-words">
              {walletBalance?.bank_name || "Not configured"}
            </p>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              {t("Account Number")}
            </p>
            <p className="font-medium font-mono text-sm sm:text-base break-all">
              {walletBalance?.account_number || "-"}
            </p>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              {t("IBAN Number")}
            </p>
            <p className="font-medium font-mono text-sm sm:text-base break-all">
              {walletBalance?.iban || "-"}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
          <ArrowDownRight className="h-4 w-4 text-green-600 shrink-0" />
          <ArrowUpRight className="h-4 w-4 text-red-600 shrink-0" />
          <span className="break-words">
            {t("Recent Wallet Transactions (Auto-loaded)")}
          </span>
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-4">
          {t(
            "Wallet transactions appear here when online payments are verified or completed. Each payment creates a credit entry in the business wallet."
          )}
        </p>
        <div className="text-center py-6 sm:py-8 text-muted-foreground">
          <Wallet className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm sm:text-base">
            {t("Wallet transactions will appear after payments are processed")}
          </p>
          <p className="text-[11px] sm:text-xs mt-1">
            {t("Try testing a JazzCash or Card payment first")}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default WalletLogTab;
