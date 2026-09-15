import React from "react";
import { Card } from "../../../common/card";
import { Button } from "../../../common/button";
import {
  Settings2,
  Banknote,
  Smartphone,
  CreditCard,
  Building2,
  XCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export const PaymentMethodsTab = ({
  paySettings = {},
  handleUpdatePaySettings,
  settingsLoading = false,
  walletBalance,
  setEditBankForm,
  setShowBankEditDialog,
  t = (s) => s,
}) => {
  const paymentMethodsList = [
    {
      key: "pay_method_cod_enabled",
      icon: Banknote,
      label: t("Cash on Delivery"),
      desc: t("Allow customers to pay when they receive their order"),
      iconBg: "bg-green-100",
      iconColor: "text-green-700",
    },
    {
      key: "pay_method_jazzcash_enabled",
      icon: Smartphone,
      label: "JazzCash",
      desc: t("Enable online mobile wallet payments via JazzCash"),
      iconBg: "bg-red-100",
      iconColor: "text-red-700",
    },
    {
      key: "pay_method_card_enabled",
      icon: CreditCard,
      label: t("Credit / Debit Card"),
      desc: t("Visa, Mastercard and international card support"),
      iconBg: "bg-blue-100",
      iconColor: "text-blue-700",
    },
    {
      key: "pay_method_bank_enabled",
      icon: Building2,
      label: t("Bank Transfer"),
      desc: t("Manual verification of direct bank account transfers"),
      iconBg: "bg-purple-100",
      iconColor: "text-purple-700",
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card className="p-4 sm:p-6">
        <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm sm:text-base">
          <Settings2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          {t("Payment Method Settings")}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
          {t(
            "Enable or disable payment methods for your customers according to your business needs."
          )}
        </p>

        <div className="space-y-3 sm:space-y-6">
          {paymentMethodsList.map((method) => {
            const isEnabled = paySettings[method.key] === "1";
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
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                      {method.desc}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  {method.key === "pay_method_bank_enabled" && (
                    <Button
                      variant="outline"
                      size="sm"
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
                      {t("Edit Details")}
                    </Button>
                  )}
                  {isEnabled ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        handleUpdatePaySettings && handleUpdatePaySettings(method.key, false)
                      }
                      disabled={settingsLoading}
                      className="w-full sm:w-auto px-4 shrink-0"
                    >
                      <XCircle className="h-4 w-4 mr-1.5" />
                      {t("Disable")}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() =>
                        handleUpdatePaySettings && handleUpdatePaySettings(method.key, true)
                      }
                      disabled={settingsLoading}
                      className="w-full sm:w-auto px-4 shrink-0 bg-green-600 hover:bg-green-700 text-white border-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      {t("Enable")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 sm:p-6 bg-blue-50 border-blue-200">
        <div className="flex gap-2 sm:gap-3">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-blue-800">{t("Important Note")}</p>
            <p className="text-[11px] sm:text-xs text-blue-700 mt-1 leading-relaxed">
              {t(
                "Disabling a payment method will hide it from the checkout page for all customers immediately. Ensure at least one payment method is always enabled to allow customers to place orders."
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PaymentMethodsTab;
