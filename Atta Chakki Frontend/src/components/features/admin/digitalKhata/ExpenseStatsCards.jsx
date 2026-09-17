import React from 'react';
import { Card } from '../../../common/card';
import { Wallet, Calendar as CalendarIcon } from 'lucide-react';

export function ExpenseStatsCards({ backendTotals }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
      <Card className="p-4 sm:p-6 bg-orange-50 border-orange-200">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-orange-800 font-medium text-sm sm:text-base">Today's Expenditure</p>
            <h2 className="text-xl sm:text-3xl font-bold text-orange-900 mt-1 sm:mt-2 break-all">
              Rs. {parseFloat(backendTotals.today || 0).toLocaleString()}
            </h2>
          </div>
          <div className="h-10 w-10 sm:h-12 sm:w-12 bg-orange-200 rounded-full flex items-center justify-center shrink-0">
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-orange-700" />
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-6 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-blue-800 font-medium text-sm sm:text-base">This Month's Total</p>
            <h2 className="text-xl sm:text-3xl font-bold text-blue-900 mt-1 sm:mt-2 break-all">
              Rs. {parseFloat(backendTotals.month || 0).toLocaleString()}
            </h2>
          </div>
          <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-200 rounded-full flex items-center justify-center shrink-0">
            <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-700" />
          </div>
        </div>
      </Card>
    </div>
  );
}
