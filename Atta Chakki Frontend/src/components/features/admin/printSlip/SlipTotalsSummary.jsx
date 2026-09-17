import React from 'react';

export default function SlipTotalsSummary({ order, storeSettings, financials }) {
  const {
    slipTotal,
    hasPendingItems,
    remainingBalance,
    itemDiscountsTotal,
    itemsSubtotal,
    couponDiscount,
    deliveryFee
  } = financials;

  return (
    <>
      {/* Totals */}
      <div className="pt-1 space-y-1.5 border-t-2 border-dashed border-border">
        <div className="flex justify-between text-[12px] font-bold pt-1.5 text-muted-foreground">
          <span>PRODUCTS SUBTOTAL</span>
          <span className="whitespace-nowrap">
            Rs.{Number(itemsSubtotal || (slipTotal - deliveryFee + couponDiscount)).toLocaleString()}{hasPendingItems && ' + TBD'}
          </span>
        </div>

        {itemDiscountsTotal > 0 && (
          <div className="flex justify-between text-[11px] text-green-600 font-bold">
            <span>PRODUCT DISCOUNT</span>
            <span className="whitespace-nowrap">- Rs.{Number(itemDiscountsTotal).toLocaleString()}</span>
          </div>
        )}

        {couponDiscount > 0 && (
          <div className="flex justify-between text-[11px] text-green-600 font-bold">
            <span>COUPON DISCOUNT ({order.couponCode || 'PROMO'})</span>
            <span className="whitespace-nowrap">- Rs.{Number(couponDiscount).toLocaleString()}</span>
          </div>
        )}

        <div className="flex justify-between text-[11px] text-muted-foreground font-semibold">
          <span>DELIVERY FEE</span>
          <span className="whitespace-nowrap">
            {deliveryFee > 0 ? `+ Rs.${Number(deliveryFee).toLocaleString()}` : (order.type === 'delivery' ? 'Rs. 0 (FREE)' : 'Rs. 0')}
          </span>
        </div>

        <div className="flex justify-between text-[13px] font-black pt-1 border-t border-dashed border-border text-green-700">
          <span>GRAND TOTAL</span>
          <span className="whitespace-nowrap">Rs.{Number(slipTotal).toLocaleString()}</span>
        </div>

        {parseFloat(order.advancePayment) > 0 && (
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">ADVANCE PAID</span>
            <span className="text-green-600 font-semibold whitespace-nowrap">
              - Rs.{Number(order.advancePayment).toLocaleString()}
            </span>
          </div>
        )}

        {remainingBalance > 0 && (
          <div className="flex justify-between text-[13px] font-black pt-1.5 border-t border-dashed border-border">
            <span className="text-red-600">DUE</span>
            <span className="text-red-600 whitespace-nowrap">Rs.{Number(remainingBalance).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Payment */}
      <div className="space-y-1.5 pt-1 border-t border-dashed border-border">
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Payment Method</span>
          <span className="uppercase font-semibold">{order.paymentMethod || 'CASH'}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Payment Status</span>
          <span
            className={`uppercase font-black ${
              order.paymentStatus === 'paid'
                ? 'text-green-600'
                : order.paymentStatus === 'partial'
                ? 'text-blue-600'
                : 'text-orange-500'
            }`}
          >
            {order.paymentStatus === 'paid' ? '✓ PAID' : order.paymentStatus === 'partial' ? 'PARTIAL' : '✗ UNPAID'}
          </span>
        </div>
        {order.paymentStatus !== 'paid' && remainingBalance > 0 && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-2.5 text-center mt-1">
            <p className="text-orange-900 font-black text-[12px] uppercase tracking-wide">
              💵 Collect: Rs.{Number(remainingBalance).toLocaleString()}{hasPendingItems && ' (+ TBD)'}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pt-3 border-t-2 border-dashed border-border">
        <p className="text-[9px] text-muted-foreground">🙏 Thank you for your order!</p>
        <p className="text-[9px] text-muted-foreground mt-0.5">Visit {storeSettings.name} again</p>
      </div>
    </>
  );
}
