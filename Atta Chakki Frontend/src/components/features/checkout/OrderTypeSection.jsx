import React from 'react';
import { Card } from '../../common/card';
import { Label } from '../../common/label';
import { RadioGroup, RadioGroupItem } from '../../common/radio-group';

export function OrderTypeSection({
  orderType,
  setOrderType,
  hasTripItem,
  t
}) {
  return (
    <Card className="p-6 mb-6">
      <h3 className="mb-4 text-foreground">{t('Order Type')}</h3>
      <RadioGroup value={orderType} onValueChange={(value) => setOrderType(value)}>
        {!hasTripItem && (
          <div className="flex items-center space-x-2 p-4 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors">
            <RadioGroupItem value="pickup" id="pickup" />
            <Label htmlFor="pickup" className="flex-1 cursor-pointer">
              <div>
                <p>{t('Pickup')}</p>
                <p className="text-sm text-muted-foreground">{t('Collect from our store')}</p>
              </div>
            </Label>
          </div>
        )}
        <div className="flex items-center space-x-2 p-4 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors">
          <RadioGroupItem value="delivery" id="delivery" />
          <Label htmlFor="delivery" className="flex-1 cursor-pointer">
            <div>
              <p>{t('Delivery / Service')}</p>
              <p className="text-sm text-muted-foreground">{t('Get it delivered or serviced at your location')}</p>
            </div>
          </Label>
        </div>
      </RadioGroup>
    </Card>
  );
}
