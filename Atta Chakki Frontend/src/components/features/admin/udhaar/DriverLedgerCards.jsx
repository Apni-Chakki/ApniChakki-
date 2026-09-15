import React from "react";
import { Card } from "../../../common/card";
import { Button } from "../../../common/button";
import { Input } from "../../../common/input";
import { Badge } from "../../../common/badge";
import {
  Truck,
  Phone,
  Search,
  CheckCircle,
  Coins,
  Receipt,
  ShieldCheck,
  ChevronRight,
  Loader2,
} from "lucide-react";

export const DriverLedgerCards = ({
  driverSummary = {},
  driverSearch = "",
  setDriverSearch,
  driverStatusFilter = "all",
  setDriverStatusFilter,
  loadingDrivers = false,
  driversData = [],
  setSelectedDriver,
  setDriverPayAmount,
  t = (s) => s,
}) => {
  return (
    <div className="space-y-4">
      {/* Driver Summary Banner Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 bg-amber-500/10 border-amber-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                {t("Total Driver COD Due")}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                Rs. {(driverSummary.total_cash_due || 0).toLocaleString()}
              </p>
            </div>
            <div className="h-11 w-11 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Coins className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                {t("Pending COD Orders")}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                {driverSummary.pending_orders_count || 0}
              </p>
            </div>
            <div className="h-11 w-11 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-emerald-500/10 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                {t("Riders with Pending Cash")}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                {driverSummary.drivers_with_due || 0} / {driverSummary.total_drivers || 0}
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
            onChange={(e) => setDriverSearch && setDriverSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg border border-border overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setDriverStatusFilter && setDriverStatusFilter("all")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              driverStatusFilter === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("All Riders")}
          </button>
          <button
            type="button"
            onClick={() => setDriverStatusFilter && setDriverStatusFilter("pending_cash")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              driverStatusFilter === "pending_cash"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("Cash Due Only")}
          </button>
          <button
            type="button"
            onClick={() => setDriverStatusFilter && setDriverStatusFilter("cleared")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              driverStatusFilter === "cleared"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
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
            {driverSearch
              ? t("No riders match your search criteria.")
              : t("All COD collections from drivers are fully reconciled.")}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {driversData.map((driver) => {
            const hasCashDue = (driver.total_cash_due || 0) > 0;
            return (
              <Card
                key={driver.driver_phone || driver.driver_name}
                className={`p-4 space-y-4 transition-all hover:shadow-md border ${
                  hasCashDue ? "border-amber-500/30 bg-card" : "border-border/60 bg-muted/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-11 w-11 rounded-xl flex items-center justify-center text-base font-bold shrink-0 ${
                        hasCashDue
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Truck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-foreground truncate">
                        {driver.driver_name}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" />
                        {driver.driver_phone || "No phone"}
                      </p>
                    </div>
                  </div>

                  {hasCashDue ? (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs px-2.5 py-0.5">
                      {t("Cash Due")}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-emerald-600 border-emerald-500/30 text-xs px-2.5 py-0.5"
                    >
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
                    <p className="text-xs sm:text-sm font-semibold text-amber-600">
                      {driver.pending_cash_orders}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">{t("Delivered")}</p>
                    <p className="text-xs sm:text-sm font-semibold text-emerald-600">
                      {driver.delivered_orders}
                    </p>
                  </div>
                </div>

                {/* Cash Owed Highlight */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground font-medium">
                    {t("Cash Due to Admin")}:
                  </span>
                  <span
                    className={`text-base font-bold ${
                      hasCashDue ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                    }`}
                  >
                    Rs. {(driver.total_cash_due || 0).toLocaleString()}
                  </span>
                </div>

                {/* Actions */}
                <Button
                  className={`w-full font-medium ${
                    hasCashDue
                      ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                      : "variant-outline"
                  }`}
                  size="sm"
                  variant={hasCashDue ? "default" : "outline"}
                  onClick={() => {
                    if (setSelectedDriver) setSelectedDriver(driver);
                    if (setDriverPayAmount) {
                      setDriverPayAmount(
                        (driver.total_cash_due || 0) > 0 ? String(driver.total_cash_due) : ""
                      );
                    }
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
  );
};

export default DriverLedgerCards;
