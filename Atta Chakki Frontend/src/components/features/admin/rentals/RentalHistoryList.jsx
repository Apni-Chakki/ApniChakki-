import React from 'react';
import { Card, CardContent } from '../../../common/card';
import { Badge } from '../../../common/badge';
import { Pagination } from '../../../common/Pagination';
import { Clock, Loader2 } from 'lucide-react';

export function RentalHistoryList({
  history,
  historyTotal,
  loadingHistory,
  historyPage,
  setHistoryPage,
  historyPageSize,
  setHistoryPageSize,
}) {
  return (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="flex items-center gap-3 px-1">
        <div className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-full text-sm font-bold shadow-sm border border-slate-200">
          <Clock className="h-4 w-4 text-slate-500" />
          Rental History
        </div>
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-500 font-semibold">
          {historyTotal} record(s)
        </span>
      </div>

      {loadingHistory ? (
        <div className="text-center py-8">
          <Loader2 className="animate-spin h-6 w-6 mx-auto text-slate-400" />
        </div>
      ) : historyTotal === 0 ? (
        <Card className="bg-slate-50/50 border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-slate-500 text-sm font-semibold">No rental history found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((h) => (
            <Card
              key={h.id}
              className={`border-l-4 ${
                h.status === 'returned'
                  ? 'border-l-green-400'
                  : h.status === 'active'
                  ? 'border-l-teal-400'
                  : h.status === 'overdue'
                  ? 'border-l-red-400'
                  : 'border-l-slate-300'
              }`}
            >
              <CardContent className="py-3 px-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <p className="font-bold text-sm">
                      {h.product_name} — #{h.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {h.customer_name} • {h.customer_phone}
                      {h.quantity > 1 && ` • Qty: ${h.quantity}${h.returned_quantity ? ` (${h.returned_quantity} returned)` : ''}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.rental_start_date).toLocaleDateString()} →{' '}
                      {new Date(h.rental_end_date).toLocaleDateString()}
                      {h.actual_return_date &&
                        ` (Returned: ${new Date(h.actual_return_date).toLocaleDateString()})`}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={`text-[10px] px-2 py-0.5 font-bold uppercase ${
                        h.status === 'returned'
                          ? 'bg-green-100 text-green-800 border-green-300'
                          : h.status === 'active'
                          ? 'bg-teal-100 text-teal-800 border-teal-300'
                          : h.status === 'overdue'
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      {h.status === 'returned'
                        ? '✅ Returned'
                        : h.status === 'active'
                        ? '🟢 Active'
                        : h.status === 'overdue'
                        ? '🔴 Overdue'
                        : h.status}
                    </Badge>
                    <p className="text-xs font-semibold text-slate-600 mt-1">
                      Rs. {parseInt(h.total_rental_amount || 0).toLocaleString()}
                    </p>
                    {parseFloat(h.late_penalty_total || 0) > 0 && (
                      <p className="text-xs text-red-600 font-bold">
                        Penalty: Rs. {parseInt(h.late_penalty_total).toLocaleString()}
                      </p>
                    )}
                    {h.deposit_status && h.deposit_status !== 'held' && (
                      <p className="text-[10px] text-muted-foreground capitalize">
                        Deposit: {h.deposit_status}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {historyTotal > 0 && (
        <Pagination
          currentPage={historyPage}
          totalItems={historyTotal}
          pageSize={historyPageSize}
          onPageChange={setHistoryPage}
          onPageSizeChange={(s) => {
            setHistoryPageSize(s);
            setHistoryPage(1);
          }}
          className="mt-4"
        />
      )}
    </div>
  );
}
