import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Printer, MessageCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';

/* ─── Shared SVG Logo ─────────────────────────────────────────── */
const LogoSVG = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="32" fill="#78350f" />
    <ellipse cx="32" cy="38" rx="16" ry="8" fill="#fef3c7" opacity="0.9" />
    <ellipse cx="32" cy="36" rx="12" ry="6" fill="#f59e0b" opacity="0.8" />
    {/* wheat stalk */}
    <line x1="32" y1="44" x2="32" y2="18" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" />
    {/* left grains */}
    <ellipse cx="27" cy="28" rx="4" ry="2.5" fill="#fef3c7" transform="rotate(-30 27 28)" />
    <ellipse cx="26" cy="23" rx="4" ry="2.5" fill="#fef3c7" transform="rotate(-25 26 23)" />
    {/* right grains */}
    <ellipse cx="37" cy="28" rx="4" ry="2.5" fill="#fef3c7" transform="rotate(30 37 28)" />
    <ellipse cx="38" cy="23" rx="4" ry="2.5" fill="#fef3c7" transform="rotate(25 38 23)" />
    {/* top grain */}
    <ellipse cx="32" cy="20" rx="3" ry="4" fill="#fef3c7" />
  </svg>
);

export function PrintSlip({ order, open, onClose }) {
  const [storeSettings, setStoreSettings] = useState({
    name: 'MUGHAL ATTA CHAKKI',
    address: 'Main Bazaar, Lahore',
    phone: '+92 322 8483029',
    tagline: 'Pure & Fresh Processing'
  });

  useEffect(() => {
    if (open) {
      fetch(`${API_BASE_URL}/get_store_settings.php`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.settings) {
            setStoreSettings({
              name: data.settings.storeName || 'MUGHAL ATTA CHAKKI',
              address: data.settings.address || 'Main Bazaar, Lahore',
              phone: data.settings.phone || '+92 322 8483029',
              tagline: 'Pure & Fresh Processing'
            });
          }
        })
        .catch(err => console.error("Error fetching store settings:", err));
    }
  }, [open]);

  if (!order) return null;

  const slipTotal = order.total;
  const hasPendingItems = order.items.some(i => i.isWeightPending);
  const remainingBalance = slipTotal - (order.advancePayment || 0);
  const dateStr = new Date().toLocaleDateString('en-GB');
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  /* ── Build items rows HTML ── */
  const itemsHTML = order.items.map(item => {
    if (item.isWeightPending) {
      return `
        <div style="border-bottom:1px dashed #ccc;padding:6px 0;">
          <div style="font-weight:600;font-size:12px;">${item.service.name}</div>
          <div style="color:#d97706;font-size:10px;font-weight:700;">⚠ WEIGHT TO BE CONFIRMED</div>
        </div>`;
    }
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px dashed #ccc;padding:6px 0;">
        <div style="flex:1;padding-right:8px;">
          <div style="font-weight:600;font-size:12px;">${item.service.name}</div>
          <div style="color:#555;font-size:10px;">${item.quantity} ${item.service.unit} × Rs.${Number(item.service.price).toLocaleString()}</div>
        </div>
        <div style="font-weight:700;white-space:nowrap;font-size:12px;">Rs.${(item.quantity * item.service.price).toLocaleString()}</div>
      </div>`;
  }).join('');

  /* ── Full print HTML ── */
  const buildPrintHTML = () => {
    const logoHTMLForPrint = \`
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 0 8px;">
        <svg width="52" height="52" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="32" fill="#78350f"/>
          <ellipse cx="32" cy="38" rx="16" ry="8" fill="#fef3c7" opacity="0.9"/>
          <ellipse cx="32" cy="36" rx="12" ry="6" fill="#f59e0b" opacity="0.8"/>
          <line x1="32" y1="44" x2="32" y2="18" stroke="#fef3c7" stroke-width="2" stroke-linecap="round"/>
          <ellipse cx="27" cy="28" rx="4" ry="2.5" fill="#fef3c7" transform="rotate(-30 27 28)"/>
          <ellipse cx="26" cy="23" rx="4" ry="2.5" fill="#fef3c7" transform="rotate(-25 26 23)"/>
          <ellipse cx="37" cy="28" rx="4" ry="2.5" fill="#fef3c7" transform="rotate(30 37 28)"/>
          <ellipse cx="38" cy="23" rx="4" ry="2.5" fill="#fef3c7" transform="rotate(25 38 23)"/>
          <ellipse cx="32" cy="20" rx="3" ry="4" fill="#fef3c7"/>
        </svg>
        <div style="text-align:left;">
          <div style="font-size:16px;font-weight:900;letter-spacing:2px;color:#1a1a1a;text-transform:uppercase;">${storeSettings.name}</div>
          <div style="font-size:10px;color:#666;letter-spacing:1px;">${storeSettings.tagline}</div>
          <div style="font-size:10px;color:#666;">📞 ${storeSettings.phone}</div>
        </div>
      </div>
    `;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Order Slip — ${order.id.slice(-8).toUpperCase()}</title>
      <style>
        @page { size: 80mm auto; margin: 4mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Courier New', monospace; font-size: 12px; color: #111; background:#fff; }
        .divider { border: none; border-top: 1.5px dashed #aaa; margin: 8px 0; }
        .divider-heavy { border: none; border-top: 2px dashed #555; margin: 8px 0; }
        .header { text-align: center; padding-bottom: 8px; border-bottom: 2px dashed #555; }
        .store-name { font-size: 15px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
        .store-sub { font-size: 9px; color: #555; letter-spacing: 1px; }
        .section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #666; border-bottom: 1px dashed #ccc; padding-bottom: 3px; margin-bottom: 6px; margin-top: 8px; }
        .row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
        .muted { color: #666; }
        .bold { font-weight: 700; }
        .total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; margin-top: 6px; }
        .due-row { font-size: 14px; font-weight: 900; color: #b91c1c; border-top: 2px dashed #555; padding-top: 6px; margin-top: 6px; }
        .advance-row { color: #15803d; font-weight: 700; }
        .collect-box { background: #fff7ed; border: 2px solid #f97316; border-radius: 6px; padding: 8px; text-align: center; margin-top: 8px; }
        .collect-box p { font-size: 12px; font-weight: 900; text-transform: uppercase; color: #7c2d12; }
        .footer { text-align: center; font-size: 9px; color: #777; padding-top: 8px; border-top: 1px dashed #ccc; margin-top: 8px; }
        .status-paid { color: #15803d; font-weight: 900; }
        .status-partial { color: #1d4ed8; font-weight: 900; }
        .status-unpaid { color: #d97706; font-weight: 900; }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoHTMLForPrint}
      </div>

      <div class="section-title">Order Info</div>
      <div class="row"><span class="muted">Order #</span><span class="bold">${order.id.slice(-8).toUpperCase()}</span></div>
      <div class="row"><span class="muted">Date</span><span>${dateStr}</span></div>
      <div class="row"><span class="muted">Time</span><span>${timeStr}</span></div>

      <div class="section-title">Customer</div>
      <div class="row"><span class="muted">Name</span><span class="bold">${order.customerName}</span></div>
      <div class="row"><span class="muted">Phone</span><span>${order.phone}</span></div>
      <div class="row"><span class="muted">Type</span><span style="text-transform:uppercase;">${order.type}</span></div>
      ${order.deliveryAddress ? `<div style="margin-top:4px;font-size:10px;color:#555;">Address:</div><div style="font-size:11px;background:#f0f9ff;border:1px solid #bae6fd;padding:4px 6px;border-radius:4px;word-break:break-word;">${order.deliveryAddress}</div>` : ''}

      <div class="section-title">Items</div>
      ${itemsHTML}

      <div class="divider-heavy"></div>
      <div class="total-row"><span>SUBTOTAL</span><span>Rs.${Number(slipTotal).toLocaleString()}${hasPendingItems ? ' + TBD' : ''}</span></div>
      ${order.advancePayment && order.advancePayment > 0 ? `<div class="row advance-row"><span>ADVANCE PAID</span><span>- Rs.${Number(order.advancePayment).toLocaleString()}</span></div>` : ''}
      ${remainingBalance > 0 ? `<div class="total-row due-row"><span>DUE</span><span>Rs.${Number(remainingBalance).toLocaleString()}</span></div>` : ''}

      <div class="section-title" style="margin-top:10px;">Payment</div>
      <div class="row"><span class="muted">Method</span><span style="text-transform:uppercase;">${order.paymentMethod || 'CASH'}</span></div>
      <div class="row"><span class="muted">Status</span>
        <span class="${order.paymentStatus === 'paid' ? 'status-paid' : order.paymentStatus === 'partial' ? 'status-partial' : 'status-unpaid'}">
          ${order.paymentStatus === 'paid' ? '✓ PAID' : order.paymentStatus === 'partial' ? 'PARTIAL' : '✗ UNPAID'}
        </span>
      </div>
      ${order.paymentStatus !== 'paid' && order.paymentMethod === 'cash' && remainingBalance > 0 ? `
        <div class="collect-box">
          <p>💵 Collect: Rs.${Number(remainingBalance).toLocaleString()}${hasPendingItems ? ' (+ TBD)' : ''}</p>
        </div>` : ''}

      <div class="footer">
        <p>🙏 Thank you for your order!</p>
        <p style="margin-top:2px;">Visit ${storeSettings.name} again</p>
        <p style="color:#999;margin-top:2px;">${storeSettings.address}</p>
      </div>
    </body>
    </html>
  `;
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank', 'width=400,height=700');
    printWin.document.open();
    printWin.document.write(buildPrintHTML());
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 400);
  };

  const handleWhatsAppShare = () => {
    const lineBreak = "%0A";
    const remainingBal = order.total - (order.advancePayment || 0);
    let message = `*🧾 ${storeSettings.name.toUpperCase()} - DIGITAL INVOICE*${lineBreak}`;
    message += `─────────────────────────${lineBreak}`;
    message += `📅 *Date:* ${dateStr}   ⏰ *Time:* ${timeStr}${lineBreak}`;
    message += `🔢 *Order No:* ${order.id.slice(-6)}${lineBreak}`;
    message += `👤 *Customer:* ${order.customerName}${lineBreak}`;
    message += `─────────────────────────${lineBreak}`;
    message += `*🛒 ORDER SUMMARY:*${lineBreak}`;
    order.items.forEach(item => {
      if (item.isWeightPending) {
        message += `▫️ *${item.service.name}*${lineBreak}`;
        message += `    _Weight to be confirmed at shop_${lineBreak}`;
      } else {
        message += `▫️ *${item.service.name}*${lineBreak}`;
        message += `    ${item.quantity} ${item.service.unit} x Rs.${item.service.price} = *Rs.${(item.quantity * item.service.price).toLocaleString()}*${lineBreak}`;
      }
    });
    message += `─────────────────────────${lineBreak}`;
    if (hasPendingItems) {
      message += `*⚠️ FINAL TOTAL PENDING*${lineBreak}`;
    } else {
      message += `*💰 GRAND TOTAL: Rs.${order.total.toLocaleString()}*${lineBreak}`;
    }
    if (order.advancePayment && order.advancePayment > 0)
      message += `✅ *Advance Paid: Rs.${order.advancePayment.toLocaleString()}*${lineBreak}`;
    if (remainingBal > 0 && !hasPendingItems)
      message += `❗ *BALANCE DUE: Rs.${remainingBal.toLocaleString()}*${lineBreak}`;
    message += `─────────────────────────${lineBreak}`;
    if (order.type === 'delivery')
      message += `🚚 *Delivery Address:* ${order.deliveryAddress || 'Not provided'}${lineBreak}`;
    message += `📍 ${storeSettings.address}${lineBreak}📞 ${storeSettings.phone}${lineBreak}`;
    message += `🌾 _${storeSettings.tagline}_`;
    let phone = order.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '92' + phone.slice(1);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    toast.success('Opening WhatsApp invoice...');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-sm p-0 gap-0 overflow-hidden"
        hideCloseButton
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border/50 bg-gradient-to-r from-amber-900/10 to-amber-800/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <LogoSVG size={36} />
              <div>
                <DialogTitle className="text-sm font-black tracking-wide uppercase">{storeSettings.name}</DialogTitle>
                <p className="text-[10px] text-muted-foreground">Print Order Slip</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Bill Preview */}
        <div className="overflow-y-auto" style={{ maxHeight: '62vh' }}>
          <div className="font-mono text-sm px-5 py-4 space-y-3">

            {/* Store Card (Preview Header) */}
            <div className="text-center pb-3 border-b-2 border-dashed border-border">
              <div className="flex justify-center mb-2">
                <LogoSVG size={52} />
              </div>
              <h2 className="text-sm font-black tracking-widest uppercase">{storeSettings.name}</h2>
              <p className="text-[9px] text-muted-foreground tracking-wider mt-0.5 uppercase">{storeSettings.tagline}</p>
              <p className="text-[9px] text-muted-foreground">📞 {storeSettings.phone} &nbsp;|&nbsp; 📍 {storeSettings.address}</p>
            </div>

            {/* Order Meta */}
            <div className="space-y-1.5 bg-muted/30 rounded-lg p-3 border border-border/40">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Order #</span>
                <span className="font-bold font-mono">{order.id.slice(-8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{dateStr}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{timeStr}</span>
              </div>
            </div>

            {/* Customer */}
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-dashed border-border pb-1">Customer</p>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Name</span>
                <span className="font-semibold max-w-[60%] text-right">{order.customerName}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-mono">{order.phone}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Type</span>
                <span className="uppercase font-semibold">{order.type}</span>
              </div>
              {order.deliveryAddress && (
                <div className="pt-1">
                  <p className="text-muted-foreground text-[9px] mb-1">Delivery Address</p>
                  <p className="text-[11px] bg-blue-50 border border-blue-200 p-2 rounded whitespace-normal break-words">
                    {order.deliveryAddress}
                  </p>
                </div>
              )}
            </div>

            {/* Items */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b-2 border-dashed border-border pb-1 mb-2">Order Items</p>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="text-[11px] border-b border-dashed border-border/50 pb-2 last:border-0">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold flex-1 pr-2 whitespace-normal break-words">{item.service.name}</p>
                      {!item.isWeightPending && (
                        <p className="font-bold whitespace-nowrap">Rs.{(item.quantity * item.service.price).toLocaleString()}</p>
                      )}
                    </div>
                    {item.isWeightPending ? (
                      <p className="text-orange-600 font-bold text-[10px] mt-0.5">⚠ WEIGHT TO BE CONFIRMED</p>
                    ) : (
                      <p className="text-muted-foreground text-[10px] mt-0.5">
                        {item.quantity} {item.service.unit} × Rs.{Number(item.service.price).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="pt-1 space-y-1.5 border-t-2 border-dashed border-border">
              <div className="flex justify-between text-[12px] font-bold pt-1.5">
                <span>SUBTOTAL</span>
                <span className="whitespace-nowrap">Rs.{Number(slipTotal).toLocaleString()}{hasPendingItems && ' + TBD'}</span>
              </div>
              {order.advancePayment && order.advancePayment > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">ADVANCE PAID</span>
                  <span className="text-green-600 font-semibold whitespace-nowrap">- Rs.{Number(order.advancePayment).toLocaleString()}</span>
                </div>
              )}
              {remainingBalance > 0 && (
                <div className="flex justify-between text-[13px] font-black pt-1.5 border-t border-dashed border-border">
                  <span className="text-red-600">DUE</span>
                  <span className="text-red-600 whitespace-nowrap">Rs.{Number(remainingBalance).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="space-y-1.5 pt-1 border-t border-dashed border-border">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="uppercase font-semibold">{order.paymentMethod || 'CASH'}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Payment Status</span>
                <span className={`uppercase font-black ${order.paymentStatus === 'paid' ? 'text-green-600' : order.paymentStatus === 'partial' ? 'text-blue-600' : 'text-orange-500'}`}>
                  {order.paymentStatus === 'paid' ? '✓ PAID' : order.paymentStatus === 'partial' ? 'PARTIAL' : '✗ UNPAID'}
                </span>
              </div>
              {order.paymentStatus !== 'paid' && remainingBalance > 0 && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-2.5 text-center mt-1">
                  <p className="text-orange-900 font-black text-[12px] uppercase tracking-wide">
                    💵 Collect: Rs.{Number(remainingBalance).toLocaleString()}{hasPendingItems && ' (+ TBD)'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-3 border-t-2 border-dashed border-border">
              <p className="text-[9px] text-muted-foreground">🙏 Thank you for your order!</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Visit Mughal Atta Chakki again</p>
            </div>
          </div>
        </div>

        {/* Sticky Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 px-5 py-4 border-t border-border/50 bg-background">
          <Button onClick={handleWhatsAppShare} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm h-9">
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
          <Button onClick={handlePrint} className="flex-1 bg-primary hover:bg-primary/90 text-sm h-9">
            <Printer className="h-4 w-4 mr-2" />
            Print Slip
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1 text-sm h-9">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}