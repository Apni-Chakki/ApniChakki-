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
import { RotateCcw } from "lucide-react";

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
  user,
  t = (s) => s,
  tDynamic = (s) => s,
}) => {
  const rentalPricePerDay = parseFloat(service.rental_price_per_day) || 0;
  const securityDeposit = parseFloat(service.security_deposit) || 0;
  const availableQty = parseFloat(service.rental_available_qty || 0);

  return (
    <Dialog open={showRentalModal} onOpenChange={setShowRentalModal}>
      <DialogContent className="max-w-md bg-white rounded-2xl max-h-[90vh] w-[95vw] sm:w-full p-4 sm:p-6 gap-3 flex flex-col overflow-hidden shadow-2xl border border-slate-100">
        <DialogHeader className="border-b border-slate-100 pb-3 shrink-0 text-left">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
              <RotateCcw className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-slate-800 text-lg font-black leading-tight">
                {t("Rent")} {tDynamic(service.name)}
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-xs pt-0.5">
                {t("Configure your rental period & quantity")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {service && (
          <div className="flex flex-col gap-3 overflow-y-auto min-h-0 pr-1">
            {/* Rates & Deposits summary */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-teal-50/60 border border-teal-200/70 rounded-xl p-3 text-center">
                <span className="text-[10px] text-teal-800 font-bold uppercase tracking-wider block">
                  {t("Daily Rent")}
                </span>
                <span className="text-base font-black text-teal-900 mt-0.5 block">
                  Rs. {Math.round(rentalPricePerDay)}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block">
                  {t("Security Deposit")}
                </span>
                <span className="text-base font-black text-slate-800 mt-0.5 block">
                  Rs. {Math.round(securityDeposit)}
                </span>
              </div>
            </div>

            {/* Inputs Section */}
            <div className="space-y-3 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
              {/* Start Date */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  {t("Start Date")}
                </label>
                <input
                  type="date"
                  value={rentalStartDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setRentalStartDate && setRentalStartDate(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-xs"
                />
              </div>

              {/* Rental Duration */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 flex justify-between">
                  <span>{t("Rental Duration (Days)")}</span>
                  <span className="text-teal-700 font-extrabold">{rentalDays} {t("days")}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={rentalDays}
                    onChange={(e) => setRentalDays && setRentalDays(parseInt(e.target.value) || 1)}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={rentalDays}
                    onChange={(e) => setRentalDays && setRentalDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 text-center text-xs font-bold p-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Rental Quantity */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 flex justify-between">
                  <span>{t("Quantity")}</span>
                  {availableQty > 0 && (
                    <span className="text-[10px] text-slate-500 font-normal">
                      {availableQty} {t("available")}
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="1"
                  max={availableQty || 99}
                  value={rentalQty}
                  onChange={(e) => setRentalQty && setRentalQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-500 shadow-xs"
                />
              </div>
            </div>

            {/* Total calculations */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200 rounded-xl p-3 sm:p-4 text-xs space-y-2.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] overflow-y-auto min-h-0">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 font-semibold">{t("Rental Rate")}</span>
                <span className="font-bold text-slate-800 whitespace-nowrap">
                  Rs. {Math.round(rentalPricePerDay)}{" "}
                  <span className="text-slate-400 font-medium">/{t("day")}</span>
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 font-semibold">
                  {t("Rental Subtotal")} ({rentalDays} {t("days")} × {rentalQty} {t("qty")})
                </span>
                <span className="font-bold text-slate-800 whitespace-nowrap">
                  Rs. {Math.round(rentalPricePerDay * rentalDays * rentalQty)}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5 flex-wrap">
                  🛡️ {t("Refundable Deposit")}{" "}
                  <span className="text-[9px] bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                    (Rs. {Math.round(securityDeposit)} × {rentalQty})
                  </span>
                </span>
                <span className="font-bold text-slate-800 whitespace-nowrap">
                  Rs. {Math.round(securityDeposit * rentalQty)}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2 font-black text-sm sm:text-base text-teal-800 border-t border-slate-200 border-dashed pt-2.5 mt-2.5">
                <span className="uppercase tracking-wider text-xs sm:text-sm">{t("Total Amount")}</span>
                <span className="bg-teal-100 text-teal-900 px-3 py-1.5 rounded-lg shadow-sm border border-teal-200/50 whitespace-nowrap">
                  Rs. {Math.round(rentalPricePerDay * rentalDays * rentalQty + securityDeposit * rentalQty)}
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-3 sm:justify-between w-full flex-col sm:flex-row shrink-0 pt-2 border-t border-slate-100">
          <Button
            variant="outline"
            className="w-full sm:w-1/2 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl py-3 font-bold shadow-sm"
            onClick={() => setShowRentalModal(false)}
          >
            {t("Cancel")}
          </Button>
          {user && (
            <Button
              onClick={handlePlaceRental}
              className="w-full sm:w-1/2 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 shadow-md text-white rounded-xl py-3 font-bold text-base transition-all active:scale-[0.98]"
            >
              {t("Add to Cart")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RentalModal;
