import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../../../common/card';
import { Input } from '../../../common/input';
import { Label } from '../../../common/label';
import { User, Truck, Store } from 'lucide-react';

export function CustomerDetailsSection({
  customer,
  setCustomer,
  orderType,
  onPhoneChange,
}) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col items-center justify-center gap-2 text-center">
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </span>
          <span className="font-bold text-base sm:text-lg">{t('Customer Details')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phone Number */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>{t('Phone Number')} ({t('Required')})</Label>
            <span
              className={`text-[11px] font-mono ${
                customer.phone.length === 11 && customer.phone.startsWith('0')
                  ? 'text-emerald-600 font-bold'
                  : 'text-muted-foreground'
              }`}
            >
              {customer.phone.length}/11
            </span>
          </div>
          <Input
            type="tel"
            placeholder="03001234567"
            maxLength={11}
            value={customer.phone}
            onChange={onPhoneChange}
          />
          {customer.phone && !customer.phone.startsWith('0') && (
            <p className="text-xs text-red-500 mt-1">
              {t('Phone number must start with 0 (e.g. 03001234567)')}
            </p>
          )}
          {customer.phone &&
            customer.phone.startsWith('0') &&
            customer.phone.length > 0 &&
            customer.phone.length < 11 && (
              <p className="text-xs text-amber-600 mt-1">
                {t('Enter 11 digits')} ({11 - customer.phone.length} {t('remaining')})
              </p>
            )}
        </div>

        {/* Full Name */}
        <div>
          <Label>{t('Full Name')}</Label>
          <Input
            placeholder={t('Guest Customer')}
            value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
          />
        </div>

        {/* Address / Pickup Notes */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>
              {orderType === 'delivery' ? (
                <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
                  <Truck className="h-3.5 w-3.5" />
                  {t('Delivery Address')} ({t('Required')})
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-purple-700 font-semibold">
                  <Store className="h-3.5 w-3.5" />
                  {t('Pickup Notes')} ({t('Optional')})
                </span>
              )}
            </Label>
          </div>
          <Input
            placeholder={
              orderType === 'delivery'
                ? t('e.g. House #14, Street 5, Sector B...')
                : t('Shop Pickup')
            }
            value={customer.address}
            onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
            className={
              orderType === 'delivery' && !customer.address
                ? 'border-blue-300 focus:border-blue-500'
                : ''
            }
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            {orderType === 'delivery'
              ? t('Order will require delivery driver dispatch.')
              : t('Customer will self-collect from the store. No driver dispatch needed.')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
