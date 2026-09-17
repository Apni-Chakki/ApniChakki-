import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../../common/badge';

export function PickupRequestsHeader({ totalItems }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-gray-100 p-4 sm:p-6 shadow-sm bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-amber-700 text-xs font-semibold uppercase tracking-wide mb-3">
            {t("Pickup Services")}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{t("Pickup Requests")}</h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm">
            {t("Manage requests for services where the driver has to pick up items (Trip unit).")}
          </p>
        </div>
        <Badge variant="secondary" className="text-sm sm:text-base font-bold px-3 sm:px-4 py-1.5 sm:py-2 self-start sm:self-auto">
          {totalItems} {t("Active Requests")}
        </Badge>
      </div>
    </div>
  );
}
