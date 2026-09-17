import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../common/button';
import { Printer, Plus } from 'lucide-react';

export function DigitalKhataHeader({ onPrintReport, isAdding, onToggleAdd }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">{t('Digital Khata')}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Track daily expenditures and purchases</p>
      </div>
      <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
        <Button
          variant="outline"
          onClick={onPrintReport}
          className="w-full md:w-[180px]"
        >
          <Printer className="h-4 w-4 mr-2 shrink-0" />
          Print Report
        </Button>
        {isAdding ? (
          <Button
            variant="outline"
            onClick={onToggleAdd}
            className="w-full md:w-[180px]"
          >
            Cancel
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={onToggleAdd}
            className="w-full md:w-[180px] bg-primary hover:bg-primary/90 text-primary-foreground border-primary hover:border-primary"
          >
            <Plus className="h-4 w-4 mr-2 shrink-0" />
            Add New Expense
          </Button>
        )}
      </div>
    </div>
  );
}
