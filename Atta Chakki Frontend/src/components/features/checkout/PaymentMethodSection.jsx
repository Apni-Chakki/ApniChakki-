import React from 'react';
import { Banknote, Smartphone, CreditCard, Building2 } from 'lucide-react';
import { Card } from '../../common/card';
import { Label } from '../../common/label';
import { RadioGroup, RadioGroupItem } from '../../common/radio-group';

export function PaymentMethodSection({
  paymentMethod,
  setPaymentMethod,
  orderType,
  paySettings,
  isSandboxEnv,
  total,
  hasPendingWeightItem,
  isTbdOrder,
  t
}) {
  return (
    <Card className="p-6 mb-6">
      <h3 className="mb-4 text-foreground">{t('Payment Method')}</h3>
        
      {total === 0 && (hasPendingWeightItem || isTbdOrder) ? (
        <div className="p-4 border border-border rounded-lg bg-secondary/30">
          <div className="flex items-center gap-3">
            <Banknote className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">{t('Price TBD')}</p>
              <p className="text-sm text-muted-foreground">{t('Payment method will be selected once weight is confirmed')}</p>
            </div>
          </div>
        </div>
      ) : (
        <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value)}>
          {paySettings.pay_method_cod_enabled === '1' && (
            <div className="flex items-center space-x-2 p-4 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors">
              <RadioGroupItem value="cash" id="cash" />
              <Label htmlFor="cash" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Banknote className="h-5 w-5 text-primary" />
                  <div>
                    <p>{t('Cash')} ({orderType === 'delivery' ? t('on Delivery') : t('on Pickup')})</p>
                  </div>
                </div>
              </Label>
            </div>
          )}

          {paySettings.pay_method_jazzcash_enabled === '1' && (
            <div className="flex items-center space-x-2 p-4 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors">
              <RadioGroupItem value="jazzcash" id="jazzcash" />
              <Label htmlFor="jazzcash" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-[#e1272c]" />
                  <div>
                    <p className="flex items-center gap-2">
                      JazzCash
                      {isSandboxEnv && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-medium">SANDBOX</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">{t('Pay via JazzCash mobile wallet')}</p>
                  </div>
                </div>
              </Label>
            </div>
          )}

          {paySettings.pay_method_card_enabled === '1' && (
            <div className="flex items-center space-x-2 p-4 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors">
              <RadioGroupItem value="card" id="card" />
              <Label htmlFor="card" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-[#1a1f71]" />
                  <div>
                    <p className="flex items-center gap-2">
                      {t('Credit / Debit Card')}
                      {isSandboxEnv && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-medium">SANDBOX</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">{t('Visa, Mastercard accepted')}</p>
                  </div>
                </div>
              </Label>
            </div>
          )}

          {paySettings.pay_method_bank_enabled === '1' && (
            <div className="flex items-center space-x-2 p-4 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors">
              <RadioGroupItem value="bank" id="bank" />
              <Label htmlFor="bank" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <p>{t('Bank Transfer')}</p>
                    <p className="text-sm text-muted-foreground">{t('Direct bank account transfer')}</p>
                  </div>
                </div>
              </Label>
            </div>
          )}
        </RadioGroup>
      )}

      {paymentMethod === 'cash' && (!hasPendingWeightItem || total > 0) && !isTbdOrder && (
        <div className="mt-6 p-4 border border-border rounded-lg bg-secondary/20">
          <p className="text-sm text-muted-foreground">{t('Payment will be collected at the time of delivery or pickup.')}</p>
        </div>
      )}
    </Card>
  );
}
