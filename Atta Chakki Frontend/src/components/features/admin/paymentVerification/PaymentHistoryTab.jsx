import React from "react";
import { Card } from "../../../common/card";
import { Input } from "../../../common/input";
import { Pagination } from "../../../common/Pagination";
import { CreditCard, Search, Eye } from "lucide-react";
import { getMethodIcon, getMethodLabel, getStatusBadge, timeSince } from "./paymentHelpers";

export const PaymentHistoryTab = ({
  searchQuery = "",
  setSearchQuery,
  statusFilter = "all",
  setStatusFilter,
  methodFilter = "all",
  setMethodFilter,
  filteredHistory = [],
  totalItems = 0,
  page = 1,
  setPage,
  pageSize = 10,
  setPageSize,
  setSelectedPayment,
  setShowDetailsDialog,
  t = (s) => s,
}) => {
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("Search by name, phone, TXN ID, or order #...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter && setStatusFilter(e.target.value)}
            className="px-2 sm:px-3 py-2 border border-border rounded-lg bg-background text-xs sm:text-sm w-full sm:w-auto"
          >
            <option value="all">{t("All Status")}</option>
            <option value="completed">{t("Completed")}</option>
            <option value="pending">{t("Pending")}</option>
            <option value="processing">{t("Processing")}</option>
            <option value="failed">{t("Failed")}</option>
          </select>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter && setMethodFilter(e.target.value)}
            className="px-2 sm:px-3 py-2 border border-border rounded-lg bg-background text-xs sm:text-sm w-full sm:w-auto"
          >
            <option value="all">{t("All Methods")}</option>
            <option value="jazzcash">JazzCash</option>
            <option value="card">{t("Card")}</option>
            <option value="bank">{t("Bank Transfer")}</option>
          </select>
        </div>
      </div>

      {/* Payment list */}
      {totalItems === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <CreditCard className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm sm:text-base text-muted-foreground">
            {t("No payment transactions found")}
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {filteredHistory.map((payment) => (
              <Card
                key={payment.id}
                className="p-3 sm:p-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                onClick={() => {
                  if (setSelectedPayment) setSelectedPayment(payment);
                  if (setShowDetailsDialog) setShowDetailsDialog(true);
                }}
              >
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="shrink-0">
                      {getMethodIcon(payment.payment_method)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-foreground">
                          Rs. {payment.amount?.toLocaleString()}
                        </span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          • {getMethodLabel(payment.payment_method)}
                        </span>
                        <span className="text-[10px] sm:text-xs font-mono text-muted-foreground truncate hidden sm:inline">
                          • #{payment.order_id}
                        </span>
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

          {totalItems > 0 && (
            <Pagination
              currentPage={page}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                if (setPageSize) setPageSize(s);
                if (setPage) setPage(1);
              }}
              className="mt-4"
            />
          )}
        </>
      )}
    </div>
  );
};

export default PaymentHistoryTab;
