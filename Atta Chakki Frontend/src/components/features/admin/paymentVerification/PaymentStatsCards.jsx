import React from "react";
import { Card } from "../../../common/card";
import { Wallet, ArrowDownRight, TrendingUp, Clock } from "lucide-react";

export const PaymentStatsCards = ({ walletBalance, t = (s) => s }) => {
  const pendingCount = walletBalance?.pending_verification_count || 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card className="p-4 sm:p-5 border-green-200 bg-stat-green">
        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-3">
          <div className="p-2.5 sm:p-3 bg-green-200 rounded-full shrink-0">
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-green-700" />
          </div>
          <div className="min-w-0 w-full sm:w-auto">
            <p className="text-[11px] sm:text-xs text-green-800 font-medium leading-tight">
              {t("Business Wallet")}
            </p>
            <p className="text-base sm:text-2xl font-black text-green-900 break-all mt-0.5 sm:mt-0">
              Rs. {(walletBalance?.balance || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5 border-blue-200 bg-stat-blue">
        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-3">
          <div className="p-2.5 sm:p-3 bg-blue-200 rounded-full shrink-0">
            <ArrowDownRight className="h-5 w-5 sm:h-6 sm:w-6 text-blue-700" />
          </div>
          <div className="min-w-0 w-full sm:w-auto">
            <p className="text-[11px] sm:text-xs text-blue-800 font-medium leading-tight">
              {t("Today's Received")}
            </p>
            <p className="text-base sm:text-2xl font-black text-blue-900 break-all mt-0.5 sm:mt-0">
              Rs. {(walletBalance?.today_received || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5 border-purple-200 bg-stat-purple">
        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-3">
          <div className="p-2.5 sm:p-3 bg-purple-200 rounded-full shrink-0">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-700" />
          </div>
          <div className="min-w-0 w-full sm:w-auto">
            <p className="text-[11px] sm:text-xs text-purple-800 font-medium leading-tight">
              {t("Total Online Received")}
            </p>
            <p className="text-base sm:text-2xl font-black text-purple-900 break-all mt-0.5 sm:mt-0">
              Rs. {(walletBalance?.total_online_received || 0).toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      <Card
        className={`p-4 sm:p-5 ${
          pendingCount > 0 ? "border-yellow-200 animate-pulse bg-stat-yellow" : "border-gray-200 bg-stat-gray"
        }`}
      >
        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center gap-2 sm:gap-3">
          <div
            className={`p-2.5 sm:p-3 rounded-full shrink-0 ${
              pendingCount > 0 ? "bg-yellow-200" : "bg-gray-200"
            }`}
          >
            <Clock
              className={`h-5 w-5 sm:h-6 sm:w-6 ${
                pendingCount > 0 ? "text-yellow-700" : "text-gray-600"
              }`}
            />
          </div>
          <div className="min-w-0 w-full sm:w-auto">
            <p
              className={`text-[11px] sm:text-xs font-medium leading-tight ${
                pendingCount > 0 ? "text-yellow-800" : "text-gray-600"
              }`}
            >
              {t("Pending Verification")}
            </p>
            <p
              className={`text-base sm:text-2xl font-black mt-0.5 sm:mt-0 ${
                pendingCount > 0 ? "text-yellow-900" : "text-gray-900"
              }`}
            >
              {pendingCount}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PaymentStatsCards;
