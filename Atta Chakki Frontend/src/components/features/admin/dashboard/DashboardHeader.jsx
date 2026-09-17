import React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/common/button';

export default function DashboardHeader({ isLoading, onRefresh }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl font-black tracking-tight text-gray-900">
          {t('Dashboard')} {t('Overview')}
        </h1>
        <p className="text-gray-500 text-sm mt-2">{t('Real-time store metrics and alerts')}</p>
      </div>
      <Button
        onClick={onRefresh}
        variant="outline"
        size="sm"
        className="hidden sm:flex"
        style={{ borderColor: '#8b6f47', color: '#8b6f47' }}
        disabled={isLoading}
      >
        <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        {t('Refresh Stats')}
      </Button>
    </div>
  );
}
