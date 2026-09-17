import React from 'react';
import { Card, CardContent } from '../../../common/card';
import { RotateCcw } from 'lucide-react';

export function RentalEmptyState() {
  return (
    <Card className="bg-muted/50 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-background p-4 mb-4">
          <RotateCcw className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg">No Active Rentals</h3>
        <p className="text-muted-foreground">When items are rented out, they will appear here.</p>
      </CardContent>
    </Card>
  );
}
