import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard } from 'lucide-react';

export function TrackOrderSummary({ order }) {
  const { t } = useTranslation();

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-indigo-500" />
        {t('Order Summary')}
      </h3>
      <div className="space-y-2 mb-3">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-50 last:border-0">
            <div>
              <span className="font-semibold text-slate-800">{item.name}</span>
              <span className="text-slate-400 ml-1.5 text-xs">×{item.quantity}</span>
            </div>
            <span className="font-bold text-slate-700 text-xs">
              Rs. {(item.price * item.quantity).toLocaleString('en-PK')}
            </span>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-dashed border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-500">{t('Payment Method')}</span>
          <span className="text-xs font-semibold capitalize text-slate-800">
            {order.paymentMethod || 'COD'}
            {order.paymentStatus === 'paid' && (
              <span className="ml-1.5 text-xs bg-primary/10 text-primary/90 px-1.5 py-0.5 rounded">PAID</span>
            )}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-slate-800">{t('Total Amount')}</span>
          <span className="text-base font-extrabold text-primary">
            Rs. {order.total?.toLocaleString('en-PK')}
          </span>
        </div>
      </div>
    </div>
  );
}
