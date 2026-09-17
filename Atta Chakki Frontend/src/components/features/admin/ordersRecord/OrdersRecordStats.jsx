import React from 'react';
import { Card } from '../../../common/card';
import { Package, CheckCircle, Clock, TrendingUp } from 'lucide-react';

export function OrdersRecordStats({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
      <Card className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">Total</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Package className="h-5 w-5 text-primary" />
          </div>
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">Completed</p>
            <p className="text-xl font-bold">{stats.completed}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">Pending</p>
            <p className="text-xl font-bold">{stats.pending}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">Revenue</p>
            <p className="text-lg font-bold truncate">Rs. {(stats.totalRevenue / 1000).toLocaleString('en-IN')}K</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
        </div>
      </Card>
    </div>
  );
}

export default OrdersRecordStats;
