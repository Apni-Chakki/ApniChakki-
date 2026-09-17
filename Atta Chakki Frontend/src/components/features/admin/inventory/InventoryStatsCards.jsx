import React from 'react';
import { Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/common/card';

export default function InventoryStatsCards({ stats = {} }) {
  const lowStockCount = stats.low_stock_count || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
      <Card className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-sm text-muted-foreground leading-tight">Total Products</p>
            <p className="text-lg sm:text-2xl font-bold mt-1">{stats.total_products || 0}</p>
          </div>
          <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
          </div>
        </div>
      </Card>

      <Card className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-sm text-muted-foreground leading-tight">Low Stock</p>
            <p className="text-lg sm:text-2xl font-bold mt-1">{lowStockCount}</p>
          </div>
          <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 sm:h-6 sm:w-6 text-red-600" />
          </div>
        </div>
      </Card>

      <Card className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-sm text-muted-foreground leading-tight">Well Stocked</p>
            <p className="text-lg sm:text-2xl font-bold mt-1">{stats.well_stocked_count || 0}</p>
          </div>
          <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
          </div>
        </div>
      </Card>
    </div>
  );
}
