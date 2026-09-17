import { Loader2 } from 'lucide-react';
import { Pagination } from '../../components/common/Pagination';
import { PrintSlip } from './PrintSlip';
import { useActiveRentals } from '../../components/features/admin/rentals/useActiveRentals';
import { ActiveRentalsHeader } from '../../components/features/admin/rentals/ActiveRentalsHeader';
import { RentalSummaryCards } from '../../components/features/admin/rentals/RentalSummaryCards';
import { ActiveRentalCard } from '../../components/features/admin/rentals/ActiveRentalCard';
import { RentalEmptyState } from '../../components/features/admin/rentals/RentalEmptyState';
import { RentalHistoryList } from '../../components/features/admin/rentals/RentalHistoryList';
import { RentalReturnModal } from '../../components/features/admin/rentals/RentalReturnModal';

export function ActiveRentals() {
  const {
    rentals,
    summary,
    loading,
    returnModal,
    setReturnModal,
    returnNotes,
    setReturnNotes,
    isReturning,
    viewHistory,
    history,
    loadingHistory,
    printOrder,
    setPrintOrder,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    historyPage,
    setHistoryPage,
    historyPageSize,
    setHistoryPageSize,
    historyTotal,
    handlePrintSlip,
    handlePdfAndWhatsApp,
    handleReturn,
    handleToggleHistory,
  } = useActiveRentals();

  if (loading && rentals.length === 0) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" />
        <p className="text-muted-foreground mt-2">Loading Active Rentals...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <ActiveRentalsHeader
        totalItems={totalItems}
        viewHistory={viewHistory}
        onToggleHistory={handleToggleHistory}
      />

      {/* Summary Cards */}
      <RentalSummaryCards summary={summary} />

      {/* Active Rentals Grid */}
      {totalItems === 0 ? (
        <RentalEmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {rentals.map((rental) => (
              <ActiveRentalCard
                key={rental.id}
                rental={rental}
                onProcessReturn={setReturnModal}
                onPrintSlip={handlePrintSlip}
                onPdfAndWhatsApp={handlePdfAndWhatsApp}
              />
            ))}
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
        </>
      )}

      {/* History Section */}
      {viewHistory && (
        <RentalHistoryList
          history={history}
          historyTotal={historyTotal}
          loadingHistory={loadingHistory}
          historyPage={historyPage}
          setHistoryPage={setHistoryPage}
          historyPageSize={historyPageSize}
          setHistoryPageSize={setHistoryPageSize}
        />
      )}

      {/* Return Processing Dialog */}
      <RentalReturnModal
        rental={returnModal}
        onClose={() => {
          setReturnModal(null);
          setReturnNotes('');
        }}
        returnNotes={returnNotes}
        setReturnNotes={setReturnNotes}
        onConfirmReturn={handleReturn}
        isReturning={isReturning}
      />

      {/* Print Slip Dialog */}
      {printOrder && (
        <PrintSlip
          order={printOrder}
          open={!!printOrder}
          onClose={() => setPrintOrder(null)}
        />
      )}
    </div>
  );
}
