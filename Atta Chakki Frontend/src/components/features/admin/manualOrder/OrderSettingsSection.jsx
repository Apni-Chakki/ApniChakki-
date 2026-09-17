import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../../../common/card';
import { Input } from '../../../common/input';
import { Label } from '../../../common/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../common/select';
import { Settings2, Store, Truck } from 'lucide-react';

export function OrderSettingsSection({
  orderType,
  setOrderType,
  customer,
  setCustomer,
  paymentStatus,
  setPaymentStatus,
  paymentMethod,
  setPaymentMethod,
  amountPaid,
  setAmountPaid,
  orderTotal,
}) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col items-center justify-center gap-2 text-center">
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary">
            <Settings2 className="h-5 w-5" />
          </span>
          <span className="font-bold text-base sm:text-lg">{t('Order Settings')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fulfillment Type */}
        <div>
          <Label className="mb-1.5 block font-semibold text-xs sm:text-sm">{t('Fulfillment Type')}</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setOrderType('pickup');
                if (!customer.address || customer.address === '') {
                  setCustomer((prev) => ({ ...prev, address: 'Shop Pickup' }));
                }
              }}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 text-xs sm:text-sm font-semibold transition-all ${
                orderType === 'pickup'
                  ? 'border-purple-600 bg-purple-50 text-purple-800 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Store className="h-4 w-4 shrink-0" />
              <span>{t('Self Pickup')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOrderType('delivery');
                if (customer.address === 'Shop Pickup') {
                  setCustomer((prev) => ({ ...prev, address: '' }));
                }
              }}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 text-xs sm:text-sm font-semibold transition-all ${
                orderType === 'delivery'
                  ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Truck className="h-4 w-4 shrink-0" />
              <span>{t('Home Delivery')}</span>
            </button>
          </div>
        </div>

        {/* Payment Status & Partial Input */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label>{t('Payment Status')}</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{t('Unpaid')}</SelectItem>
                <SelectItem value="paid">{t('Paid')}</SelectItem>
                <SelectItem value="partial">{t('Partial')}</SelectItem>
              </SelectContent>
            </Select>
            {paymentStatus === 'partial' && (
              <div className="mt-2">
                <Label className="text-sm">{t('Amount Paid')}</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder={t('Enter partial amount...')}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="mt-1"
                />
                {amountPaid && parseFloat(amountPaid) > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    {t('Udhaar')}: Rs.{' '}
                    {Math.max(0, orderTotal - parseFloat(amountPaid)).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <Label>{t('Payment Method')}</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">{t('Cash Payment')}</SelectItem>
              <SelectItem value="jazzcash">JazzCash</SelectItem>
              <SelectItem value="bank">{t('Bank Transfer')}</SelectItem>
              <SelectItem value="udhaar">{t('Udhaar Khata')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
