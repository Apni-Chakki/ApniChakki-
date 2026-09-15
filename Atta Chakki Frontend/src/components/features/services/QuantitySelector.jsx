import React from "react";
import { Button } from "../../../components/common/button";

export const QuantitySelector = ({
  hasQuickOptions = false,
  quickOptions = [],
  unitLabel = "unit",
  quantity = 1,
  setQuantity,
  isOutOfStock = false,
  isExceeded = false,
  isMaxReached = false,
  isOnlyPickup = false,
  isRental = false,
  stock = Infinity,
  disabled = false,
  handleQuickAdd,
  handleAddToCart,
  isAddedToCart = false,
  isCustomMix = false,
  currentPrice = 0,
  t = (s) => s,
}) => {
  return (
    <div className="flex flex-col gap-2">
      {/* Quick-select preset chips — compact, single row */}
      {hasQuickOptions && (
        <div className="flex flex-nowrap justify-center gap-1">
          {quickOptions.map((qty) => {
            const isChipExceeded = !isOnlyPickup && !isRental && stock !== Infinity && qty > stock;
            const isChipDisabled = disabled || isOutOfStock || isChipExceeded;
            return (
              <button
                key={qty}
                type="button"
                disabled={isChipDisabled}
                onClick={() => handleQuickAdd && handleQuickAdd(qty)}
                className={`flex-1 min-w-0 px-1.5 py-1 rounded-full text-[10px] font-bold border transition-all duration-200 whitespace-nowrap
                  bg-background text-foreground border-border hover:border-primary hover:bg-primary/10 active:scale-95
                  ${
                    isChipDisabled
                      ? "opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-100 hover:border-slate-200"
                      : "cursor-pointer"
                  }`}
              >
                {qty} {unitLabel}
              </button>
            );
          })}
        </div>
      )}

      {/* Manual +/- quantity selector */}
      <div className="flex flex-col gap-2">
        {/* Quantity row — centered */}
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            className="h-9 w-9 flex items-center justify-center rounded-md text-lg font-black text-primary bg-primary/10 hover:bg-primary/20 active:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors leading-none"
            onClick={() => setQuantity && setQuantity(Math.max(1, quantity - 1))}
            disabled={isOutOfStock || disabled || quantity <= 1}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="min-w-[2.5rem] px-1 text-center text-sm font-bold leading-none">
            {quantity} <span className="text-[10px] text-muted-foreground font-medium">{unitLabel}</span>
          </span>
          <button
            type="button"
            className="h-9 w-9 flex items-center justify-center rounded-md text-lg font-black text-primary bg-primary/10 hover:bg-primary/20 active:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors leading-none"
            onClick={() => setQuantity && setQuantity(quantity + 1)}
            disabled={isOutOfStock || disabled || isMaxReached}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        {/* Add to Cart button */}
        <Button
          className={`w-full text-sm font-bold transition-all ${
            isOutOfStock || isExceeded
              ? "bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed hover:bg-slate-200 shadow-none"
              : "bg-success hover:bg-success/90 text-success-foreground"
          }`}
          onClick={handleAddToCart}
          disabled={isOutOfStock || isExceeded || disabled || (isCustomMix && currentPrice == 0)}
        >
          {isOutOfStock
            ? t("Out of Stock")
            : isExceeded
            ? t("Exceeds Stock")
            : isAddedToCart
            ? t("Added ✓")
            : t("Add to Cart")}
        </Button>
      </div>
    </div>
  );
};

export default QuantitySelector;
