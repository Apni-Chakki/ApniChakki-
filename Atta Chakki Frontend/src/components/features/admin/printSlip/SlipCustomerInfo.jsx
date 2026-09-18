import React from 'react';

export default function SlipCustomerInfo({ order, dateStr, timeStr, language = 'en' }) {
  if (!order) return null;
  const isUrdu = language === 'ur';

  const orderTypeLabel = order.type === 'pickup'
    ? (isUrdu ? 'دکان سے وصولی' : 'PICKUP')
    : (isUrdu ? 'ہوم ڈیلیوری' : 'DELIVERY');

  return (
    <>
      {/* Order Meta */}
      <div className="space-y-1.5 bg-muted/30 rounded-lg p-3 border border-border/40">
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">{isUrdu ? 'آرڈر نمبر' : 'Order #'}</span>
          <span className="font-bold font-mono">{String(order.id).slice(-8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">{isUrdu ? 'تاریخ' : 'Date'}</span>
          <span className="font-medium">{dateStr}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">{isUrdu ? 'وقت' : 'Time'}</span>
          <span className="font-medium">{timeStr}</span>
        </div>
      </div>

      {/* Customer */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-dashed border-border pb-1">
          {isUrdu ? 'گاہک کی تفصیل' : 'Customer'}
        </p>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">{isUrdu ? 'نام' : 'Name'}</span>
          <span className={`font-semibold max-w-[60%] ${isUrdu ? 'text-left' : 'text-right'}`}>{order.customerName}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">{isUrdu ? 'فون' : 'Phone'}</span>
          <span className="font-mono" style={{ direction: 'ltr' }}>{order.phone}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">{isUrdu ? 'قسم' : 'Type'}</span>
          <span className="uppercase font-semibold">{orderTypeLabel}</span>
        </div>
        {order.deliveryAddress && (
          <div className="pt-1">
            <p className="text-muted-foreground text-[9px] mb-1">{isUrdu ? 'ترسیل کا پتہ' : 'Delivery Address'}</p>
            <p className="text-[11px] bg-blue-50 border border-blue-200 p-2 rounded whitespace-normal break-words">
              {order.deliveryAddress}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
