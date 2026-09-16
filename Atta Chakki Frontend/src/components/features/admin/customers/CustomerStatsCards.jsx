import { User, UserCheck, Award, Sparkles } from 'lucide-react';
import { Card } from '../../../common/card';

/**
 * Four stat cards on the "Manage Customers" admin page:
 * Total Customers, Active Accounts, VIP Customers, Total Spent.
 *
 * Extracted from ManageCustomers.jsx (Phase 3.8a) — behavior preserved exactly.
 *
 * @param {{
 *   totalCustomersCount: number,
 *   activeCustomersCount: number,
 *   vipCustomersCount: number,
 *   totalSalesAmount: number,
 *   t: (s: string) => string,
 * }} props
 */
export function CustomerStatsCards({
  totalCustomersCount,
  activeCustomersCount,
  vipCustomersCount,
  totalSalesAmount,
  t,
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      <Card className="p-3 sm:p-4 flex flex-col items-center text-center gap-2 border-l-4 border-blue-500 shadow-sm">
        <div className="p-2 sm:p-3 bg-blue-100 rounded-full text-blue-600">
          <User className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
        <div>
          <p className="text-[11px] sm:text-sm font-medium text-gray-500 leading-tight">
            {t('Total Customers')}
          </p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900">{totalCustomersCount}</p>
        </div>
      </Card>

      <Card className="p-3 sm:p-4 flex flex-col items-center text-center gap-2 border-l-4 border-green-500 shadow-sm">
        <div className="p-2 sm:p-3 bg-green-100 rounded-full text-green-600">
          <UserCheck className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
        <div>
          <p className="text-[11px] sm:text-sm font-medium text-gray-500 leading-tight">
            {t('Active Accounts')}
          </p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900">{activeCustomersCount}</p>
        </div>
      </Card>

      <Card className="p-3 sm:p-4 flex flex-col items-center text-center gap-2 border-l-4 border-purple-500 shadow-sm">
        <div className="p-2 sm:p-3 bg-purple-100 rounded-full text-purple-600">
          <Award className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
        <div>
          <p className="text-[11px] sm:text-sm font-medium text-gray-500 leading-tight">
            {t('VIP Customers')}
          </p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900">{vipCustomersCount}</p>
        </div>
      </Card>

      <Card className="p-3 sm:p-4 flex flex-col items-center text-center gap-2 border-l-4 border-amber-500 shadow-sm">
        <div className="p-2 sm:p-3 bg-amber-100 rounded-full text-amber-600">
          <Sparkles className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
        <div className="w-full">
          <p className="text-[11px] sm:text-sm font-medium text-gray-500 leading-tight">
            {t('Total Spent')}
          </p>
          <p className="text-sm sm:text-2xl font-bold text-gray-900 break-all">
            Rs. {totalSalesAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </Card>
    </div>
  );
}
