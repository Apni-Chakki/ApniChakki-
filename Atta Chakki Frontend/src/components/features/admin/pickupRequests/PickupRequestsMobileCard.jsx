import React from 'react';
import { OrderStatusBadge } from '../../../shared/OrderStatusBadge';
import { Button } from '../../../common/button';
import { PickupDriverDropdown } from './PickupDriverDropdown';
import { AlertCircle, User, Phone, MapPin, Package, Trash2 } from 'lucide-react';

export function PickupRequestsMobileCard({
  order,
  activePersonnel,
  onAssignPersonnel,
  onCancelClick,
  onArrivedAtShop,
}) {
  return (
    <div className="rounded-xl border border-gray-100 shadow-sm p-4 space-y-3 bg-white">
      {/* Top: Order ID + date + status */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-gray-100">
        <div className="min-w-0">
          <div className="font-bold text-base text-gray-900">#{order.id}</div>
          <div className="mt-0.5 text-[11px] text-gray-500">
            {new Date(order.created_at).toLocaleString('en-US', {
              hour: 'numeric',
              minute: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* TBD badge */}
      <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
        <AlertCircle className="h-3 w-3" /> TBD – Weight Pending
      </div>

      {/* Customer */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="break-words">{order.customer_name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span className="break-all">{order.customer_phone}</span>
        </div>
      </div>

      {/* Address */}
      <div className="flex items-start gap-2 text-sm text-gray-600">
        <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
        <span className="leading-snug break-words">{order.shipping_address || 'No address'}</span>
      </div>

      {/* Items */}
      <div className="space-y-1 pt-2 border-t border-gray-100">
        {order.items && order.items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <Package className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-medium text-gray-800 break-words">{item.name}</span>
            <span className="text-xs text-gray-400 shrink-0">({item.quantity} {item.unit})</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <PickupDriverDropdown
            order={order}
            activePersonnel={activePersonnel}
            onAssignPersonnel={onAssignPersonnel}
            variant="mobile"
          />

          <Button
            variant="destructive"
            size="icon"
            className="h-9 w-9 px-0 flex items-center justify-center shrink-0"
            onClick={() => onCancelClick(order)}
          >
            <Trash2 className="h-4 w-4 text-white" />
          </Button>
        </div>

        <button
          onClick={() => onArrivedAtShop(order)}
          disabled={order.status !== 'arrived_at_shop'}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer border-teal-200 bg-teal-50 text-teal-700 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {order.status === 'arrived_at_shop' ? 'Update Weight' : 'Awaiting Arrival'}
        </button>
      </div>
    </div>
  );
}
