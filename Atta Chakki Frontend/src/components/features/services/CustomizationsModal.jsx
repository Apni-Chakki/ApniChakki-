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
import { Checkbox } from "../../../components/common/checkbox";
import { Label } from "../../../components/common/label";

export const CustomizationsModal = ({
  showCustomizationsModal,
  setShowCustomizationsModal,
  service,
  effectiveCustomizations = [],
  selectedOptions = {},
  toggleOption,
  currentPrice = 0,
  isDualUnit = false,
  displayUnit = "unit",
  t = (s) => s,
  tDynamic = (s) => s,
}) => {
  const isAvgMode = service.customization_pricing_mode === "average";
  const selectedCount = Object.values(selectedOptions).filter(Boolean).length;
  const unitText = tDynamic(isDualUnit ? "kg" : displayUnit);

  return (
    <Dialog open={showCustomizationsModal} onOpenChange={setShowCustomizationsModal}>
      <DialogContent className="max-w-md bg-white rounded-xl max-h-[90vh] w-[95vw] sm:w-full p-4 sm:p-6 gap-3 flex flex-col overflow-hidden">
        <DialogHeader className="border-b border-slate-100 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-slate-800 text-lg font-black">
            <span
              className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                isAvgMode ? "bg-emerald-500" : "bg-orange-500"
              }`}
            />
            <span className={`truncate ${isAvgMode ? "text-emerald-800" : "text-orange-800"}`}>
              {isAvgMode ? t("Product Items & Rates") : t("Service Customization")}
            </span>
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium text-xs pt-1">
            {isAvgMode
              ? t("Choose which items to include in this product:")
              : t("Select the services you want")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2.5 overflow-y-auto min-h-0">
          {effectiveCustomizations.map((cust, idx) => (
            <div
              key={cust.id || idx}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors border ${
                selectedOptions[idx]
                  ? isAvgMode
                    ? "bg-emerald-50/70 border-emerald-200"
                    : "bg-orange-100/60 border-orange-200"
                  : "bg-white border-slate-100"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Checkbox
                  id={`cust-modal-${service.id}-${idx}`}
                  checked={!!selectedOptions[idx]}
                  onCheckedChange={() => toggleOption && toggleOption(idx)}
                  className={
                    isAvgMode
                      ? "checkbox-emerald border-emerald-500 bg-white"
                      : "checkbox-orange border-orange-500 bg-white"
                  }
                />
                <Label
                  htmlFor={`cust-modal-${service.id}-${idx}`}
                  className={`text-sm font-bold cursor-pointer select-none ${
                    isAvgMode ? "text-emerald-950" : "text-orange-900"
                  }`}
                >
                  {t(cust.option_name)}
                </Label>
              </div>
              <span
                className={`text-xs font-bold bg-white px-2.5 py-1 rounded-full border ${
                  isAvgMode
                    ? "text-emerald-800 border-emerald-200"
                    : "text-orange-700 border-orange-100"
                }`}
              >
                Rs. {cust.option_price} {isAvgMode ? `/${unitText}` : ""}
              </span>
            </div>
          ))}

          {selectedCount === 0 && (
            <p className="text-xs text-red-500 font-bold text-center italic mt-1">
              ⚠ {isAvgMode ? t("Please select at least one item") : t("Please select at least one service")}
            </p>
          )}

          <div
            className={`flex items-center justify-between text-xs rounded-xl px-3 py-2.5 mt-2 border ${
              isAvgMode
                ? "bg-emerald-50 border-emerald-200"
                : "bg-orange-50 border-orange-200"
            }`}
          >
            <span className="font-semibold text-slate-700">
              {isAvgMode
                ? `${t("Calculated Rate")} (${selectedCount} ${t("items included")}):`
                : t("Total")}
            </span>
            <span
              className={`font-black text-sm ${
                isAvgMode ? "text-emerald-800" : "text-orange-700"
              }`}
            >
              Rs. {Math.round(parseFloat(currentPrice) || 0)} {isAvgMode ? `/${unitText}` : ""}
            </span>
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-2 border-t border-slate-100">
          <Button
            onClick={() => setShowCustomizationsModal(false)}
            className={`w-full font-bold rounded-xl text-white ${
              isAvgMode
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            {t("Done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomizationsModal;
