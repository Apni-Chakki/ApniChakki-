import React from 'react';
import { Card, CardContent } from '../../../common/card';
import { Package, AlertTriangle, Shield } from 'lucide-react';

export function RentalSummaryCards({ summary }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
        <CardContent className="py-4 text-center">
          <Package className="h-6 w-6 text-teal-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-teal-800">{summary.total_active || 0}</p>
          <p className="text-xs text-teal-600 font-medium">Active Rentals</p>
        </CardContent>
      </Card>

      <Card
        className={`bg-gradient-to-br border-red-200 ${
          summary.total_overdue > 0
            ? 'from-red-50 to-rose-50 animate-pulse'
            : 'from-slate-50 to-gray-50 border-slate-200'
        }`}
      >
        <CardContent className="py-4 text-center">
          <AlertTriangle
            className={`h-6 w-6 mx-auto mb-1 ${
              summary.total_overdue > 0 ? 'text-red-600' : 'text-slate-400'
            }`}
          />
          <p
            className={`text-2xl font-bold ${
              summary.total_overdue > 0 ? 'text-red-800' : 'text-slate-500'
            }`}
          >
            {summary.total_overdue || 0}
          </p>
          <p
            className={`text-xs font-medium ${
              summary.total_overdue > 0 ? 'text-red-600' : 'text-slate-400'
            }`}
          >
            Overdue Items
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
        <CardContent className="py-4 text-center">
          <Shield className="h-6 w-6 text-amber-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-amber-800">
            Rs. {parseInt(summary.total_deposits_held || 0).toLocaleString()}
          </p>
          <p className="text-xs text-amber-600 font-medium">Deposits Held</p>
        </CardContent>
      </Card>
    </div>
  );
}
