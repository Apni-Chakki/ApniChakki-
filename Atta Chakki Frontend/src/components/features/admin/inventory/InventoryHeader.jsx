import React from 'react';
import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';
import { Button } from '@/components/common/button';

export default function InventoryHeader({ onPrintRestockList }) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 sm:mb-6 flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">
          {t('Inventory Management')}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Track and manage stock levels for your products
        </p>
      </div>

      <Button variant="outline" onClick={onPrintRestockList} className="w-full md:w-auto">
        <Printer className="h-4 w-4 mr-2 shrink-0" />
        Print Restock List
      </Button>
    </div>
  );
}
