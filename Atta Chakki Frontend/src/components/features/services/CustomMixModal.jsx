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

export const CustomMixModal = ({
  showMixModal,
  setShowMixModal,
  mixItems = [],
  mixRatios = {},
  handleRatioChange,
  currentPrice = 0,
  showCustomRequest,
  setShowCustomRequest,
  customRequestData,
  setCustomRequestData,
  submitCustomRequest,
  isSubmittingRequest,
  t = (s) => s,
  tDynamic = (s) => s,
}) => {
  return (
    <Dialog open={showMixModal} onOpenChange={setShowMixModal}>
      <DialogContent className="max-w-md bg-white rounded-xl max-h-[90vh] w-[95vw] sm:w-full p-4 sm:p-6 gap-3 flex flex-col overflow-hidden">
        <DialogHeader className="border-b border-slate-100 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-slate-800 text-lg font-black">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="truncate">{t("Create Your Mix")}</span>
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium text-xs pt-1">
            {t("Price updates automatically")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 overflow-y-auto min-h-0">
          <div className="space-y-2">
            {mixItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-primary/10 shadow-sm gap-2"
              >
                <div className="flex flex-col min-w-0 text-left items-start">
                  <span
                    className="text-xs text-slate-900 truncate leading-tight text-left"
                    style={{ fontWeight: "800" }}
                  >
                    {tDynamic(item.item_name)}
                  </span>
                  <span
                    className="text-[10px] text-slate-500 mt-1 leading-none text-left"
                    style={{ fontWeight: "400" }}
                  >
                    Rs. {item.price_per_kg}/kg
                  </span>
                </div>

                <div className="flex items-center border border-primary/20 rounded-lg overflow-hidden bg-white shadow-sm h-8 shrink-0">
                  <button
                    type="button"
                    className="w-8 h-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-extrabold text-sm transition-colors select-none"
                    onClick={() => {
                      const currentVal = parseFloat(
                        mixRatios[idx] !== undefined ? mixRatios[idx] : 0
                      );
                      const newVal = Math.max(0, currentVal - 0.1).toFixed(1);
                      handleRatioChange(idx, parseFloat(newVal));
                    }}
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-sm font-black text-slate-800 select-none">
                    {mixRatios[idx] !== undefined
                      ? parseFloat(mixRatios[idx]).toFixed(1)
                      : "0.0"}
                  </span>
                  <button
                    type="button"
                    className="w-8 h-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-extrabold text-sm transition-colors select-none"
                    onClick={() => {
                      const currentVal = parseFloat(
                        mixRatios[idx] !== undefined ? mixRatios[idx] : 0
                      );
                      const newVal = (currentVal + 0.1).toFixed(1);
                      handleRatioChange(idx, parseFloat(newVal));
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Live total inside modal */}
          <div className="flex items-center justify-between text-xs bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
            <span className="font-semibold text-slate-600">{t("Total")}</span>
            <span className="font-black text-primary">
              Rs. {Math.round(parseFloat(currentPrice) || 0)}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 border-primary/30 text-primary hover:bg-primary hover:text-white font-bold rounded-xl transition-all shadow-sm"
            onClick={() => setShowCustomRequest(!showCustomRequest)}
          >
            {showCustomRequest
              ? t("Cancel Custom Request")
              : t("Want something else? Custom Request")}
          </Button>

          {showCustomRequest && (
            <div className="p-3.5 bg-[#fcfaf7] border border-primary/20 rounded-2xl space-y-3 shadow-sm animate-in slide-in-from-top-2 fade-in duration-300">
              <div className="border-b border-primary/10 pb-1.5">
                <p className="text-xs font-extrabold text-primary uppercase tracking-wider">
                  {t("Send a Custom Request")}
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-normal">
                  {t(
                    "Tell us what ingredients and proportions you want, and we'll contact you!"
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder={t("Your Name")}
                  className="w-full text-xs p-2 rounded-xl border border-primary/15 bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-all"
                  value={customRequestData.name}
                  onChange={(e) =>
                    setCustomRequestData({ ...customRequestData, name: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder={t("Phone Number")}
                  className="w-full text-xs p-2 rounded-xl border border-primary/15 bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-all"
                  value={customRequestData.phone}
                  onChange={(e) =>
                    setCustomRequestData({ ...customRequestData, phone: e.target.value })
                  }
                />
                <textarea
                  placeholder={t(
                    "Describe your custom mix (e.g., 50% Wheat, 30% Chana, 20% Oats)"
                  )}
                  className="w-full text-xs p-2 rounded-xl border border-primary/15 bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-all min-h-[60px]"
                  value={customRequestData.message}
                  onChange={(e) =>
                    setCustomRequestData({ ...customRequestData, message: e.target.value })
                  }
                />
                <Button
                  className="w-full bg-primary hover:bg-primary/90 active:scale-[0.98] h-8 text-xs text-white font-bold rounded-xl transition-all shadow-md"
                  onClick={submitCustomRequest}
                  disabled={isSubmittingRequest}
                >
                  {isSubmittingRequest ? t("Sending...") : t("Send Request")}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-2 border-t border-slate-100">
          <Button
            onClick={() => setShowMixModal(false)}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-xl"
          >
            {t("Done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomMixModal;
