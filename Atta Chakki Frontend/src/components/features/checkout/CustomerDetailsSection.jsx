import React from 'react';
import { Card } from '../../common/card';
import { Label } from '../../common/label';
import { Input } from '../../common/input';

export function CustomerDetailsSection({
  customerName,
  setCustomerName,
  phone,
  setPhone,
  t
}) {
  return (
    <Card className="p-6 mb-6">
      <h3 className="mb-4 text-foreground">{t('Your Details')}</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">{t('Full Name')}</Label>
          <Input
            id="name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder={t('Enter your name')}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="phone">{t('Phone Number')}</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('Enter your phone number')}
            className="mt-1"
          />
        </div>
      </div>
    </Card>
  );
}
