import React from 'react';
import { useTranslation } from 'react-i18next';

export default function CustomMixHeader() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          {t('Custom Mix Requests')}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Manage customer requests for custom multigrain proportions.
        </p>
      </div>
    </div>
  );
}
