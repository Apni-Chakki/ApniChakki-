import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Printer, X } from 'lucide-react';
import { API_BASE_URL } from '../../config';

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

export function PrintRestockList({ items, open, onClose }) {
  const [storeSettings, setStoreSettings] = useState({ name: "MUGHAL ATTA CHAKKI", address: "", phone: "", tagline: "" });

  useEffect(() => {
    if (open) {
      fetch(`${API_BASE_URL}/get_store_settings.php`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.settings) {
            setStoreSettings({
              name: data.settings.storeName || "MUGHAL ATTA CHAKKI",
              address: data.settings.address || "",
              phone: data.settings.phone || "",
              tagline: data.settings.tagline || ""
            });
          }
        })
        .catch(err => console.error("Failed to load store settings", err));
    }
  }, [open]);

  // Sort items so low stock is at the top
  const sortedItems = [...items].sort((a, b) => {
    const aIsLow = a.currentStock <= a.minStockLevel;
    const bIsLow = b.currentStock <= b.minStockLevel;
    if (aIsLow && !bIsLow) return -1;
    if (!aIsLow && bIsLow) return 1;
    return a.productName.localeCompare(b.productName);
  });

  const lowStockCount = sortedItems.filter(i => i.currentStock <= i.minStockLevel).length;

  const handlePrint = () => {
    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (!printWin) {
      alert("Please allow popups to print the report.");
      return;
    }
    printWin.document.open();
    printWin.document.write(buildPrintHTML());
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 500);
  };

  const buildPrintHTML = () => {
    const printDate = new Date().toLocaleString();

    const logoHTMLForPrint = `
      <div style="display:flex;align-items:center;justify-content:center;gap:14px;padding:5px 0 10px;">
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

    const rowsHTML = sortedItems.length === 0 
      ? `<tr><td colspan="6" style="text-align:center;padding:12px;color:#666;">No items found in inventory.</td></tr>`
      : sortedItems.map((item, index) => {
          const isLowStock = item.currentStock <= item.minStockLevel;
          const required = isLowStock ? Math.max(0, item.minStockLevel - item.currentStock + 20) : 0;
          return `
          <tr style="${isLowStock ? 'background-color:#fff0f0;' : ''}">
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;">${index + 1}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;font-weight:600;">${item.productName}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;${isLowStock ? 'color:#b91c1c;font-weight:bold;' : ''}">${item.currentStock} ${item.unit}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;">${item.minStockLevel} ${item.unit}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;">
              <span style="${isLowStock ? 'background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;' : 'background:#dcfce7;color:#166534;border:1px solid #86efac;'} padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold;">
                ${isLowStock ? 'LOW STOCK' : 'OK'}
              </span>
            </td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">
              ${isLowStock ? `<span style="color:#b91c1c;">+${required} ${item.unit}</span>` : `<span style="color:#9ca3af;font-weight:normal;">-</span>`}
            </td>
          </tr>
        `}).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Status Report</title>
        <style>
          body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 20px; color: #111827; line-height: 1.5; }
          .header-section { text-align: center; border-bottom: 2px solid #78350f; padding-bottom: 15px; margin-bottom: 24px; }
          .title-area { margin-top: 15px; display:flex; justify-content: space-between; align-items:flex-end; }
          .report-title { font-size: 24px; font-weight: 800; color: #111827; margin: 0; text-transform: uppercase; }
          .report-meta { font-size: 13px; color: #4b5563; text-align:right; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
          th { background: #f9fafb; padding: 10px; text-align: left; font-weight: 700; color: #374151; border-bottom: 2px solid #e5e7eb; }
          .summary-container { display: flex; gap: 40px; margin-top: 30px; page-break-inside: avoid; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; background: #fffaf0; }
          .summary-col { flex: 1; }
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px; border-top: 1px solid #d1d5db; page-break-inside: avoid; }
          .sig-line { width: 200px; text-align: center; }
          .sig-line div { border-top: 1px solid #374151; padding-top: 5px; font-size: 13px; font-weight: 500; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
            @page { margin: 15mm; }
          }
        </style>
      </head>
      <body>
        <div class="header-section">
          ${logoHTMLForPrint}
          <div class="title-area">
            <div style="text-align:left;">
              <h1 class="report-title">Inventory Restock</h1>
              <p style="margin:4px 0 0;font-weight:500;color:#6b7280;font-size:14px;">Status Report</p>
            </div>
            <div class="report-meta">
              <div>Total Items: ${items.length}</div>
              <div>Generated: ${printDate}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:5%;text-align:center;">#</th>
              <th style="width:30%">Product Name</th>
              <th style="width:15%;text-align:right;">Current Stock</th>
              <th style="width:15%;text-align:right;">Min. Level</th>
              <th style="width:15%;text-align:center;">Status</th>
              <th style="width:20%;text-align:right;">Action / Required</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>

        <div class="summary-container" style="justify-content:center; align-items:center; background:#fef2f2; border:1px solid #fecaca;">
          <div style="text-align:center;">
            <div style="font-size:14px;font-weight:600;color:#991b1b;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;">Critical Attention Required</div>
            <div style="font-size:24px;font-weight:800;color:#dc2626;">${lowStockCount} Items Low on Stock</div>
          </div>
        </div>

        <div class="signatures">
          <div class="sig-line">
            <div style="margin-top:50px;">Manager Signature</div>
          </div>
          <div class="sig-line">
            <div style="margin-top:50px;">Date & Time</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[400px] text-center">
        <DialogHeader>
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Printer className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Print Restock List</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-muted-foreground mb-4">
            You are about to generate an inventory restock report highlighting low stock items.
          </p>

          <div className="bg-muted/50 p-4 rounded-lg flex justify-between items-center text-sm border border-border">
            <span>Total Items Tracked:</span>
            <span className="font-bold">{items.length}</span>
          </div>
          <div className="bg-red-50 p-4 rounded-lg flex justify-between items-center text-sm border border-red-100 mt-2">
            <span className="text-red-700">Low Stock Items:</span>
            <span className="font-bold text-red-700 text-lg">{lowStockCount}</span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 w-full mt-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:flex-1">
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button onClick={handlePrint} className="w-full sm:flex-1 bg-primary">
            <Printer className="h-4 w-4 mr-2" /> Print Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
