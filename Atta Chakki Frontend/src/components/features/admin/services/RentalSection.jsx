import React from 'react';
import { Input } from '../../../common/input';
import { Label } from '../../../common/label';
import { Checkbox } from '../../../common/checkbox';

export function RentalSection({ formData, setFormData, isSaving }) {
  return (
    <>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_rental"
          checked={formData.is_rental}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_rental: !!checked }))}
          disabled={isSaving}
        />
        <Label htmlFor="is_rental" className="font-semibold text-teal-700 cursor-pointer">
          📦 Enable Rental (Rent this item to customers per day)
        </Label>
      </div>

      {formData.is_rental && (
        <div className="p-4 bg-teal-50/60 rounded-lg border border-teal-200 space-y-3 animate-in fade-in slide-in-from-top-2">
          <p className="text-sm font-bold text-teal-800">📦 Rental Configuration</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label htmlFor="rental_price_per_day" className="text-xs font-semibold text-teal-700">Rental Price / Day (Rs.) *</Label>
              <Input
                id="rental_price_per_day"
                type="number"
                step="0.01"
                placeholder="e.g., 200"
                value={formData.rental_price_per_day}
                onChange={(e) => setFormData({ ...formData, rental_price_per_day: e.target.value })}
                disabled={isSaving}
                className="mt-1 border-teal-200 focus-visible:ring-teal-400"
              />
            </div>
            <div>
              <Label htmlFor="security_deposit" className="text-xs font-semibold text-teal-700">Security Deposit (Rs.) *</Label>
              <Input
                id="security_deposit"
                type="number"
                step="0.01"
                placeholder="e.g., 1000 (Refundable)"
                value={formData.security_deposit}
                onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
                disabled={isSaving}
                className="mt-1 border-teal-200 focus-visible:ring-teal-400"
              />
            </div>
            <div>
              <Label htmlFor="late_penalty_per_day" className="text-xs font-semibold text-teal-700">Late Fine / Day (Rs.)</Label>
              <Input
                id="late_penalty_per_day"
                type="number"
                step="0.01"
                placeholder="e.g., 50"
                value={formData.late_penalty_per_day}
                onChange={(e) => setFormData({ ...formData, late_penalty_per_day: e.target.value })}
                disabled={isSaving}
                className="mt-1 border-teal-200 focus-visible:ring-teal-400"
              />
            </div>
            <div>
              <Label htmlFor="rental_available_qty" className="text-xs font-semibold text-teal-700">Available Qty for Rental *</Label>
              <Input
                id="rental_available_qty"
                type="number"
                placeholder="e.g., 5"
                value={formData.rental_available_qty}
                onChange={(e) => setFormData({ ...formData, rental_available_qty: e.target.value })}
                disabled={isSaving}
                className="mt-1 border-teal-200 focus-visible:ring-teal-400"
              />
            </div>
          </div>
          <p className="text-[10px] text-teal-600 italic">
            Note: When a customer rents this item, Available Qty will auto-decrement. On return it will increment back.
          </p>
        </div>
      )}
    </>
  );
}