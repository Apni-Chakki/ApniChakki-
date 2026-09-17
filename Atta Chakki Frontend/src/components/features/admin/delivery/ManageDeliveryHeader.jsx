import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '../../../common/button';

export function ManageDeliveryHeader({ onAddClick }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl text-foreground font-bold">{t('Manage Delivery Personnel')}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Add and manage delivery team members
        </p>
      </div>
      <Button onClick={onAddClick} className="w-full sm:w-auto">
        <Plus className="h-4 w-4 mr-2 shrink-0" />
        Add Personnel
      </Button>
    </div>
  );
}
