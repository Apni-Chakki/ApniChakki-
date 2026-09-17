import React, { useState } from 'react';
import { Smartphone, CreditCard, Building2, X, CheckCircle2, AlertCircle, TestTube2, Shield, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../common/dialog';
import { Button } from '../../common/button';
import { Input } from '../../common/input';
import { Label } from '../../common/label';
import { toast } from 'sonner';

export function PaymentDialog({
  showPaymentDialog,
  setShowPaymentDialog,
  paymentMethod,
  paymentStep,
  setPaymentStep,
  paymentResult,
  setPaymentResult,
  isProcessingPayment,
  grandTotal,
  hasPendingWeightItem,
  isSandboxEnv,
  mobileNumber,
  setMobileNumber,
  cnicLast6,
  setCnicLast6,
  cardNumber,
  setCardNumber,
  cardName,
  setCardName,
  cardExpiry,
  setCardExpiry,
  cardCvv,
  setCardCvv,
  bankAccountNumber,
  setBankAccountNumber,
  bankDetails,
  processOnlinePayment,
  t
}) {
  const [showSandboxHelper, setShowSandboxHelper] = useState(false);

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const getCardType = (number) => {
    const digits = number.replace(/\s/g, '');
    if (/^4/.test(digits)) return 'visa';
    if (/^5[1-5]/.test(digits)) return 'mastercard';
    if (/^3[47]/.test(digits)) return 'amex';
    return null;
  };

  const cardType = getCardType(cardNumber);

  const fillTestCard = (type) => {
    switch (type) {
      case 'visa_success':
        setCardNumber('4242 4242 4242 4242'); setCardExpiry('12/28'); setCardCvv('123'); setCardName('Test Visa User'); break;
      case 'mastercard_success':
        setCardNumber('5555 5555 5555 4444'); setCardExpiry('12/28'); setCardCvv('456'); setCardName('Test MC User'); break;
      case 'decline':
        setCardNumber('4000 0000 0000 0002'); setCardExpiry('12/28'); setCardCvv('789'); setCardName('Decline Test'); break;
    }
    toast.info(t('Test card data filled'));
  };

  const fillTestPhone = (type) => {
    switch (type) {
      case 'success': setMobileNumber('03211234567'); break;
      case 'fail': setMobileNumber('03000000000'); break;
      case 'invalid': setMobileNumber('03111111111'); break;
    }
    toast.info(t('Test phone number filled'));
  };

  const handleClose = () => {
    if (!isProcessingPayment) {
      setShowPaymentDialog(false);
      setPaymentStep('input');
      setPaymentResult(null);
    }
  };

  return (
    <Dialog open={showPaymentDialog} onOpenChange={(open) => {
      if (!isProcessingPayment) {
        setShowPaymentDialog(open);
        if (!open) {
          setPaymentStep('input');
          setPaymentResult(null);
        }
      }
    }}>
      <DialogContent
        className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6 gap-3 sm:gap-4"
        hideCloseButton
      >
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg min-w-0">
              {paymentMethod === 'jazzcash' && (
                <>
                  <Smartphone className="h-5 w-5 shrink-0 text-[#e1272c]" />
                  <span className="truncate">JazzCash Payment</span>
                </>
              )}
              {paymentMethod === 'card' && (
                <>
                  <CreditCard className="h-5 w-5 shrink-0 text-[#1a1f71]" />
                  <span className="truncate">{t('Card Payment')}</span>
                </>
              )}
              {paymentMethod === 'bank' && (
                <>
                  <Building2 className="h-5 w-5 text-primary shrink-0" />
                  <span className="truncate">{t('Bank Transfer')}</span>
                </>
              )}
            </DialogTitle>
            <button
              type="button"
              aria-label="Close"
              onClick={handleClose}
              disabled={isProcessingPayment}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <DialogDescription className="hidden">
            Payment processing and details
          </DialogDescription>
        </DialogHeader>
        
        {paymentStep === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className={`w-20 h-20 rounded-full border-4 border-primary/20 animate-spin ${paymentMethod === 'jazzcash' ? 'border-t-[#e1272c]' : 'border-t-[#1a1f71]'}`}></div>
              {paymentMethod === 'jazzcash' && <Smartphone className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-[#e1272c]" />}
              {paymentMethod === 'card' && <CreditCard className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-[#1a1f71]" />}
              {paymentMethod === 'bank' && <Building2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary" />}
            </div>
            <p className="text-lg font-semibold text-foreground">{t('Processing Payment...')}</p>
            <p className="text-sm text-muted-foreground text-center">
              {paymentMethod === 'jazzcash' && t('Connecting to JazzCash gateway...')}
              {paymentMethod === 'card' && t('Authorizing card payment...')}
              {paymentMethod === 'bank' && t('Initiating bank transfer...')}
            </p>
            <p className="text-xs text-muted-foreground">{t('Please do not close this window')}</p>
          </div>
        )}

        {paymentStep === 'success' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <p className="text-xl font-bold text-green-600">{t('Payment Successful!')}</p>
            <div className="w-full bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('Amount')}:</span>
                <span className="font-bold">Rs. {grandTotal}{hasPendingWeightItem && " + TBD"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('Method')}:</span>
                <span className="font-medium">
                  {paymentMethod === 'jazzcash' ? 'JazzCash' : paymentMethod === 'card' ? 'Card' : 'Bank'}
                </span>
              </div>
              {paymentResult?.transaction_id && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TXN ID:</span>
                  <span className="font-mono text-xs">{paymentResult.transaction_id}</span>
                </div>
              )}
              {paymentResult?.sandbox && (
                <div className="text-center mt-2">
                  <span className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">SANDBOX MODE</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{t('Redirecting to order confirmation...')}</p>
          </div>
        )}

        {paymentStep === 'failed' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
            <p className="text-xl font-bold text-red-600">{t('Payment Failed')}</p>
            <p className="text-sm text-muted-foreground text-center">
              {paymentResult?.message || t('An error occurred while processing your payment')}
            </p>
            <div className="flex gap-3 w-full">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => { setShowPaymentDialog(false); setPaymentStep('input'); }}
              >
                {t('Cancel')}
              </Button>
              <Button 
                className="flex-1"
                onClick={() => setPaymentStep('input')}
              >
                {t('Try Again')}
              </Button>
            </div>
          </div>
        )}

        {paymentStep === 'input' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="text-center py-2.5 sm:py-3 bg-secondary/30 rounded-lg">
              <p className="text-2xl sm:text-3xl font-bold text-foreground">Rs. {grandTotal}{hasPendingWeightItem && " + TBD"}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{t('Amount to pay')}</p>
              {hasPendingWeightItem && (
                <p className="text-xs text-primary mt-1 px-2">
                  {t('(Additional charges for pending items will be due on delivery/pickup)')}
                </p>
              )}
            </div>

            {isSandboxEnv && (
              <button
                type="button"
                onClick={() => setShowSandboxHelper(!showSandboxHelper)}
                className="w-full flex items-center justify-center gap-2 text-xs text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg py-2 px-3 transition-colors"
              >
                <TestTube2 className="h-3.5 w-3.5" />
                {showSandboxHelper ? t('Hide Sandbox Test Data') : t('Show Sandbox Test Data')}
              </button>
            )}

            {paymentMethod === 'jazzcash' && (
              <div className="space-y-3">
                {showSandboxHelper && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-yellow-800 flex items-center gap-1">
                      <TestTube2 className="h-3 w-3" /> {t('Sandbox Test Numbers')}:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => fillTestPhone('success')} className="text-[11px] px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors">
                        ✅ Success: 03211234567
                      </button>
                      <button type="button" onClick={() => fillTestPhone('fail')} className="text-[11px] px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors">
                        ❌ Low Balance: 03000000000
                      </button>
                      <button type="button" onClick={() => fillTestPhone('invalid')} className="text-[11px] px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors">
                        ❌ Invalid: 03111111111
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="mobileNumber">{t('JazzCash Mobile Number')}</Label>
                  <div className="relative mt-1">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="mobileNumber"
                      placeholder="03XX XXXXXXX"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))}
                      className="pl-10"
                      maxLength={11}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t('Enter your JazzCash registered mobile number')}</p>
                </div>

                <div>
                  <Label htmlFor="cnicLast6">{t('CNIC Last 6 Digits')} ({t('Optional')})</Label>
                  <Input
                    id="cnicLast6"
                    placeholder="XXXXXX"
                    value={cnicLast6}
                    onChange={(e) => setCnicLast6(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    maxLength={6}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="space-y-3">
                {showSandboxHelper && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-yellow-800 flex items-center gap-1">
                      <TestTube2 className="h-3 w-3" /> {t('Sandbox Test Cards')}:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => fillTestCard('visa_success')} className="text-[11px] px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors">
                        ✅ Visa Success
                      </button>
                      <button type="button" onClick={() => fillTestCard('mastercard_success')} className="text-[11px] px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors">
                        ✅ MC Success
                      </button>
                      <button type="button" onClick={() => fillTestCard('decline')} className="text-[11px] px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors">
                        ❌ Declined
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="cardNumber">{t('Card Number')}</Label>
                  <div className="relative mt-1">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cardNumber"
                      name="cardnumber"
                      autoComplete="cc-number"
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      className="pl-10 pr-16 font-mono tracking-wider"
                      maxLength={19}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold">
                      {cardType === 'visa' && <span className="text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">VISA</span>}
                      {cardType === 'mastercard' && <span className="text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded">MC</span>}
                      {cardType === 'amex' && <span className="text-green-800 bg-green-100 px-1.5 py-0.5 rounded">AMEX</span>}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="cardName">{t('Cardholder Name')}</Label>
                  <Input
                    id="cardName"
                    name="ccname"
                    autoComplete="cc-name"
                    placeholder="JOHN DOE"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    className="mt-1 uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cardExpiry">{t('Expiry Date')}</Label>
                    <Input
                      id="cardExpiry"
                      name="ccexp"
                      autoComplete="cc-exp"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      className="mt-1 font-mono"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardCvv">CVV</Label>
                    <div className="relative mt-1">
                      <Input
                        id="cardCvv"
                        name="cvv"
                        autoComplete="cc-csc"
                        type="password"
                        placeholder="•••"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="pr-10 font-mono"
                        maxLength={4}
                      />
                      <Shield className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 rounded-lg p-2.5">
                  <Shield className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>{isSandboxEnv ? t('Your card information is encrypted and secure. Sandbox mode - no real charges.') : t('Your card information is encrypted and processed securely.')}</span>
                </div>
              </div>
            )}

            {paymentMethod === 'bank' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="bankAccountNumber">{t('Bank Account / IBAN Number')}</Label>
                  <div className="relative mt-1">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="bankAccountNumber"
                      placeholder={bankDetails.iban || "PK00 XXXX 0000 0000 0000 0000"}
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-800">{t('Bank Transfer Instructions')}:</p>
                  <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                    <li>{t('Transfer Rs.')} {grandTotal}{hasPendingWeightItem && " + TBD"} {t('to the account below')}</li>
                    <li>{t('Your order will be confirmed after admin verification')}</li>
                    <li>{t('Please keep the transfer receipt for reference')}</li>
                  </ol>
                  <div className="bg-white rounded p-2 mt-2 space-y-1">
                    <p className="text-xs"><span className="text-muted-foreground">{t('Bank')}:</span> <strong>{bankDetails.bank_name}</strong></p>
                    <p className="text-xs"><span className="text-muted-foreground">{t('Account')}:</span> <strong>{bankDetails.account_number}</strong></p>
                    <p className="text-xs"><span className="text-muted-foreground">{t('Title')}:</span> <strong>{bankDetails.account_name}</strong></p>
                    {bankDetails.iban && (
                      <p className="text-xs"><span className="text-muted-foreground">{t('IBAN')}:</span> <strong className="break-all">{bankDetails.iban}</strong></p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={processOnlinePayment}
              disabled={isProcessingPayment}
              style={
                paymentMethod === 'jazzcash' 
                  ? { background: 'linear-gradient(135deg, #e1272c, #b91c20)', color: 'white' }
                  : paymentMethod === 'card'
                  ? { background: 'linear-gradient(135deg, #1a1f71, #2d35a8)', color: 'white' }
                  : {}
              }
            >
              {isProcessingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('Processing...')}
                </>
              ) : (
                <>
                  {paymentMethod === 'jazzcash' && `Pay Rs. ${grandTotal} via JazzCash`}
                  {paymentMethod === 'card' && `${t('Pay')} Rs. ${grandTotal} ${t('via Card')}`}
                  {paymentMethod === 'bank' && `${t('Confirm Transfer')} Rs. ${grandTotal}`}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
