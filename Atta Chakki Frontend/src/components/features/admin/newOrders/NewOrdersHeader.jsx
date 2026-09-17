import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../../common/badge';
import { Weight } from 'lucide-react';

export function NewOrdersHeader({ totalItems, heavyThreshold }) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">{t('New Orders')}</h1>
        <p className="text-sm text-muted-foreground">{totalItems} pending</p>
      </div>
      {heavyThreshold && (
        <Badge variant="outline" className="text-xs text-purple-700 border-purple-300 bg-purple-50">
          <Weight className="h-3 w-3 mr-1" />
          Heavy Order Limit: {heavyThreshold} kg
        </Badge>
      )}
    </div>
  );
}
