import React from 'react';
import { Package, Plus, Minus } from 'lucide-react';
import { Card } from '@/components/common/card';
import { Badge } from '@/components/common/badge';
import { Button } from '@/components/common/button';
import { getStockStatus } from './inventoryUtils';

export default function InventoryMobileCard({ item, onOpenUpdateDialog }) {
  const status = getStockStatus(item);

  return (
    <Card className="p-3 space-y-3">
      {/* Top: product name + status */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-semibold text-sm break-words">{item.productName}</span>
        </div>
        <Badge className={`${status.color} shrink-0 text-[10px]`}>{status.label}</Badge>
      </div>

      {/* Stock info grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Current</p>
          <p className="text-sm font-bold">
            {item.currentStock} <span className="text-[10px] text-muted-foreground">{item.unit}</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Min</p>
          <p className="text-sm font-medium text-muted-foreground">
            {item.minStockLevel} <span className="text-[10px]">{item.unit}</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Max</p>
          <p className="text-sm font-medium text-muted-foreground">
            {item.maxStockLevel || '-'}{item.maxStockLevel ? <span className="text-[10px]"> {item.unit}</span> : ''}
          </p>
        </div>
      </div>

      {/* Last updated */}
      <p className="text-[11px] text-muted-foreground">
        Last updated: {new Date(item.lastUpdated).toLocaleDateString()}
      </p>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpenUpdateDialog(item, 'add')}
          className="text-green-600 hover:bg-green-50"
        >
          <Plus className="h-4 w-4 mr-1 shrink-0" strokeWidth={3} />
          Add
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpenUpdateDialog(item, 'remove')}
          className="text-red-600 hover:bg-red-50"
        >
          <Minus className="h-4 w-4 mr-1 shrink-0" strokeWidth={3} />
          Remove
        </Button>
      </div>
    </Card>
  );
}
