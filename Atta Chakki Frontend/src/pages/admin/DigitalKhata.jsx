import React from 'react';
import { Loader2 } from 'lucide-react';
import { useDigitalKhata } from '../../components/features/admin/digitalKhata/useDigitalKhata';
import { DigitalKhataHeader } from '../../components/features/admin/digitalKhata/DigitalKhataHeader';
import { ExpenseStatsCards } from '../../components/features/admin/digitalKhata/ExpenseStatsCards';
import { AddExpenseForm } from '../../components/features/admin/digitalKhata/AddExpenseForm';
import { ExpenseRecordsList } from '../../components/features/admin/digitalKhata/ExpenseRecordsList';
import { PrintExpenseReport } from './PrintExpenseReport';

export function DigitalKhata() {
  const {
    expenses,
    backendTotals,
    loading,
    isSaving,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    filteredTotalAmount,
    printExpenses,
    setPrintExpenses,
    showPrintReport,
    setShowPrintReport,
    amount,
    setAmount,
    category,
    setCategory,
    customCategory,
    setCustomCategory,
    productCategories,
    description,
    setDescription,
    expenseDate,
    setExpenseDate,
    isAdding,
    setIsAdding,
    dateRange,
    setDateRange,
    handleAddExpense,
    handleDelete,
    handlePrintReport,
    getPeriodLabel,
  } = useDigitalKhata();

  if (loading && expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Khata Records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      <DigitalKhataHeader
        onPrintReport={handlePrintReport}
        isAdding={isAdding}
        onToggleAdd={() => setIsAdding(prev => !prev)}
      />

      <ExpenseStatsCards backendTotals={backendTotals} />

      {isAdding && (
        <AddExpenseForm
          amount={amount}
          setAmount={setAmount}
          category={category}
          setCategory={setCategory}
          customCategory={customCategory}
          setCustomCategory={setCustomCategory}
          productCategories={productCategories}
          description={description}
          setDescription={setDescription}
          expenseDate={expenseDate}
          setExpenseDate={setExpenseDate}
          isSaving={isSaving}
          onSave={handleAddExpense}
        />
      )}

      <ExpenseRecordsList
        expenses={expenses}
        totalItems={totalItems}
        filteredTotalAmount={filteredTotalAmount}
        page={page}
        pageSize={pageSize}
        setPage={setPage}
        setPageSize={setPageSize}
        dateRange={dateRange}
        setDateRange={setDateRange}
        onDelete={handleDelete}
      />

      <PrintExpenseReport
        expenses={printExpenses}
        dateRangeLabel={getPeriodLabel()}
        open={showPrintReport}
        onClose={() => {
          setShowPrintReport(false);
          setPrintExpenses([]);
        }}
      />
    </div>
  );
}
