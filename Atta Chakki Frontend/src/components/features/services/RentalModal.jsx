import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/common/dialog";
import { Button } from "../../../components/common/button";
import { RotateCcw, Calendar, Hourglass, Package, ShieldCheck } from "lucide-react";

// customer facing "rent this product" modal, date+days+qty then rate/deposit/total
export const RentalModal = ({
  showRentalModal,
  setShowRentalModal,
  service,
  rentalDays,
  setRentalDays,
  rentalStartDate,
  setRentalStartDate,
  rentalQty,
  setRentalQty,
  handlePlaceRental,
  _user,
  t = (s) => s,
  tDynamic = (s) => s,
}) => {
  const rentalPricePerDay = parseFloat(service?.rental_price_per_day) || 0;
  const securityDeposit = parseFloat(service?.security_deposit) || 0;
  const availableQty = parseFloat(service?.rental_available_qty || 0);

  const safeDays = Math.max(1, parseInt(rentalDays || 1, 10));
  const safeQty = Math.max(1, parseInt(rentalQty || 1, 10));

  const rentalSubtotal = Math.round(rentalPricePerDay * safeDays * safeQty);
  const depositTotal = Math.round(securityDeposit * safeQty);
  const grandTotal = rentalSubtotal + depositTotal;

  return (
    <Dialog open={showRentalModal} onOpenChange={setShowRentalModal}>
      <DialogContent className="max-w-md bg-white rounded-2xl w-[95vw] sm:w-full p-5 sm:p-6 gap-4 flex flex-col shadow-2xl border border-slate-100">
        {/* Header */}
        <DialogHeader className="border-b border-slate-100 pb-3 shrink-0 text-left">
          <div className="flex items-start gap-3">
            <span className="p-2.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 shrink-0">
              <RotateCcw className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                {t("Rent Product")}
              </p>
              <DialogTitle className="text-slate-900 text-xl font-black leading-tight mt-0.5">
                {tDynamic(service?.name)}
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs mt-1">
                {t("Select your rental duration and quantity below")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {service && (
          <div className="flex flex-col gap-4">
            {/* 3-column input row */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t("Start Date")}</span>
                </label>
                <input
                  type="date"
                  value={rentalStartDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setRentalStartDate && setRentalStartDate(e.target.value)}
                  className="w-full text-xs font-semibold p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Hourglass className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t("Rental Days")}</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={rentalDays}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setRentalDays && setRentalDays("");
                    } else {
                      const parsed = parseInt(val, 10);
                      if (!isNaN(parsed)) {
                        setRentalDays && setRentalDays(Math.min(90, Math.max(0, parsed)));
                      }
                    }
                  }}
                  onBlur={() => {
                    if (!rentalDays || rentalDays < 1) {
                      setRentalDays && setRentalDays(1);
                    }
                  }}
                  className="w-full text-xs font-bold p-2 rounded-lg border border-slate-200 bg-white text-center focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t("Quantity")}</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={availableQty || 99}
                  value={rentalQty}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setRentalQty && setRentalQty("");
                    } else {
                      const parsed = parseInt(val, 10);
                      if (!isNaN(parsed)) {
                        setRentalQty && setRentalQty(Math.min(availableQty || 99, Math.max(0, parsed)));
                      }
                    }
                  }}
                  onBlur={() => {
                    if (!rentalQty || rentalQty < 1) {
                      setRentalQty && setRentalQty(1);
                    }
                  }}
                  className="w-full text-xs font-bold p-2 rounded-lg border border-slate-200 bg-white text-center focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
                {availableQty > 0 && (
                  <p className="text-[9px] text-slate-400 mt-1 text-center">
                    {availableQty} {t("available")}
                  </p>
                )}
              </div>
            </div>

            {/* Totals card */}
            <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 text-xs space-y-2.5">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 font-semibold">{t("Rental Rate")}</span>
                <span className="font-bold text-slate-800 whitespace-nowrap">
                  Rs. {Math.round(rentalPricePerDay)}{" "}
                  <span className="text-slate-400 font-medium">/{t("day")}</span>
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 font-semibold">
                  {t("Rental Subtotal")} ({safeDays} {t("days")} × {safeQty} {t("qty")})
                </span>
                <span className="font-bold text-slate-800 whitespace-nowrap">
                  Rs. {rentalSubtotal}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5 flex-wrap">
                  <ShieldCheck className="h-3.5 w-3.5 text-rose-500" />
                  {t("Refundable Deposit")}{" "}
                  <span className="text-[9px] bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                    (Rs. {Math.round(securityDeposit)} × {safeQty})
                  </span>
                </span>
                <span className="font-bold text-slate-800 whitespace-nowrap">
                  Rs. {depositTotal}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2 font-black text-sm text-teal-800 border-t border-slate-200 border-dashed pt-2.5 mt-1">
                <span className="uppercase tracking-wider text-xs sm:text-sm">
                  {t("Total Amount")}
                </span>
                <span className="bg-teal-100 text-teal-900 px-3 py-1.5 rounded-lg shadow-sm border border-teal-200/50 whitespace-nowrap">
                  Rs. {grandTotal}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer — always visible */}
        <DialogFooter className="gap-2 sm:gap-3 sm:justify-between w-full flex-col sm:flex-row shrink-0 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            className="w-full sm:w-1/2 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl py-3 font-bold shadow-sm"
            onClick={() => setShowRentalModal(false)}
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={handlePlaceRental}
            className="w-full sm:w-1/2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 shadow-md text-white rounded-xl py-3 font-bold text-base transition-all active:scale-[0.98]"
          >
            {t("Add to Cart")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RentalModal;
