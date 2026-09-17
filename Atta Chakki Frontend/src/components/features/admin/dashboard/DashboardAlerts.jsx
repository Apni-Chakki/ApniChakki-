import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/common/alert';

export default function DashboardAlerts({
  isLoading,
  lowStockCount,
  lowStockItems = [],
  overdueOrdersCount
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Low Stock Alert Component */}
      {!isLoading && lowStockCount > 0 && (
        <Card className="border-red-200 bg-gradient-to-r from-red-50 to-white shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-red-200 bg-red-50 flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-red-100 p-3 rounded-full shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-red-900 text-lg uppercase tracking-tight">
                  {t('Stock Exhaustion Warning')}
                </h3>
                <p className="text-red-700 text-sm font-medium mt-1">
                  {lowStockCount} {t('product(s) below minimum threshold')}
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              className="shrink-0 font-bold tracking-wide w-full md:w-auto shadow-sm"
              onClick={() => navigate('/admin/inventory')}
            >
              {t('Manage Inventory')}
            </Button>
          </div>
          <div className="p-4 sm:p-6 bg-red-50/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {lowStockItems.slice(0, 7).map((item, i) => (
                <div
                  key={item.id || i}
                  className="flex justify-between items-center p-3 sm:p-4 bg-white border border-red-100 rounded-xl shadow-[0_2px_10px_-4px_rgba(220,38,38,0.15)] hover:border-red-300 transition-colors"
                >
                  <div className="mr-3 overflow-hidden">
                    <p className="font-bold text-gray-800 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('Min required')}: {item.min} {item.unit}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-red-700 font-extrabold text-xl leading-none">{item.stock}</p>
                    <p className="text-[10px] uppercase font-bold text-red-800/60 tracking-wider mt-1">
                      {item.unit}
                    </p>
                  </div>
                </div>
              ))}
              {lowStockCount > 7 && (
                <div
                  onClick={() => navigate('/admin/inventory')}
                  className="flex flex-col items-center justify-center p-3 bg-red-50/50 border border-red-200 border-dashed rounded-xl text-red-800 font-bold text-sm cursor-pointer hover:bg-red-100 transition-colors h-full min-h-[70px]"
                >
                  <span>+{lowStockCount - 7} {t('more items')}</span>
                  <span className="text-xs font-normal opacity-80 mt-0.5">{t('Click to view all')}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Overdue Orders Alert - Only shows if Overdue items exist */}
      {!isLoading && overdueOrdersCount > 0 && (
        <Alert variant="destructive" className="bg-orange-50 border-orange-200 text-orange-900 shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
          <AlertCircle className="h-5 w-5 text-orange-600 mb-0.5" />
          <AlertTitle className="text-orange-900 font-bold ml-2">{t('Overdue Orders Detection')}</AlertTitle>
          <AlertDescription className="text-orange-800 ml-2 mt-1">
            There are <strong>{overdueOrdersCount}</strong> orders that have passed their expected delivery or pickup date.
            <Button
              variant="link"
              onClick={() => navigate('/admin/orders/pending')}
              className="text-orange-900 font-bold px-1 h-auto py-0 ml-1 underline underline-offset-2"
            >
              {t('Process Now')}
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
