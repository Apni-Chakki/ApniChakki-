import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../common/button';
import { RotateCcw, Clock } from 'lucide-react';

export function ActiveRentalsHeader({
  totalItems,
  viewHistory,
  onToggleHistory,
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <RotateCcw className="h-7 w-7 text-teal-500" />
          {t('Active Rentals')}
        </h1>
        <p className="text-muted-foreground">
          {totalItems} {t('rental(s) currently active')}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onToggleHistory}
          className="border-teal-200 text-teal-700 hover:bg-teal-50"
        >
          <Clock className="h-4 w-4 mr-2" />
          {viewHistory ? t('Hide History') : t('View History')}
        </Button>
      </div>
    </div>
  );
}
