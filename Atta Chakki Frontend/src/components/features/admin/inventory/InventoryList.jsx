import React from 'react';
import { Package } from 'lucide-react';
import { Card } from '@/components/common/card';
import { Pagination } from '@/components/common/Pagination';
import InventoryMobileCard from './InventoryMobileCard';
import InventoryTable from './InventoryTable';

export default function InventoryList({
  items = [],
  totalItems,
  page,
  setPage,
  pageSize,
  setPageSize,
  onOpenUpdateDialog
}) {
  if (totalItems === 0) {
    return (
      <Card className="p-8 sm:p-12 text-center">
        <Package className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
        <p className="text-sm sm:text-base text-muted-foreground mb-2">
          No matching products found.
        </p>
      </Card>
    );
  }

  return (
    <>
      {/* Mobile: card list (below md) */}
      <div className="md:hidden space-y-3">
        {items.map((item) => (
          <InventoryMobileCard
            key={item.id}
            item={item}
            onOpenUpdateDialog={onOpenUpdateDialog}
          />
        ))}
      </div>

      {/* Desktop: table (md and up) */}
      <InventoryTable
        items={items}
        onOpenUpdateDialog={onOpenUpdateDialog}
      />

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
  );
}
