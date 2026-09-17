import React from 'react';
import { Truck } from 'lucide-react';

export function PickupEmptyState() {
  return (
    <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden bg-white">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-gray-100 p-4 mb-4">
          <Truck className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="font-semibold text-lg text-gray-800">No active requests</h3>
        <p className="text-gray-400 text-sm mt-1">There are currently no pickup requests pending.</p>
      </div>
    </div>
  );
}
