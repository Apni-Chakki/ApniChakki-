import React from 'react';
import { Package, Plus, Minus } from 'lucide-react';
import { Card } from '@/components/common/card';
import { Badge } from '@/components/common/badge';
import { Button } from '@/components/common/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/common/table';
import { getStockStatus } from './inventoryUtils';

export default function InventoryTable({ items = [], onOpenUpdateDialog }) {
  return (
    <Card className="hidden md:block overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Product Name</TableHead>
            <TableHead>Current Stock</TableHead>
            <TableHead>Min Level</TableHead>
            <TableHead>Max Level</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const status = getStockStatus(item);
            return (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{item.productName}</span>
                    {item.is_rental === 1 && (
                      <Badge variant="outline" className="text-[10px] text-teal-700 bg-teal-50 border-teal-200">
                        Rental
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-lg">
                    {item.currentStock} {item.unit}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">
                    {item.minStockLevel} {item.unit}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">
                    {item.maxStockLevel || '-'} {item.maxStockLevel ? item.unit : ''}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={status.color}>{status.label}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {new Date(item.lastUpdated).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenUpdateDialog(item, 'add')}
                      className="text-green-600 hover:bg-green-50 flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-1" strokeWidth={3} />
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenUpdateDialog(item, 'remove')}
                      className="text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <Minus className="h-4 w-4 mr-1" strokeWidth={3} />
                      Remove
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
