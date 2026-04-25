import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Printer, X, ClipboardList } from 'lucide-react';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';

/* ─── Shared SVG Logo ─────────────────────────────────────────── */
const LogoSVG = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="32" fill="#78350f" />
    <ellipse cx="32" cy="38" rx="16" ry="8" fill="#fef3c7" opacity="0.9" />
    <ellipse cx="32" cy="36" rx="12" ry="6" fill="#f59e0b" opacity="0.8" />
    <line x1="32" y1="44" x2="32" y2="18" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" />
    <ellipse cx="27" cy="28" rx="4" ry="2.5" fill="#fef3c7" transform="rotate(-30 27 28)" />
    <ellipse cx="26" cy="23" rx="4" ry="2.5" fill="#fef3c7" transform="rotate(-25 26 23)" />
    <ellipse cx="37" cy="28" rx="4" ry="2.5" fill="#fef3c7" transform="rotate(30 37 28)" />
    <ellipse cx="38" cy="23" rx="4" ry="2.5" fill="#fef3c7" transform="rotate(25 38 23)" />
    <ellipse cx="32" cy="20" rx="3" ry="4" fill="#fef3c7" />
  </svg>
);

export function PrintOrderDetails({ order, open, onClose }) {
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

  const hasPendingItems = order.items.some(i => i.isWeightPending);
  const remainingBalance = order.total - (order.advancePayment || 0);

  const getStatusLabel = (status) => {
    const map = {
      pending: 'Pending',
      processing: 'Processing',
      ready: 'Ready for Pickup/Delivery',
      'out-for-delivery': 'Out for Delivery',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return map[status] || status;
  };

  const getStatusBadgeStyle = (status) => {
    const map = {
      pending: 'background:#fef9c3;color:#854d0e;border:1px solid #fde047;',
      processing: 'background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;',
      ready: 'background:#dcfce7;color:#166534;border:1px solid #86efac;',
      'out-for-delivery': 'background:#f3e8ff;color:#6b21a8;border:1px solid #c4b5fd;',
      completed: 'background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;',
      cancelled: 'background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;',
    };
    return map[status] || 'background:#f3f4f6;color:#374151;border:1px solid #d1d5db;';
  };

  const getStatusColorClass = (status) => {
    const map = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      processing: 'bg-blue-100 text-blue-800 border-blue-300',
      ready: 'bg-green-100 text-green-800 border-green-300',
      'out-for-delivery': 'bg-purple-100 text-purple-800 border-purple-300',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
    };
    return map[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  /* ── Items HTML for print ── */
  const itemsHTML = order.items.map(item => {
    if (item.isWeightPending) {
      return `
        <div style="border-bottom:1px dashed #ccc;padding:7px 0;">
          <div style="font-weight:600;font-size:12px;">${item.service.name}</div>
          <div style="color:#d97706;font-size:10px;font-weight:700;margin-top:2px;">⚠ WEIGHT TO BE CONFIRMED</div>
        </div>`;
    }
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px dashed #ccc;padding:7px 0;">
        <div style="flex:1;padding-right:10px;">
          <div style="font-weight:600;font-size:12px;">${item.service.name}</div>
          <div style="color:#555;font-size:10px;margin-top:2px;">${item.quantity} ${item.service.unit} × Rs.${Number(item.service.price).toLocaleString()}</div>
        </div>
        <div style="font-weight:700;white-space:nowrap;font-size:13px;">Rs.${(item.quantity * item.service.price).toLocaleString()}</div>
      </div>`;
  }).join('');

  const buildPrintHTML = () => {
    const logoHTMLForPrint = `
      <div style="display:flex;align-items:center;justify-content:center;gap:14px;padding:14px 0 10px;">
        <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        <div>
          <div style="font-size:18px;font-weight:900;letter-spacing:2px;color:#1a1a1a;text-transform:uppercase;">${storeSettings.name}</div>
          <div style="font-size:10px;color:#666;letter-spacing:1px;margin-top:2px;">${storeSettings.tagline}</div>
          <div style="font-size:10px;color:#666;margin-top:1px;">📍 ${storeSettings.address} &nbsp;|&nbsp; 📞 ${storeSettings.phone}</div>
        </div>
      </div>
    `;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Order Details — ${order.id}</title>
      <style>
        @page { size: A4; margin: 15mm 12mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Courier New', monospace; font-size: 12px; color: #111; background: #fff; }
        .header { text-align: center; border-bottom: 2.5px dashed #333; padding-bottom: 10px; margin-bottom: 12px; }
        .doc-title { display:inline-block; border: 1.5px solid #555; padding: 3px 14px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-top: 6px; }
        .section-title { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #555; border-bottom: 1px dashed #aaa; padding-bottom: 4px; margin: 12px 0 7px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; background: #f9fafb; border: 1px solid #e5e7eb; padding: 10px 12px; border-radius: 6px; }
        .info-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #777; font-weight: 700; margin-bottom: 2px; }
        .info-value { font-size: 11px; font-weight: 600; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 30px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
        .row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; }
        .muted { color: #666; }
        .bold { font-weight: 700; }
        .total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; }
        .due-row { color: #b91c1c; border-top: 2px dashed #333; padding-top: 7px; margin-top: 7px; font-size: 15px; }
        .advance-row { color: #15803d; font-weight: 700; }
        .collect-box { background: #fef2f2; border: 2px solid #fca5a5; border-radius: 6px; padding: 10px; text-align: center; margin-top: 10px; }
        .collect-box p { font-size: 14px; font-weight: 900; text-transform: uppercase; color: #7f1d1d; }
        .footer { text-align: center; font-size: 10px; color: #777; border-top: 1.5px dashed #aaa; padding-top: 10px; margin-top: 14px; }
        .items-header { display:flex; justify-content:space-between; font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:1px; color:#888; padding:0 0 4px; }
        .cancel-box { grid-column:span 2; background:#fef2f2; border:1px solid #fca5a5; border-radius:4px; padding:8px; margin-top:4px; }
        .delivery-addr { font-size:11px; background:#eff6ff; border:1px solid #bfdbfe; padding:5px 8px; border-radius:4px; word-break:break-word; margin-top:4px; }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoHTMLForPrint}
        <div class="doc-title">Order Details</div>
      </div>

      <!-- Order Info -->
      <div class="section-title">Order Information</div>
      <div class="info-grid">
        <div>
          <div class="info-label">Order ID</div>
          <div class="info-value" style="font-size:10px;word-break:break-all;">${order.id}</div>
        </div>
        <div>
          <div class="info-label">Order Type</div>
          <div class="info-value" style="text-transform:uppercase;">${order.type}</div>
        </div>
        <div>
          <div class="info-label">Date &amp; Time</div>
          <div class="info-value">${new Date(order.createdAt).toLocaleDateString('en-GB')} ${new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div>
          <div class="info-label">Status</div>
          <span class="badge" style="${getStatusBadgeStyle(order.status)}">${getStatusLabel(order.status)}</span>
        </div>
        ${order.status === 'cancelled' && order.cancellationReason
          ? `<div class="cancel-box"><div style="font-size:10px;color:#7f1d1d;font-weight:700;">Cancellation Reason:</div><div style="font-size:11px;color:#b91c1c;font-style:italic;margin-top:2px;">"${order.cancellationReason}"</div></div>`
          : ''}
      </div>

      <!-- Customer Info -->
      <div class="section-title">Customer Information</div>
      <div class="row"><span class="muted">Customer Name</span><span class="bold">${order.customerName}</span></div>
      <div class="row"><span class="muted">Phone Number</span><span class="bold">${order.phone}</span></div>
      ${order.deliveryAddress ? `<div style="margin-top:4px;"><span style="font-size:10px;color:#666;">Delivery Address:</span><div class="delivery-addr">${order.deliveryAddress}</div></div>` : ''}
      ${order.deliveryPersonnel ? `<div class="row" style="margin-top:4px;"><span class="muted">Delivery By</span><span class="bold">${order.deliveryPersonnel}</span></div>` : ''}

      <!-- Items -->
      <div class="section-title">Order Items</div>
      <div class="items-header"><span>Item</span><span>Amount</span></div>
      ${itemsHTML}

      <!-- Totals -->
      <div style="border-top:2.5px dashed #333;margin-top:10px;padding-top:10px;">
        <div class="total-row"><span>SUBTOTAL</span><span>Rs.${Number(order.total).toLocaleString()}${hasPendingItems ? ' + TBD' : ''}</span></div>
        ${order.advancePayment && order.advancePayment > 0 ? `<div class="row advance-row" style="margin-top:5px;"><span>ADVANCE PAID</span><span>- Rs.${Number(order.advancePayment).toLocaleString()}</span></div>` : ''}
        ${remainingBalance > 0 ? `<div class="total-row due-row"><span>REMAINING DUE</span><span>Rs.${Number(remainingBalance).toLocaleString()}</span></div>` : ''}
      </div>

      <!-- Payment -->
      <div class="section-title">Payment Information</div>
      <div class="row"><span class="muted">Payment Method</span><span class="bold" style="text-transform:uppercase;">${order.paymentMethod === 'jazzcash' ? 'JazzCash' : order.paymentMethod === 'easypaisa' ? 'EasyPaisa' : order.paymentMethod || 'CASH'}</span></div>
      <div class="row"><span class="muted">Payment Status</span>
        <span style="font-weight:900;text-transform:uppercase;${order.paymentStatus === 'paid' ? 'color:#15803d;' : order.paymentStatus === 'partial' ? 'color:#1d4ed8;' : 'color:#d97706;'}">
          ${order.paymentStatus === 'paid' ? '✓ PAID' : order.paymentStatus === 'partial' ? 'PARTIAL' : '✗ UNPAID'}
        </span>
      </div>
      ${order.paymentStatus === 'paid' && order.transactionId ? `<div class="row"><span class="muted">Transaction ID</span><span style="font-family:monospace;font-size:10px;">${order.transactionId}</span></div>` : ''}
      ${order.paymentStatus !== 'paid' && remainingBalance > 0 ? `<div class="collect-box"><p>⚠ COLLECT PAYMENT: Rs.${Number(remainingBalance).toLocaleString()}${hasPendingItems ? ' (+ TBD)' : ''}</p></div>` : ''}

      <div class="footer">
        <p>Printed on: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
        <p style="margin-top:4px;">🙏 Thank you for your business!</p>
        <p style="font-weight:700;margin-top:2px;">${storeSettings.name} — ${storeSettings.tagline}</p>
      </div>
    </body>
    </html>
  `;
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank', 'width=700,height=800');
    printWin.document.open();
    printWin.document.write(buildPrintHTML());
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg p-0 gap-0 overflow-hidden"
        hideCloseButton
      >
        {/* Dialog Header with Logo */}
        <DialogHeader className="px-6 pt-4 pb-3 border-b border-border/50 bg-gradient-to-r from-amber-900/10 to-amber-800/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LogoSVG size={40} />
              <div>
                <DialogTitle className="text-sm font-black tracking-wide uppercase">{storeSettings.name}</DialogTitle>
                <p className="text-[10px] text-muted-foreground">Full Order Details</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </DialogHeader>

        {/* ── Scrollable Bill Preview ── */}
        <div className="overflow-y-auto" style={{ maxHeight: '65vh' }}>
          <div className="font-mono text-sm px-6 py-5 space-y-4">

            {/* Store Letterhead */}
            <div className="text-center pb-4 border-b-2 border-dashed border-border">
              <div className="flex justify-center mb-2">
                <LogoSVG size={56} />
              </div>
              <h2 className="text-base font-black tracking-widest uppercase">{storeSettings.name}</h2>
              <p className="text-[9px] text-muted-foreground tracking-wider mt-0.5 uppercase">{storeSettings.tagline}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">📍 {storeSettings.address} &nbsp;|&nbsp; 📞 {storeSettings.phone}</p>
              <div className="mt-2.5 inline-block border border-border rounded px-3 py-0.5">
                <p className="text-[9px] font-bold tracking-widest uppercase">Order Details</p>
              </div>
            </div>

            {/* Order Info Card */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Order ID</p>
                  <p className="text-[10px] font-mono font-bold mt-0.5 break-all">{order.id}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Type</p>
                  <p className="text-[11px] font-bold uppercase mt-0.5">{order.type}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Date & Time</p>
                  <p className="text-[10px] font-medium mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('en-GB')}{' '}
                    {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Status</p>
                  <span className={`inline-block mt-0.5 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusColorClass(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                {order.status === 'cancelled' && order.cancellationReason && (
                  <div className="col-span-2 bg-red-50 border border-red-300 rounded-lg p-2.5 mt-1">
                    <p className="text-[9px] uppercase tracking-wider text-red-500 font-bold mb-0.5">Cancellation Reason</p>
                    <p className="text-[11px] text-red-700 italic">"{order.cancellationReason}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-dashed border-border pb-1.5 mb-2.5">👤 Customer Information</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Customer Name</span>
                  <span className="font-bold">{order.customerName}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Phone Number</span>
                  <span className="font-mono font-semibold">{order.phone}</span>
                </div>
                {order.deliveryAddress && (
                  <div>
                    <p className="text-muted-foreground text-[9px] mb-1">Delivery Address</p>
                    <p className="text-[11px] bg-blue-50 border border-blue-200 p-2 rounded-lg whitespace-normal break-words">
                      {order.deliveryAddress}
                    </p>
                  </div>
                )}
                {order.deliveryPersonnel && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Delivery By</span>
                    <span className="font-semibold">{order.deliveryPersonnel}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b-2 border-dashed border-border pb-1.5 mb-2.5">🛒 Order Items</p>
              <div className="flex justify-between text-[9px] uppercase tracking-wide text-muted-foreground font-bold px-0.5 mb-1.5">
                <span>Item</span><span>Amount</span>
              </div>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start border-b border-dashed border-border/50 pb-2 last:border-0">
                    <div className="flex-1 pr-4">
                      <p className="text-[12px] font-semibold whitespace-normal break-words">{item.service.name}</p>
                      {item.isWeightPending ? (
                        <p className="text-[10px] text-orange-600 font-bold mt-0.5">⚠ WEIGHT TO BE CONFIRMED</p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {item.quantity} {item.service.unit} × Rs.{Number(item.service.price).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {!item.isWeightPending && (
                      <p className="text-[12px] font-bold whitespace-nowrap">
                        Rs.{(item.quantity * item.service.price).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <div className="flex justify-between text-[13px] font-bold">
                <span>SUBTOTAL</span>
                <span className="whitespace-nowrap">Rs.{Number(order.total).toLocaleString()}{hasPendingItems && <span className="text-orange-500"> + TBD</span>}</span>
              </div>
              {order.advancePayment && order.advancePayment > 0 && (
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground">ADVANCE PAID</span>
                  <span className="text-green-600 font-bold whitespace-nowrap">- Rs.{Number(order.advancePayment).toLocaleString()}</span>
                </div>
              )}
              {remainingBalance > 0 && (
                <div className="flex justify-between text-[15px] font-black pt-2 border-t-2 border-dashed border-border">
                  <span className="text-red-600">REMAINING DUE</span>
                  <span className="text-red-600 whitespace-nowrap">Rs.{Number(remainingBalance).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Payment */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-dashed border-border pb-1.5 mb-2.5">💳 Payment Information</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="uppercase font-bold">
                    {order.paymentMethod === 'jazzcash' ? 'JazzCash' : order.paymentMethod === 'easypaisa' ? 'EasyPaisa' : order.paymentMethod || 'CASH'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Payment Status</span>
                  <span className={`uppercase font-black ${order.paymentStatus === 'paid' ? 'text-green-600' : order.paymentStatus === 'partial' ? 'text-blue-600' : 'text-orange-500'}`}>
                    {order.paymentStatus === 'paid' ? '✓ PAID' : order.paymentStatus === 'partial' ? 'PARTIAL' : '✗ UNPAID'}
                  </span>
                </div>
                {order.paymentStatus === 'paid' && order.transactionId && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Transaction ID</span>
                    <span className="font-mono text-[10px]">{order.transactionId}</span>
                  </div>
                )}
              </div>
              {order.paymentStatus !== 'paid' && remainingBalance > 0 && (
                <div className="mt-3 bg-red-50 border-2 border-red-300 rounded-xl p-3 text-center">
                  <p className="text-red-900 font-black text-[13px] uppercase tracking-wide">
                    ⚠ COLLECT PAYMENT: Rs.{Number(remainingBalance).toLocaleString()}{hasPendingItems && ' (+ TBD)'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-dashed border-border pt-3 text-center space-y-0.5">
              <p className="text-[9px] text-muted-foreground">
                Printed: {new Date().toLocaleDateString('en-GB')} at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-[9px] text-muted-foreground">🙏 Thank you for your business!</p>
              <p className="text-[9px] text-muted-foreground font-bold">MUGHAL ATTA CHAKKI — Pure Grains, Fresh Quality</p>
            </div>
          </div>
        </div>

        {/* ── Sticky Action Buttons ── */}
        <div className="flex gap-2.5 px-6 py-4 border-t border-border/50 bg-background">
          <Button onClick={handlePrint} className="flex-1 bg-primary hover:bg-primary/90 text-sm h-9">
            <Printer className="h-4 w-4 mr-2" />
            Print Details
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1 text-sm h-9">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}