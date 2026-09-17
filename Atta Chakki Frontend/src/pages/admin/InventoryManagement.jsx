import React from 'react';
import { Loader2 } from 'lucide-react';
import { PrintRestockList } from './PrintRestockList';
import {
  useInventory,
  InventoryHeader,
  InventoryStatsCards,
  InventoryFilterBar,
  InventoryList,
  UpdateStockModal
} from '@/components/features/admin/inventory';

export function InventoryManagement() {
  const {
    inventory,
    printInventory,
    setPrintInventory,
    loading,
    isUpdating,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    categories,
    stats,
    showUpdateDialog,
    setShowUpdateDialog,
    showPrintDialog,
    setShowPrintDialog,
    selectedProduct,
    updateType,
    updateQuantity,
    setUpdateQuantity,
    updateNotes,
    setUpdateNotes,
    handleUpdateStock,
    openUpdateDialog,
    handlePrintRestockList
  } = useInventory();

  if (loading && inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Inventory Data...</p>
      </div>
    );
  }

  return (
    <div>
      <InventoryHeader onPrintRestockList={handlePrintRestockList} />

      <InventoryStatsCards stats={stats} />

      <InventoryFilterBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        categories={categories}
      />

      <InventoryList
        items={inventory}
        totalItems={totalItems}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        onOpenUpdateDialog={openUpdateDialog}
      />

      <UpdateStockModal
        showUpdateDialog={showUpdateDialog}
        setShowUpdateDialog={setShowUpdateDialog}
        selectedProduct={selectedProduct}
        updateType={updateType}
        updateQuantity={updateQuantity}
        setUpdateQuantity={setUpdateQuantity}
        updateNotes={updateNotes}
        setUpdateNotes={setUpdateNotes}
        isUpdating={isUpdating}
        onUpdateStock={handleUpdateStock}
      />

      <PrintRestockList
        items={printInventory}
        open={showPrintDialog}
        onClose={() => {
          setShowPrintDialog(false);
          setPrintInventory([]);
        }}
      />
    </div>
  );
}

export default InventoryManagement;
