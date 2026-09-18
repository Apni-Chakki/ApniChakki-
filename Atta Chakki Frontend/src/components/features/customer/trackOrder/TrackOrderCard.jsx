import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../common/card';
import { Button } from '../../../common/button';
import { OrderStatusBadge } from '../../../shared/OrderStatusBadge';
import { OrderStatusTimeline } from './OrderStatusTimeline';
import { TrackOrderDeliveryDetails } from './TrackOrderDeliveryDetails';
import { TrackOrderSummary } from './TrackOrderSummary';
import { getStatusInfo } from './trackOrderConstants';
import { Package, ChevronUp, ChevronDown } from 'lucide-react';

export function TrackOrderCard({
  order,
  isExpanded,
  onToggleExpand,
  onCancelClick,
}) {
  const { t } = useTranslation();
  const statusColors = getStatusInfo(order.status);

  return (
    <Card className="overflow-hidden shadow-md border-0 rounded-2xl bg-white hover:shadow-lg transition-shadow">
      {/* Order header — clickable */}
      <div
        onClick={onToggleExpand}
        className={`p-4 sm:p-5 cursor-pointer flex flex-wrap items-center justify-between gap-3 ${
          isExpanded ? 'border-b border-slate-100' : ''
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className={`p-2.5 rounded-xl ${statusColors.bg}`}>
            <Package className={`h-5 w-5 ${statusColors.color}`} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-0.5">
              {t('Order')} #{order.id}
            </div>
            <div className="text-sm font-bold text-slate-800">
              {new Date(order.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <OrderStatusBadge status={order.status} t={t} />
          <div className="p-1.5 border border-slate-200 rounded-full text-slate-400 flex items-center justify-center">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-5 sm:p-7 bg-gray-50/40 animate-in slide-in-from-top-4 duration-300">
          {/* Timeline */}
          <div className="mb-8 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hidden sm:block">
            <h3 className="text-base font-bold text-slate-800 mb-5">{t('Status Timeline')}</h3>
            <OrderStatusTimeline currentStatus={order.status} />
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <TrackOrderDeliveryDetails order={order} />
            <TrackOrderSummary order={order} />
          </div>

          {/* Cancel section */}
          {order.status === 'pending' && (
            <div className="bg-yellow-50/70 border border-yellow-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-yellow-800 mb-0.5 text-sm">Need to make changes?</h4>
                <p className="text-xs text-yellow-700">
                  You can still cancel this order because it is in pending state.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => onCancelClick(order)}
                className="w-full sm:w-auto font-bold rounded-xl text-sm"
              >
                Cancel Order
              </Button>
            </div>
          )}

          {/* Cancelled details */}
          {order.status === 'cancelled' && (
            <div className="bg-red-50/70 border border-red-100 p-4 rounded-2xl">
              <h4 className="font-bold text-red-800 mb-1.5 text-sm">Cancellation Details</h4>
              <p className="text-xs text-red-700 mb-1">
                <span className="font-semibold">Reason:</span> {order.cancellationReason || 'Not provided'}
              </p>
              <p className="text-xs text-red-700">
                <span className="font-semibold">By:</span> {order.cancelledBy || 'System'}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
