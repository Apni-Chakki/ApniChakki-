import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/common/dialog';
import { Button } from '../../components/common/button';
import { Printer, X, ClipboardList, Languages, Wheat, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { OrderStatusBadge } from '../../components/shared/OrderStatusBadge';
import { API_BASE_URL } from '../../config';
import { sendWhatsAppMessage } from '../../utils/whatsappHelper';
import { printIframeHtml } from '../../utils/printHelpers';
import {
  translateText,
  getStatusLabel,
  getStatusColorClass,
  getOrderTypeLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  translateUnit,
  getCustomizationsText,
} from '../../utils/printOrderHelpers';
import { buildPrintOrderHTML } from '../../utils/printOrderHtmlBuilder';
import { buildWhatsAppOrderMessage } from '../../utils/printOrderWhatsApp';

/* Header-style Logo (Wheat icon in primary circle — same as app header) */
const HeaderLogo = ({ size = 40, logo = '' }) => {
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        className="rounded-full object-cover shadow-sm flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-primary flex items-center justify-center shadow-sm flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <Wheat className="text-primary-foreground" style={{ width: size * 0.6, height: size * 0.6 }} />
    </div>
  );
};

export function PrintOrderDetails({ order, open, onClose }) {
  const [lang, setLang] = useState('en');
  const [storeSettings, setStoreSettings] = useState({
    name: 'SUCHI CHAKKI',
    address: 'Main Bazaar, Lahore',
    phone: '+92 322 8483029',
    tagline: 'Pure & Fresh Processing',
    logo: ''
  });

  useEffect(() => {
    if (open) {
      fetch(`${API_BASE_URL}/get_store_settings.php`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.settings) {
            setStoreSettings({
              name: data.settings.storeName || 'SUCHI CHAKKI',
              address: data.settings.address || 'Main Bazaar, Lahore',
              phone: data.settings.phone || '+92 322 8483029',
              tagline: 'Pure & Fresh Processing',
              logo: data.settings.logo || ''
            });
          }
        })
        .catch(err => console.error("Error fetching store settings:", err));
    }
  }, [open]);

  if (!order) return null;

  const hasPendingItems = order.items.some(i => i.isWeightPending);
  const remainingBalance = order.total - (order.advancePayment || 0);

  // Calculate discounts for both print and preview
  let itemDiscountsTotal = 0;
  let originalSubtotal = 0;
  let itemsSubtotal = 0;
  
  order.items.forEach(item => {
    if (!item.isWeightPending) {
      const itemPrice = parseFloat(item.price_at_purchase) || parseFloat(item.service?.price) || 0;
      const origPrice = parseFloat(item.original_price) || null;
      const qty = parseFloat(item.quantity) || 0;
      const hasItemDiscount = origPrice && origPrice > itemPrice;
      
      itemsSubtotal += itemPrice * qty;
      if (hasItemDiscount) {
        itemDiscountsTotal += (origPrice - itemPrice) * qty;
        originalSubtotal += origPrice * qty;
      } else {
        originalSubtotal += itemPrice * qty;
      }
    }
  });

  const couponDiscount = parseFloat(order.couponDiscount) || 0;

  // Resolve delivery fee: check direct prop, or calculate from total - (itemsSubtotal - couponDiscount)
  let deliveryFee = parseFloat(order.deliveryFee ?? order.delivery_fee ?? order.shipping_cost ?? order.delivery_cost ?? 0) || 0;
  if (!deliveryFee && (order.type === 'delivery' || order.shipping_address || order.deliveryAddress) && order.total > (itemsSubtotal - couponDiscount)) {
    deliveryFee = Math.max(0, Math.round(order.total - (itemsSubtotal - couponDiscount)));
  }

  const totalDiscount = itemDiscountsTotal + couponDiscount;
  const hasDiscount = totalDiscount > 0;

  const buildPrintHTML = () => buildPrintOrderHTML({
    order,
    lang,
    storeSettings,
    hasPendingItems,
    itemsSubtotal,
    itemDiscountsTotal,
    couponDiscount,
    deliveryFee,
    remainingBalance,
  });

  const handleWhatsAppShare = () => {
    const message = buildWhatsAppOrderMessage({
      order,
      lang,
      storeSettings,
      hasPendingItems,
      hasDiscount,
      originalSubtotal,
      itemDiscountsTotal,
      couponDiscount,
    });
    sendWhatsAppMessage(order.phone, message);
  };

  const handlePrint = () => {
    printIframeHtml(buildPrintHTML(), { frameId: 'print-details-frame' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-lg p-0 gap-0 overflow-hidden w-[95vw] max-h-[85vh] sm:max-h-[90vh] flex flex-col rounded-2xl shadow-2xl ${lang === 'ur' ? 'text-right' : 'text-left'}`}
        hideCloseButton
      >
        {/* Dialog Header with Logo */}
        <DialogHeader className="px-4 sm:px-6 pt-4 pb-3 border-b border-border/50 bg-gradient-to-r from-amber-900/10 to-amber-800/5 shrink-0">
          <div className="flex items-center justify-between" dir={lang === 'ur' ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-3 min-w-0">
              <HeaderLogo size={40} logo={storeSettings.logo} />
              <div className={`min-w-0 ${lang === 'ur' ? 'text-right' : 'text-left'}`}>
                <DialogTitle className={`text-sm font-black uppercase break-words ${lang === 'ur' ? 'tracking-normal text-right' : 'tracking-wide'}`}>
                  {translateText(storeSettings.name, lang)}
                </DialogTitle>
                <p className={`text-[10px] text-muted-foreground ${lang === 'ur' ? 'text-right' : ''}`}>
                  {lang === 'ur' ? 'آرڈر کی مکمل تفصیلات' : 'Full Order Details'}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Bill Preview */}
        <div className="flex-1 overflow-y-auto custom-modal-scrollbar min-h-0">
          <div
            className={`${lang === 'en' ? 'font-mono' : ''} text-sm px-3 sm:px-6 py-4 sm:py-5 space-y-4`}
            dir={lang === 'ur' ? 'rtl' : 'ltr'}
            style={{ 
              direction: lang === 'ur' ? 'rtl' : 'ltr', 
              fontFamily: lang === 'ur' ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaliq', 'Urdu Typesetting', 'Tahoma', 'Arial', sans-serif" : "monospace" 
            }}
          >

            {/* Store Letterhead — Logo centered above text */}
            <div className="pb-4 border-b-2 border-dashed border-border">
              <div className="flex flex-col items-center text-center gap-2 mb-2.5">
                <HeaderLogo size={50} logo={storeSettings.logo} />
                <div className="w-full min-w-0">
                  <h2 className={`text-sm sm:text-base font-black uppercase break-words ${lang === 'ur' ? 'tracking-normal' : 'tracking-widest'}`}>
                    {translateText(storeSettings.name, lang)}
                  </h2>
                  <p className={`text-[9px] text-muted-foreground mt-0.5 uppercase ${lang === 'ur' ? 'tracking-normal' : 'tracking-wider'}`}>
                    {translateText(storeSettings.tagline, lang)}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 break-words">
                    <span>📍 {translateText(storeSettings.address, lang)}</span>
                    <span className="hidden sm:inline">|</span>
                    <span>📞 {storeSettings.phone}</span>
                  </p>
                </div>
              </div>
              <div className="text-center mt-2.5">
                <div className="inline-block border border-border rounded px-3 py-0.5">
                  <p className={`text-[9px] font-bold uppercase ${lang === 'ur' ? 'tracking-normal' : 'tracking-widest'}`}>
                    {lang === 'ur' ? 'آرڈر کی تفصیلات' : 'Order Details'}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Info Card */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="print-bidi-align">
                  <p className={`text-[9px] uppercase text-muted-foreground font-bold ${lang === 'ur' ? 'tracking-normal' : 'tracking-wider'}`}>
                    {lang === 'ur' ? 'آرڈر آئی ڈی' : 'Order ID'}
                  </p>
                  <p className="text-[10px] font-mono font-bold mt-0.5 break-all">{order.id}</p>
                </div>
                <div className="print-bidi-align">
                  <p className={`text-[9px] uppercase text-muted-foreground font-bold ${lang === 'ur' ? 'tracking-normal' : 'tracking-wider'}`}>
                    {lang === 'ur' ? 'قسم' : 'Type'}
                  </p>
                  <p className="text-[11px] font-bold uppercase mt-0.5">{getOrderTypeLabel(order.type, lang)}</p>
                </div>
                <div className="print-bidi-align">
                  <p className={`text-[9px] uppercase text-muted-foreground font-bold ${lang === 'ur' ? 'tracking-normal' : 'tracking-wider'}`}>
                    {lang === 'ur' ? 'تاریخ اور وقت' : 'Date & Time'}
                  </p>
                  <p className="text-[10px] font-medium mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('en-GB')}{' '}
                    {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="print-bidi-align">
                  <p className={`text-[9px] uppercase text-muted-foreground font-bold ${lang === 'ur' ? 'tracking-normal' : 'tracking-wider'}`}>
                    {lang === 'ur' ? 'حیثیت' : 'Status'}
                  </p>
                  <OrderStatusBadge
                    status={order.status}
                    label={getStatusLabel(order.status, lang)}
                    className="mt-0.5 text-[9px] uppercase px-2 py-0.5"
                  />
                </div>
                {order.status === 'cancelled' && order.cancellationReason && (
                  <div className="col-span-2 bg-red-50 border border-red-300 rounded-lg p-2.5 mt-1 print-bidi-align">
                    <p className={`text-[9px] uppercase text-red-500 font-bold mb-0.5 ${lang === 'ur' ? 'tracking-normal' : 'tracking-wider'}`}>
                      {lang === 'ur' ? 'منسوخی کی وجہ' : 'Cancellation Reason'}
                    </p>
                    <p className="text-[11px] text-red-700 italic">"{order.cancellationReason}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer */}
            <div>
              <p className={`text-[9px] font-bold uppercase text-muted-foreground border-b border-dashed border-border pb-1.5 mb-2.5 ${lang === 'ur' ? 'tracking-normal' : 'tracking-widest'}`}>
                👤 {lang === 'ur' ? 'کسٹمر کی معلومات' : 'Customer Information'}
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{lang === 'ur' ? 'گاہک کا نام' : 'Customer Name'}</span>
                  <span className="font-bold">{order.customerName}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{lang === 'ur' ? 'فون نمبر' : 'Phone Number'}</span>
                  <span className="font-mono font-semibold">{order.phone}</span>
                </div>
                {order.deliveryAddress && (
                  <div className="print-bidi-align">
                    <p className="text-muted-foreground text-[9px] mb-1">{lang === 'ur' ? 'ڈیلیوری کا پتہ' : 'Delivery Address'}</p>
                    <p className="text-[11px] bg-blue-50 border border-blue-200 p-2 rounded-lg whitespace-normal break-words">
                      {translateText(order.deliveryAddress, lang)}
                    </p>
                  </div>
                )}
                {order.deliveryPersonnel && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{lang === 'ur' ? 'ڈیلیوری کنندہ' : 'Delivery By'}</span>
                    <span className="font-semibold">{order.deliveryPersonnel}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div>
              <p className={`text-[9px] font-bold uppercase text-muted-foreground border-b-2 border-dashed border-border pb-1.5 mb-2.5 ${lang === 'ur' ? 'tracking-normal' : 'tracking-widest'}`}>
                🛒 {lang === 'ur' ? 'آرڈر کی اشیاء' : 'Order Items'}
              </p>
              <div className={`flex justify-between text-[9px] uppercase text-muted-foreground font-bold px-0.5 mb-1.5 ${lang === 'ur' ? 'tracking-normal' : 'tracking-wide'}`}>
                <span>{lang === 'ur' ? 'آئٹم' : 'Item'}</span>
                <span>{lang === 'ur' ? 'رقم' : 'Amount'}</span>
              </div>
              <div className="space-y-2">
                {order.items.map((item, idx) => {
                  const isRental = item.is_rental === 1 || item.is_rental === '1' || item.isRental;
                  return (
                    <div key={idx} className="flex justify-between items-start border-b border-dashed border-border/50 pb-2 last:border-0">
                      <div className={`flex-1 print-bidi-align ${lang === 'ur' ? 'pl-4' : 'pr-4'}`}>
                        <p className="text-[12px] font-semibold whitespace-normal break-words">
                          {translateText(item.name || item.service?.name, lang)} {isRental && `(${lang === 'ur' ? 'کرایہ' : 'Rental'})`}
                        </p>
                        {isRental ? (
                          <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5 print-bidi-align">
                            <p>🗓️ {lang === 'ur' ? 'مدت کرایہ:' : 'Rental Period:'} {item.rental_days} {lang === 'ur' ? 'دن' : 'days'} ({item.rental_start_date} {lang === 'ur' ? 'سے' : 'to'} {item.rental_end_date})</p>
                            <p>💰 {lang === 'ur' ? 'شرح کرایہ:' : 'Rate:'} Rs. {Number(item.rental_price_per_day || item.price_at_purchase).toLocaleString()}/{lang === 'ur' ? 'دن' : 'day'}</p>
                            <p>🛡️ {lang === 'ur' ? 'سیکیورٹی ڈپازٹ:' : 'Security Deposit:'} Rs. {Number(item.security_deposit).toLocaleString()}</p>
                            {parseFloat(item.runningPenalty || item.late_penalty_total || 0) > 0 && (
                              <p className="text-red-600 font-bold">⚠️ {lang === 'ur' ? 'بقایا جرمانہ:' : 'Late Penalty:'} Rs. {Number(item.runningPenalty || item.late_penalty_total).toLocaleString()}</p>
                            )}
                          </div>
                        ) : (
                          <>
                            {(item.customizations?.length > 0 || item.is_cleaning == 1 || item.is_grinding == 1) && (
                              <p className="text-[9px] text-muted-foreground italic mt-0.5">
                                 ({getCustomizationsText(item, lang)})
                              </p>
                            )}
                            {item.isWeightPending ? (
                              <p className="text-[10px] text-orange-600 font-bold mt-0.5">
                                ⚠ {lang === 'ur' ? 'وزن کی تصدیق باقی ہے' : 'WEIGHT TO BE CONFIRMED'}
                              </p>
                            ) : (() => {
                              const iPrice = item.price_at_purchase || item.service?.price || 0;
                              const oPrice = item.original_price || null;
                              const hasDisc = oPrice && oPrice > iPrice;
                              const unitText = translateUnit(item.unit || item.service?.unit || 'unit', lang);
                              return (
                                <p className="text-[10px] mt-0.5 flex items-center gap-1 flex-wrap">
                                  <span className="text-muted-foreground">{item.quantity} {unitText} ×</span>
                                  {hasDisc ? (
                                    <>
                                      <span className="line-through text-muted-foreground">Rs.{Number(oPrice).toLocaleString()}</span>
                                      <span className="text-green-600 font-bold">Rs.{Number(iPrice).toLocaleString()}</span>
                                      <span className="text-green-600 text-[9px] font-bold bg-green-50 border border-green-200 px-1 rounded">
                                        🏷 {lang === 'ur' ? 'ڈسکاؤنٹ' : 'DISC'}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground">Rs.{Number(iPrice).toLocaleString()}</span>
                                  )}
                                </p>
                              );
                            })()}
                          </>
                        )}
                      </div>
                      {!item.isWeightPending && (
                        <p className="text-[12px] font-bold whitespace-nowrap">
                          Rs.{isRental 
                            ? (Number(item.rental_days) * Number(item.rental_price_per_day || item.price_at_purchase)).toLocaleString()
                            : (item.quantity * (item.price_at_purchase || item.service?.price || 0)).toLocaleString()
                          }
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals */}
            {/* Bill Summary Breakout */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <div className="flex justify-between text-[13px] font-bold text-muted-foreground">
                <span>{lang === 'ur' ? 'پروڈکٹ سب ٹوٹل (قیمت)' : 'PRODUCTS SUBTOTAL'}</span>
                <span className="whitespace-nowrap">
                  Rs.{Number(itemsSubtotal || (order.total - deliveryFee + couponDiscount)).toLocaleString()}
                  {hasPendingItems && <span className="text-orange-500">{lang === 'ur' ? ' + تصدیق طلب' : ' + TBD'}</span>}
                </span>
              </div>

              {itemDiscountsTotal > 0 && (
                <div className="flex justify-between text-[12px] text-green-600 font-bold">
                  <span>{lang === 'ur' ? 'پروڈکٹ ڈسکاؤنٹ' : 'PRODUCT DISCOUNT'}</span>
                  <span className="whitespace-nowrap">- Rs.{Number(itemDiscountsTotal).toLocaleString()}</span>
                </div>
              )}

              {couponDiscount > 0 && (
                <div className="flex justify-between text-[12px] text-green-600 font-bold">
                  <span>
                    {lang === 'ur' ? `کوپن ڈسکاؤنٹ (${order.couponCode || 'PROMO'})` : `COUPON DISCOUNT (${order.couponCode || 'PROMO'})`}
                  </span>
                  <span className="whitespace-nowrap">- Rs.{Number(couponDiscount).toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-[12px] text-muted-foreground font-semibold">
                <span>{lang === 'ur' ? 'ڈیلیوری فیس' : 'DELIVERY FEE'}</span>
                <span className="whitespace-nowrap">
                  {deliveryFee > 0 ? `+ Rs.${Number(deliveryFee).toLocaleString()}` : (order.type === 'delivery' ? (lang === 'ur' ? 'مفت (Rs. 0)' : 'Rs. 0 (FREE)') : 'Rs. 0')}
                </span>
              </div>

              <div className="flex justify-between text-[15px] font-black pt-2 border-t border-dashed border-border text-green-700">
                <span>{lang === 'ur' ? 'کل رقم (GRAND TOTAL)' : 'GRAND TOTAL'}</span>
                <span className="whitespace-nowrap">Rs.{Number(order.total).toLocaleString()}</span>
              </div>

              {parseFloat(order.advancePayment) > 0 && (
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground">{lang === 'ur' ? 'ایڈوانس ادائیگی' : 'ADVANCE PAID'}</span>
                  <span className="text-green-600 font-bold whitespace-nowrap">- Rs.{Number(order.advancePayment).toLocaleString()}</span>
                </div>
              )}
              {remainingBalance > 0 && (
                <div className="flex justify-between text-[15px] font-black pt-2 border-t-2 border-dashed border-border">
                  <span className="text-red-600">{lang === 'ur' ? 'بقایا رقم' : 'REMAINING DUE'}</span>
                  <span className="text-red-600 whitespace-nowrap">Rs.{Number(remainingBalance).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Payment */}
            <div>
              <p className={`text-[9px] font-bold uppercase text-muted-foreground border-b border-dashed border-border pb-1.5 mb-2.5 ${lang === 'ur' ? 'tracking-normal' : 'tracking-widest'}`}>
                💳 {lang === 'ur' ? 'ادائیگی کی معلومات' : 'Payment Information'}
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{lang === 'ur' ? 'ادائیگی کا طریقہ' : 'Payment Method'}</span>
                  <span className="uppercase font-bold">
                    {getPaymentMethodLabel(order.paymentMethod, lang)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{lang === 'ur' ? 'ادائیگی کی صورتحال' : 'Payment Status'}</span>
                  <span className={`uppercase font-black ${order.paymentStatus === 'paid' ? 'text-green-600' : order.paymentStatus === 'partial' ? 'text-blue-600' : 'text-orange-500'}`}>
                    {getPaymentStatusLabel(order.paymentStatus, lang)}
                  </span>
                </div>
                {order.paymentStatus === 'paid' && order.transactionId && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{lang === 'ur' ? 'ٹرانزیکشن آئی ڈی' : 'Transaction ID'}</span>
                    <span className="font-mono text-[10px]">{order.transactionId}</span>
                  </div>
                )}
              </div>
              {order.paymentStatus !== 'paid' && remainingBalance > 0 && (
                <div className="mt-3 bg-red-50 border-2 border-red-300 rounded-xl p-3 text-center">
                  <p className="text-red-900 font-black text-[13px] uppercase tracking-wide">
                    ⚠ {lang === 'ur' ? 'رقم وصول کریں:' : 'COLLECT PAYMENT:'} Rs.{Number(remainingBalance).toLocaleString()}{hasPendingItems && (lang === 'ur' ? ' (+ تصدیق طلب)' : ' (+ TBD)')}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-dashed border-border pt-3 text-center space-y-0.5">
              <p className="text-[9px] text-muted-foreground">
                {lang === 'ur' ? 'پرنٹ کی تاریخ:' : 'Printed:'} {new Date().toLocaleDateString('en-GB')} {lang === 'ur' ? 'بجے' : 'at'} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-[9px] text-muted-foreground">
                {lang === 'ur' ? '🙏 ہمارے کاروبار پر بھروسہ کرنے کا شکریہ!' : '🙏 Thank you for your business!'}
              </p>
              <p className="text-[9px] text-muted-foreground font-bold">
                {translateText(storeSettings.name, lang)} — {translateText(storeSettings.tagline, lang)}
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-2.5 px-3 sm:px-6 py-3 sm:py-4 border-t border-border/50 bg-background shrink-0" dir={lang === 'ur' ? 'rtl' : 'ltr'}>
          <Button onClick={handlePrint} className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-sm h-9">
            <Printer className={`h-4 w-4 ${lang === 'ur' ? 'ml-2' : 'mr-2'}`} />
            {lang === 'ur' ? 'پرنٹ کریں' : 'Print Details'}
          </Button>

          <Button onClick={handleWhatsAppShare} className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 text-white text-sm h-9">
            <MessageCircle className={`h-4 w-4 ${lang === 'ur' ? 'ml-2' : 'mr-2'}`} />
            {lang === 'ur' ? 'واٹس ایپ' : 'WhatsApp'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
            className="w-full sm:min-w-[80px] sm:w-auto h-9 flex items-center gap-2 px-3 justify-center border-input bg-transparent hover:bg-accent hover:text-accent-foreground"
          >
            <Languages className="h-4 w-4" />
            <span className="font-semibold text-xs">
              {lang === 'en' ? 'اردو' : 'English'}
            </span>
          </Button>

          <Button onClick={onClose} variant="outline" className="w-full sm:flex-1 text-sm h-9">
            {lang === 'ur' ? 'بند کریں' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}




