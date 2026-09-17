import React from 'react';

export default function SlipItemsList({ items = [] }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b-2 border-dashed border-border pb-1 mb-2">
        Order Items
      </p>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="text-[11px] border-b border-dashed border-border/50 pb-2 last:border-0">
            <div className="flex justify-between items-start">
              <p className="font-semibold flex-1 pr-2 whitespace-normal break-words">
                {item.name || item.service?.name}
              </p>
              {!item.isWeightPending && (
                <p className="font-bold whitespace-nowrap">
                  Rs.{(item.quantity * (item.price_at_purchase || item.service?.price || 0)).toLocaleString()}
                </p>
              )}
            </div>

            {(item.customizations?.length > 0 || item.is_cleaning || item.is_grinding) && (
              <p className="text-[9px] text-muted-foreground italic mb-1">
                ({item.customizations?.length > 0
                  ? item.customizations.map(c => c.option_name).join(' + ')
                  : `${item.is_cleaning ? 'Cleaning' : ''}${item.is_cleaning && item.is_grinding ? ' + ' : ''}${item.is_grinding ? 'Grinding' : ''}`
                })
              </p>
            )}

            {item.isWeightPending ? (
              <p className="text-orange-600 font-bold text-[10px] mt-0.5">⚠ WEIGHT TO BE CONFIRMED</p>
            ) : (() => {
              const iPrice = item.price_at_purchase || item.service?.price || 0;
              const oPrice = item.original_price || null;
              const hasDisc = oPrice && oPrice > iPrice;
              return (
                <p className="text-muted-foreground text-[10px] mt-0.5 flex items-center gap-1 flex-wrap">
                  <span>{item.quantity} {item.unit || item.service?.unit || 'unit'} ×</span>
                  {hasDisc ? (
                    <>
                      <span className="line-through text-muted-foreground">Rs.{Number(oPrice).toLocaleString()}</span>
                      <span className="text-green-600 font-bold">Rs.{Number(iPrice).toLocaleString()}</span>
                      <span className="text-green-600 text-[8px] font-bold bg-green-50 border border-green-200 px-0.5 rounded">DISC</span>
                    </>
                  ) : (
                    <span>Rs.{Number(iPrice).toLocaleString()}</span>
                  )}
                </p>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
