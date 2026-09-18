import React from 'react';

export default function SlipTotalsSummary({ order, storeSettings, financials, language = 'en' }) {
  const isUrdu = language === 'ur';
  const {
    slipTotal,
    hasPendingItems,
    remainingBalance,
    itemDiscountsTotal,
    itemsSubtotal,
    couponDiscount,
    deliveryFee
  } = financials;

  const paymentMethodLabel = order.paymentMethod === 'cash'
    ? (isUrdu ? 'نقد (کیش)' : 'CASH')
    : (order.paymentMethod || 'CASH');

  const paymentStatusLabel = order.paymentStatus === 'paid'
    ? (isUrdu ? '✓ ادا شدہ' : '✓ PAID')
    : order.paymentStatus === 'partial'
    ? (isUrdu ? 'جزوی ادائیگی' : 'PARTIAL')
    : (isUrdu ? '✗ غیر ادا شدہ' : '✗ UNPAID');

  const deliveryFeeLabel = deliveryFee > 0
    ? `+ Rs.${Number(deliveryFee).toLocaleString()}`
    : (order.type === 'delivery' ? (isUrdu ? 'روپے 0 (مفت)' : 'Rs. 0 (FREE)') : 'Rs. 0');

  return (
    <>
      {/* Totals */}
      <div className="pt-1 space-y-1.5 border-t-2 border-dashed border-border">
        <div className="flex justify-between text-[12px] font-bold pt-1.5 text-muted-foreground">
          <span>{isUrdu ? 'اشیاء کی رقم' : 'PRODUCTS SUBTOTAL'}</span>
          <span className="whitespace-nowrap">
            Rs.{Number(itemsSubtotal || (slipTotal - deliveryFee + couponDiscount)).toLocaleString()}{hasPendingItems && (isUrdu ? ' + نامعلوم' : ' + TBD')}
          </span>
        </div>

        {itemDiscountsTotal > 0 && (
          <div className="flex justify-between text-[11px] text-green-600 font-bold">
            <span>{isUrdu ? 'پروڈکٹ رعایت' : 'PRODUCT DISCOUNT'}</span>
            <span className="whitespace-nowrap">- Rs.{Number(itemDiscountsTotal).toLocaleString()}</span>
          </div>
        )}

        {couponDiscount > 0 && (
          <div className="flex justify-between text-[11px] text-green-600 font-bold">
            <span>{isUrdu ? `کوپن رعایت (${order.couponCode || 'پرومو'})` : `COUPON DISCOUNT (${order.couponCode || 'PROMO'})`}</span>
            <span className="whitespace-nowrap">- Rs.{Number(couponDiscount).toLocaleString()}</span>
          </div>
        )}

        <div className="flex justify-between text-[11px] text-muted-foreground font-semibold">
          <span>{isUrdu ? 'ڈیلیوری فیس' : 'DELIVERY FEE'}</span>
          <span className="whitespace-nowrap">
            {deliveryFeeLabel}
          </span>
        </div>

        <div className="flex justify-between text-[13px] font-black pt-1 border-t border-dashed border-border text-green-700">
          <span>{isUrdu ? 'کل رقم (ٹوٹل)' : 'GRAND TOTAL'}</span>
          <span className="whitespace-nowrap">Rs.{Number(slipTotal).toLocaleString()}</span>
        </div>

        {parseFloat(order.advancePayment) > 0 && (
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">{isUrdu ? 'پیشگی ادائیگی' : 'ADVANCE PAID'}</span>
            <span className="text-green-600 font-semibold whitespace-nowrap">
              - Rs.{Number(order.advancePayment).toLocaleString()}
            </span>
          </div>
        )}

        {remainingBalance > 0 && (
          <div className="flex justify-between text-[13px] font-black pt-1.5 border-t border-dashed border-border">
            <span className="text-red-600">{isUrdu ? 'واجب الادا رقم (بقایا)' : 'DUE'}</span>
            <span className="text-red-600 whitespace-nowrap">Rs.{Number(remainingBalance).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Payment */}
      <div className="space-y-1.5 pt-1 border-t border-dashed border-border">
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">{isUrdu ? 'ادائیگی کا طریقہ' : 'Payment Method'}</span>
          <span className="uppercase font-semibold">{paymentMethodLabel}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">{isUrdu ? 'ادائیگی کی حیثیت' : 'Payment Status'}</span>
          <span
            className={`uppercase font-black ${
              order.paymentStatus === 'paid'
                ? 'text-green-600'
                : order.paymentStatus === 'partial'
                ? 'text-blue-600'
                : 'text-orange-500'
            }`}
          >
            {paymentStatusLabel}
          </span>
        </div>
        {order.paymentStatus !== 'paid' && remainingBalance > 0 && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-2.5 text-center mt-1">
            <p className="text-orange-900 font-black text-[12px] uppercase tracking-wide">
              {isUrdu
                ? `💵 وصول کریں: روپے ${Number(remainingBalance).toLocaleString()}${hasPendingItems ? ' (+ نامعلوم)' : ''}`
                : `💵 Collect: Rs.${Number(remainingBalance).toLocaleString()}${hasPendingItems ? ' (+ TBD)' : ''}`}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pt-3 border-t-2 border-dashed border-border">
        <p className="text-[9px] text-muted-foreground">
          {isUrdu ? '🙏 آپ کے آرڈر کا بہت شکریہ!' : '🙏 Thank you for your order!'}
        </p>
        <p className="text-[9px] text-muted-foreground mt-0.5">
          {isUrdu ? `دوبارہ ${storeSettings.name} تشریف لائیں` : `Visit ${storeSettings.name} again`}
        </p>
      </div>
    </>
  );
}
