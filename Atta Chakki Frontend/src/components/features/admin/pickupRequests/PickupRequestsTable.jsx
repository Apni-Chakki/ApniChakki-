import React from 'react';
import { useTranslation } from 'react-i18next';
import { OrderStatusBadge } from '../../../shared/OrderStatusBadge';
import { Button } from '../../../common/button';
import { PickupDriverDropdown } from './PickupDriverDropdown';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../common/table';
import { AlertCircle, User, Phone, MapPin, Package, Trash2 } from 'lucide-react';

export function PickupRequestsTable({
  orders,
  activePersonnel,
  onAssignPersonnel,
  onCancelClick,
  onArrivedAtShop,
}) {
  const { t } = useTranslation();

  return (
    <div className="hidden md:block rounded-xl border border-gray-100 shadow-sm overflow-hidden bg-white">
      <Table className="w-full table-auto">
        <TableHeader>
          <TableRow className="bg-slate-50/70 border-b border-gray-100">
            <TableHead className="px-3.5 py-3 text-xs font-bold text-slate-700 whitespace-nowrap">Order Info</TableHead>
            <TableHead className="px-3.5 py-3 text-xs font-bold text-slate-700 whitespace-nowrap">Customer</TableHead>
            <TableHead className="px-3.5 py-3 text-xs font-bold text-slate-700">Address</TableHead>
            <TableHead className="px-3.5 py-3 text-xs font-bold text-slate-700">Service Details</TableHead>
            <TableHead className="px-3.5 py-3 text-xs font-bold text-slate-700 text-right whitespace-nowrap">Status / Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="hover:bg-gray-50/60 transition-colors">
              {/* Order Info */}
              <TableCell className="px-3.5 py-3 align-top whitespace-normal min-w-[105px]">
                <div className="font-bold text-sm text-gray-900">#{order.id}</div>
                <div className="mt-0.5 text-[11px] text-gray-500">
                  {new Date(order.created_at).toLocaleString('en-US', {
                    hour: 'numeric',
                    minute: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="mt-1 flex flex-col gap-1 items-start">
                  <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    <AlertCircle className="h-2.5 w-2.5 shrink-0" /> TBD
                  </div>
                  {parseFloat(order.delivery_fee || 0) > 0 && (
                    <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                      Delivery: Rs. {Number(order.delivery_fee).toLocaleString()}
                    </div>
                  )}
                </div>
              </TableCell>

              {/* Customer */}
              <TableCell className="px-3.5 py-3 align-top whitespace-normal min-w-[125px]">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1 text-xs font-semibold text-gray-800">
                    <User className="h-3 w-3 text-gray-400 shrink-0" />{' '}
                    <span className="truncate max-w-[130px]">{order.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                    <Phone className="h-3 w-3 shrink-0" /> <span>{order.customer_phone}</span>
                  </div>
                </div>
              </TableCell>

              {/* Address */}
              <TableCell className="px-3.5 py-3 align-top whitespace-normal max-w-[160px]">
                <div className="flex items-start gap-1 text-xs text-gray-600">
                  <MapPin className="h-3 w-3 text-gray-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2 leading-tight break-words">{order.shipping_address || 'No address'}</span>
                </div>
              </TableCell>

              {/* Service Details */}
              <TableCell className="px-3.5 py-3 align-top whitespace-normal min-w-[130px]">
                <div className="space-y-0.5">
                  {order.items && order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-xs">
                      <Package className="h-3 w-3 text-primary shrink-0" />
                      <span className="font-medium text-gray-800 truncate max-w-[130px]">{item.name}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">({item.quantity} {item.unit})</span>
                    </div>
                  ))}
                </div>
              </TableCell>

              {/* Status / Actions */}
              <TableCell className="px-3.5 py-3 align-top text-right whitespace-normal">
                <div className="flex flex-col gap-1.5 items-end justify-start ml-auto">
                  {/* Status Badge & Compact Assign Driver Button */}
                  <div className="flex items-center gap-1.5 justify-end flex-wrap">
                    <OrderStatusBadge status={order.status} />
                    <PickupDriverDropdown
                      order={order}
                      activePersonnel={activePersonnel}
                      onAssignPersonnel={onAssignPersonnel}
                      variant="desktop"
                    />
                  </div>

                  {/* Awaiting Arrival / Update Weight + Delete row */}
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      onClick={() => onArrivedAtShop(order)}
                      disabled={order.status !== 'arrived_at_shop'}
                      className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border cursor-pointer border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-70 whitespace-nowrap"
                    >
                      {order.status === 'arrived_at_shop' ? 'Update Weight' : 'Awaiting Arrival'}
                    </button>

                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-6 w-6 px-0 flex items-center justify-center shrink-0"
                      onClick={() => onCancelClick(order)}
                      title="Cancel Request"
                    >
                      <Trash2 className="h-3 w-3 text-white" />
                    </Button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
