import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Phone, MapPin, Truck } from 'lucide-react';

export function TrackOrderDeliveryDetails({ order }) {
  const { t } = useTranslation();

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <User className="h-4 w-4 text-blue-500" />
        {t('Delivery Details')}
      </h3>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <User className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500">{t('Customer')}</p>
            <p className="text-sm font-semibold text-slate-800">{order.customerName}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Phone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500">{t('Phone')}</p>
            <a href={`tel:${order.phone}`} className="text-sm font-semibold text-blue-600 hover:underline">
              {order.phone}
            </a>
          </div>
        </div>
        {order.deliveryAddress && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">{t('Address')}</p>
              <p className="text-sm font-medium text-slate-800">{order.deliveryAddress}</p>
            </div>
          </div>
        )}
        {order.driverName && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-slate-500 mb-1.5">{t('Assigned Driver')}</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Truck className="h-3.5 w-3.5" />
              </div>
              <p className="text-sm font-bold text-slate-800">{order.driverName}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
