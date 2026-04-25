import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Printer, X } from 'lucide-react';
import { API_BASE_URL } from '../../config';

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-GB') + ' ' + new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const getPaidCount = (orders) => orders.filter(o => o.paymentStatus === 'paid').length;
const getUnpaidCount = (orders) => orders.filter(o => o.paymentStatus === 'pending').length;
const getDeliveryCount = (orders) => orders.filter(o => o.type === 'delivery').length;
const getPickupCount = (orders) => orders.filter(o => o.type === 'pickup').length;
const getPartialCount = (orders) => orders.filter(o => o.paymentStatus === 'partial').length;

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

export function PrintTaskList({ orders, title, open, onClose }) {

  const [storeSettings, setStoreSettings] = useState({ name: "GRISTMILL'S", address: "", phone: "", tagline: "" });

  useEffect(() => {
    if (open) {
      fetch(`${API_BASE_URL}/get_store_settings.php`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.settings) {
            setStoreSettings({
              name: data.settings.storeName || "GRISTMILL'S",
              address: data.settings.address || "",
              phone: data.settings.phone || "",
              tagline: data.settings.tagline || ""
            });
          }
        })
        .catch(err => console.error("Failed to load store settings", err));
    }
  }, [open]);

  const handlePrint = () => {
    const printWin = window.open('', '_blank', 'width=800,height=900');
    printWin.document.open();
    printWin.document.write(buildPrintHTML());
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 400);
  };
  
  const confirmedTotalRevenue = orders
    .filter(o => !o.items.some(i => i.isWeightPending || i.is_weight_pending))
    .reduce((s, o) => s + o.total, 0);
    
  const pendingWeightOrders = orders.filter(o => o.items.some(i => i.isWeightPending || i.is_weight_pending));

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

    const ordersHTML = orders.map((order, idx) => {
      const remainingBalance = order.total - (order.advancePayment || 0);
      const itemsHTML = (order.items || []).map(item => {
        const itemName = item.name || item.service?.name || 'Unknown Item';
        const itemUnit = item.unit || item.service?.unit || '';
        const itemPrice = item.price || item.service?.price || 0;
        const isPending = item.isWeightPending || item.is_weight_pending || false;

        const quantityText = isPending ? '<span style="font-weight:bold;">(Pending Wt.)</span>' : `${item.quantity} ${itemUnit}`;
        const priceText = (!isPending && itemPrice > 0) ? `Rs.${item.quantity * itemPrice}` : '';

        return `<div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px;">
            <span>${itemName} × ${quantityText}</span>
            <span style="font-weight:600;">${priceText}</span>
        </div>`;
      }).join('');

      let cancelHTML = '';
      if (order.status === 'cancelled') {
        cancelHTML = `<div style="background:#fef2f2;border:1px solid #fca5a5;padding:6px;border-radius:4px;margin-top:8px;">
            <div style="font-size:10px;font-weight:bold;color:#7f1d1d;">CANCELLED</div>
            ${order.cancellationReason ? `<div style="font-size:10px;font-style:italic;color:#991b1b;">Reason: ${order.cancellationReason}</div>` : ''}
            ${order.cancelledBy ? `<div style="font-size:10px;color:#991b1b;">By: ${order.cancelledBy}</div>` : ''}
        </div>`;
      }

      let collectHTML = '';
      if (order.paymentStatus !== 'paid' && order.paymentMethod === 'cash' && order.status !== 'cancelled' && remainingBalance > 0) {
        collectHTML = `<div style="text-align:center;font-weight:800;font-size:12px;margin-top:8px;padding-top:6px;border-top:1.5px dashed #000;">
           COLLECT: Rs.${remainingBalance} ${order.items.some(i => i.isWeightPending || i.is_weight_pending) ? '(+ TBD)' : ''}
        </div>`;
      }

      return `
        <div class="order-card">
          <div class="card-header">
            <div>
              <div style="font-size:13px;font-weight:800;">#${idx + 1} – ${order.customerName}</div>
              <div style="font-size:10px;color:#555;">ID: ${order.id}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px;font-weight:600;">SUBTOTAL: Rs.${order.total} ${order.items.some(i => i.isWeightPending || i.is_weight_pending) ? '(+TBD)' : ''}</div>
              ${order.advancePayment > 0 ? `<div style="font-size:10px;color:#166534;">ADVANCE: Rs.${order.advancePayment}</div>` : ''}
              ${remainingBalance > 0 ? `<div style="font-size:12px;font-weight:800;color:#b91c1c;">DUE: Rs.${remainingBalance}</div>` : ''}
              <div style="font-size:10px;font-weight:800;margin-top:2px;">STATUS: ${order.paymentStatus ? order.paymentStatus.toUpperCase() : 'PENDING'}</div>
            </div>
          </div>

          <div class="grid-2" style="font-size:10px;margin-bottom:8px;">
            <div>Phone: <b>${order.phone}</b></div>
            <div>Type: <b style="text-transform:uppercase;">${order.type}</b></div>
            <div>Payment: <b style="text-transform:uppercase;">${order.paymentMethod}</b></div>
            <div>Status: <b style="text-transform:uppercase;">${order.status ? order.status.replace(/-/g, ' ') : 'N/A'}</b></div>
          </div>
          
          ${order.deliveryAddress ? `<div style="font-size:10px;margin-bottom:8px;"><b>Address:</b> ${order.deliveryAddress}</div>` : ''}
          
          <div style="border-top:1px dashed #666;padding-top:6px;">
            <div style="font-size:10px;font-weight:700;margin-bottom:4px;">Items:</div>
            ${itemsHTML}
          </div>
          
          ${cancelHTML}
          ${collectHTML}
        </div>
      `;
    }).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>${title}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Courier New', monospace; font-size: 12px; color: #111; background: #fff; padding: 10px; }
        .header { text-align: center; border-bottom: 2.5px dashed #333; padding-bottom: 10px; margin-bottom: 15px; }
        .doc-title { font-size: 14px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-top: 10px; }
        
        .summary-box { border: 2px dashed #000; padding: 12px; border-radius: 6px; background: #fdfdfd; margin-bottom: 20px; }
        .summary-title { text-align: center; font-weight: 900; font-size: 14px; margin-bottom: 10px; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center; }
        .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; }
        
        .orders-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .order-card { border: 1.5px solid #000; padding: 12px; border-radius: 4px; page-break-inside: avoid; }
        .card-header { display: flex; justify-content: space-between; border-bottom: 1px dashed #666; padding-bottom: 8px; margin-bottom: 8px; }
        
        .footer { text-align: center; font-size: 10px; color: #555; border-top: 1.5px dashed #000; padding-top: 10px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoHTMLForPrint}
        <div class="doc-title">${title}</div>
        <div style="font-size:10px;margin-top:4px;">Printed on: ${formatDate(new Date())}</div>
      </div>

      <div class="summary-box">
        <div class="summary-title">SUMMARY</div>
        <div class="grid-3">
          <div><div style="font-size:10px;color:#555;">Total Orders</div><div style="font-size:16px;font-weight:900;">${orders.length}</div></div>
          <div><div style="font-size:10px;color:#555;">Confirmed Revenue</div><div style="font-size:16px;font-weight:900;">Rs. ${confirmedTotalRevenue}</div></div>
          <div><div style="font-size:10px;color:#555;">Pending Weight</div><div style="font-size:16px;font-weight:900;">${pendingWeightOrders.length}</div></div>
          <div><div style="font-size:10px;color:#555;">Paid/Partial/Unpaid</div><div style="font-size:14px;font-weight:700;">${getPaidCount(orders)} / ${getPartialCount(orders)} / ${getUnpaidCount(orders)}</div></div>
          <div><div style="font-size:10px;color:#555;">Delivery/Pickup</div><div style="font-size:14px;font-weight:700;">${getDeliveryCount(orders)} / ${getPickupCount(orders)}</div></div>
        </div>
      </div>

      <div class="orders-grid">
        ${ordersHTML}
      </div>

      <div class="footer">End of ${title}</div>
    </body>
    </html>
    `;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl w-[95vw] p-0 gap-0 overflow-hidden shadow-2xl rounded-2xl border-2 border-stone-200"
        hideCloseButton
      >
        {/* Dialog Header with Logo */}
        <DialogHeader className="px-6 pt-4 pb-3 border-b border-border/50 bg-gradient-to-r from-amber-900/10 to-amber-800/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LogoSVG size={40} />
              <div>
                <DialogTitle className="text-sm font-black tracking-wide uppercase">{storeSettings.name}</DialogTitle>
                <p className="text-[10px] text-muted-foreground">Preview: {title}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </DialogHeader>

        {/* ── Scrollable Preview ── */}
        <div className="overflow-y-auto bg-stone-50" style={{ maxHeight: '70vh' }}>
          <div className="p-4 sm:p-6 lg:p-8">
            <div id="printable-list" className="font-mono text-sm space-y-6 bg-white text-black p-6 sm:p-8 rounded-xl shadow-md border border-stone-300 max-w-3xl mx-auto">
              {/* ==== HEADER ==== */}
          <div className="text-center border-b-2 border-dashed border-black pb-4">
            <div className="flex justify-center mb-2">
              <LogoSVG size={56} />
            </div>
            <h2 className="text-2xl font-bold mb-1 uppercase tracking-widest">{storeSettings.name}</h2>
            {storeSettings.tagline && <p className="text-[10px] text-gray-600 uppercase tracking-wide mt-1">{storeSettings.tagline}</p>}
            <p className="text-[10px] text-gray-600 mt-1">📍 {storeSettings.address} &nbsp;|&nbsp; 📞 {storeSettings.phone}</p>
            <h3 className="text-lg mt-4 font-semibold">{title}</h3>
            <p className="text-xs mt-2">Printed on: {formatDate(new Date())}</p>
          </div>

          {/* ==== SUMMARY ==== */}
          <div className="border-2 border-dashed border-black p-5 bg-gray-50/50 rounded">
            <h4 className="text-center font-bold mb-3 text-base">SUMMARY</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="text-gray-600">Total Orders</p>
                <p className="text-xl font-bold">{orders.length}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-600">Confirmed Revenue</p>
                <p className="text-xl font-bold">Rs. {confirmedTotalRevenue}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-600">Pending Weight</p>
                <p className="text-xl font-bold">{pendingWeightOrders.length} Orders</p>
              </div>
              <div className="text-center">
                <p className="text-gray-600">Paid / Partial / Unpaid</p>
                <p className="text-xl font-semibold">
                  {getPaidCount(orders)} / {getPartialCount(orders)} / {getUnpaidCount(orders)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-600">Delivery / Pickup</p>
                <p className="text-xl font-semibold">
                   {getDeliveryCount(orders)} / {getPickupCount(orders)}
                </p>
              </div>
            </div>
          </div>

          {/* ==== ORDERS ==== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {orders.map((order, idx) => {
                const remainingBalance = order.total - (order.advancePayment || 0); 
                
                return (
              <div
                key={order.id}
                className="border-2 border-solid border-black p-4 rounded-lg bg-white"
              >
                {/* Header */}
                <div className="flex justify-between mb-3 border-b border-dashed border-gray-400 pb-3">
                  <div>
                    <p className="text-base font-extrabold uppercase">#{idx + 1} – {order.customerName}</p>
                    <p className="text-xs text-gray-500">ID: {order.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">SUBTOTAL: Rs. {order.total}{order.items.some(i => i.isWeightPending || i.is_weight_pending) && " (+TBD)"}</p>
                    {order.advancePayment && order.advancePayment > 0 && (
                        <p className="text-xs text-green-700 font-bold">ADVANCE: Rs. {order.advancePayment}</p>
                    )}
                    {remainingBalance > 0 && (
                        <p className="text-base font-black text-red-700">DUE: Rs. {remainingBalance}</p>
                    )}
                    <p className={`text-xs font-black uppercase mt-1 ${order.paymentStatus === 'paid' ? 'text-green-700' : order.paymentStatus === 'partial' ? 'text-blue-700' : 'text-orange-700'}`}>
                        STATUS: {order.paymentStatus || 'PENDING'}
                    </p>
                  </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3 font-medium text-gray-800">
                  <div>Phone: <span className="font-bold text-black">{order.phone}</span></div>
                  <div>Type: <span className="uppercase font-bold text-black">{order.type}</span></div>
                  <div>Payment: <span className="uppercase font-bold text-black">{order.paymentMethod}</span></div>
                  <div>Status: <span className="uppercase font-bold text-black">{order.status ? order.status.replace(/-/g, ' ') : 'N/A'}</span></div>
                </div>

                {/* Delivery Address */}
                {order.deliveryAddress && (
                  <div className="mb-3 text-xs bg-blue-50/50 p-2 rounded border border-blue-100">
                    <span className="font-bold text-gray-700">Address: </span>
                    <span className="break-words font-medium">{order.deliveryAddress}</span>
                  </div>
                )}

                {/* Items */}
                <div className="border-t border-dashed border-gray-400 pt-3">
                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Items</p>
                  <div className="space-y-1.5 text-xs">
                    {order.items && order.items.map((item, i) => {
                      const itemName = item.name || item.service?.name || 'Unknown Item';
                      const itemUnit = item.unit || item.service?.unit || '';
                      const itemPrice = item.price || item.service?.price || 0;
                      const isPending = item.isWeightPending || item.is_weight_pending || false;

                      return (
                      <div key={i} className="flex justify-between font-medium">
                        <span className="break-words w-[70%]">
                          {itemName} × {isPending ? (
                            <span className="font-bold text-orange-600">(Pending Wt.)</span>
                          ) : (
                            <span className="font-bold">{item.quantity} {itemUnit}</span>
                          )}
                        </span>
                        {!isPending && itemPrice > 0 && (
                          <span className="font-bold whitespace-nowrap">
                            Rs. {item.quantity * itemPrice}
                          </span>
                        )}
                      </div>
                    )})}
                  </div>
                </div>

                {/* Cancellation Info */}
                {order.status === 'cancelled' && (
                  <div className="mt-3 pt-2 border-t border-dashed border-gray-400">
                     <p className="text-xs font-black text-red-600">CANCELLED</p>
                     {order.cancellationReason && <p className="text-xs italic text-red-500">Reason: {order.cancellationReason}</p>}
                     {order.cancelledBy && <p className="text-xs text-red-500">By: {order.cancelledBy}</p>}
                  </div>
                )}

                {/* Cash Collection Alert */}
                {order.paymentStatus !== 'paid' && order.paymentMethod === 'cash' && order.status !== 'cancelled' && remainingBalance > 0 && (
                  <div className="mt-3 py-2 border-y-2 border-dashed border-black text-center font-black text-sm bg-red-50 text-red-900">
                    COLLECT: Rs. {remainingBalance}
                    {order.items.some(i => i.isWeightPending || i.is_weight_pending) && " (+ TBD)"}
                  </div>
                )}
              </div>
            );
            })} 
          </div>

          {/* ==== FOOTER ==== */}
          <div className="text-center text-xs text-gray-500 pt-6 border-t-2 border-dashed border-black">
            <p className="font-medium">End of {title}</p>
          </div>
            </div>
          </div>
        </div>

        {/* ── Sticky Action Buttons ── */}
        <div className="flex gap-2.5 px-6 py-4 border-t border-border/50 bg-background">
          <Button onClick={handlePrint} className="flex-1 bg-primary hover:bg-primary/90 text-sm h-9">
            <Printer className="h-4 w-4 mr-2" />
            Print Full List
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1 text-sm h-9">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}