import React from 'react';

export default function SlipCustomerInfo({ order, dateStr, timeStr }) {
  if (!order) return null;

  return (
    <>
      {/* Order Meta */}
      <div className="space-y-1.5 bg-muted/30 rounded-lg p-3 border border-border/40">
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Order #</span>
          <span className="font-bold font-mono">{String(order.id).slice(-8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Date</span>
          <span className="font-medium">{dateStr}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Time</span>
          <span className="font-medium">{timeStr}</span>
        </div>
      </div>

      {/* Customer */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-dashed border-border pb-1">
          Customer
        </p>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Name</span>
          <span className="font-semibold max-w-[60%] text-right">{order.customerName}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Phone</span>
          <span className="font-mono">{order.phone}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Type</span>
          <span className="uppercase font-semibold">{order.type}</span>
        </div>
        {order.deliveryAddress && (
          <div className="pt-1">
            <p className="text-muted-foreground text-[9px] mb-1">Delivery Address</p>
            <p className="text-[11px] bg-blue-50 border border-blue-200 p-2 rounded whitespace-normal break-words">
              {order.deliveryAddress}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
