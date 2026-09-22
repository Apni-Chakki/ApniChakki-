import React from 'react';
import { Card } from '../../../common/card';
import { Button } from '../../../common/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../common/table';
import { Pagination } from '../../../common/Pagination';
import { ExpenseFilterBar } from './ExpenseFilterBar';
import { Trash2 } from 'lucide-react';

function ExpenseRecordsListComponent({
  expenses,
  totalItems,
  filteredTotalAmount,
  page,
  pageSize,
  setPage,
  setPageSize,
  dateRange,
  setDateRange,
  onDelete,
}) {
  return (
    <Card className="overflow-hidden">
      <div className="p-3 sm:p-4 border-b bg-muted/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h3 className="font-semibold text-sm sm:text-base">Expense Records</h3>
        <ExpenseFilterBar dateRange={dateRange} setDateRange={setDateRange} />
      </div>

      {/* Mobile: card list (below md) */}
      <div className="md:hidden p-3 space-y-2">
        {totalItems === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">No expenses found for the selected period.</p>
        ) : (
          expenses.map((expense) => (
            <div key={expense.id} className="border rounded-lg p-3 bg-card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground">
                      {expense.category}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(expense.date).toLocaleDateString()} • {new Date(expense.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {expense.description && expense.description !== '-' && (
                    <p className="text-xs text-muted-foreground break-words">{expense.description}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">By: {expense.recordedBy}</p>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8 px-0 shrink-0"
                  onClick={() => onDelete(expense.id)}
                >
                  <Trash2 className="h-4 w-4 text-white" />
                </Button>
              </div>
              <div className="flex justify-end pt-2 border-t border-border">
                <span className="font-bold text-red-600 break-all">Rs. {expense.amount.toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: table (md and up) */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Recorded By</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {totalItems === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No expenses found for the selected period.
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">
                    {new Date(expense.date).toLocaleDateString()} <br />
                    <span className="text-xs text-muted-foreground">
                      {new Date(expense.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {expense.category}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {expense.description || '-'}
                  </TableCell>
                  <TableCell className="text-sm">{expense.recordedBy}</TableCell>
                  <TableCell className="text-right font-bold text-red-600">
                    Rs. {expense.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 px-0 flex items-center justify-center"
                      onClick={() => onDelete(expense.id)}
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalItems > 0 && (
        <Pagination
          currentPage={page}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          className="mt-4"
        />
      )}

      {/* Footer Total for Filtered View */}
      {totalItems > 0 && (
        <div className="p-3 sm:p-4 border-t bg-muted/10 flex flex-col sm:flex-row sm:justify-end sm:items-center gap-1 sm:gap-4">
          <span className="text-muted-foreground font-medium text-sm">Total for period:</span>
          <span className="text-lg sm:text-xl font-bold text-foreground break-all">
            Rs. {filteredTotalAmount.toLocaleString()}
          </span>
        </div>
      )}
    </Card>
  );
}

export const ExpenseRecordsList = React.memo(ExpenseRecordsListComponent);
