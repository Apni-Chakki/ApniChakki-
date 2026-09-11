import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/common/dialog';
import { Button } from '../../components/common/button';
import { Printer, X } from 'lucide-react';
import { format } from 'date-fns';
import { API_BASE_URL } from '../../config';

const LogoSVG = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="32" fill="#8b6f47" />
    <g transform="translate(14, 14) scale(1.5)" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 22 16 8"/>
      <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/>
      <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/>
      <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/>
      <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z"/>
      <path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>
      <path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>
      <path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1 4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>
    </g>
  </svg>
);

export function PrintExpenseReport({ expenses, dateRangeLabel, open, onClose }) {
  const [storeSettings, setStoreSettings] = useState({ name: "SUCHI CHAKKI", address: "", phone: "", tagline: "", logo: "" });

  useEffect(() => {
    if (open) {
      fetch(`${API_BASE_URL}/get_store_settings.php`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.settings) {
            setStoreSettings({
              name: data.settings.storeName || "SUCHI CHAKKI",
              address: data.settings.address || "",
              phone: data.settings.phone || "",
              tagline: data.settings.tagline || "Pure & Fresh Processing",
              logo: data.settings.logo || ""
            });
          }
        })
        .catch(err => console.error("Error fetching store settings:", err));
    }
  }, [open]);

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Calculate summary by category
  const categorySummary = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {});

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
    const logoHTMLForPrint = `
      <div style="display:flex;align-items:center;justify-content:center;gap:14px;padding:5px 0 10px;">
        ${storeSettings.logo ? `
          <img src="${storeSettings.logo}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0;" />
        ` : `
          <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
            <circle cx="32" cy="32" r="32" fill="#8b6f47"/>
            <g transform="translate(14, 14) scale(1.5)" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 22 16 8"/>
              <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/>
              <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/>
              <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/>
              <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z"/>
              <path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>
              <path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>
              <path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1 4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>
            </g>
          </svg>
        `}
        <div>
          <div style="font-size:18px;font-weight:900;letter-spacing:2px;color:#1a1a1a;text-transform:uppercase;">${storeSettings.name}</div>
          <div style="font-size:10px;color:#666;letter-spacing:1px;margin-top:2px;">${storeSettings.tagline}</div>
          <div style="font-size:10px;color:#666;margin-top:1px;">📍 ${storeSettings.address} &nbsp;|&nbsp; 📞 ${storeSettings.phone}</div>
        </div>
      </div>
    `;

    const rowsHTML = expenses.length === 0 
      ? `<tr><td colspan="5" style="text-align:center;padding:12px;color:#666;">No expenses found for this period.</td></tr>`
      : expenses.map(expense => `
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;">${new Date(expense.created_at).toLocaleDateString()}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;font-weight:600;">${expense.category}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;">${expense.description || '-'}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;">${expense.user_name || '-'}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;color:#b91c1c;">Rs. ${Number(expense.amount).toLocaleString()}</td>
          </tr>
        `).join('');

    const summaryHTML = Object.entries(categorySummary).map(([cat, amt]) => `
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;border-bottom:1px dashed #e5e7eb;padding-bottom:4px;">
        <span style="color:#4b5563;">${cat}</span>
        <span style="font-weight:600;">Rs. ${Number(amt).toLocaleString()}</span>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expense Report - ${dateRangeLabel}</title>
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
          .total-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; text-align: center; }
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
              <h1 class="report-title">Expense Report</h1>
              <p style="margin:4px 0 0;font-weight:500;color:#6b7280;font-size:14px;">Period: ${dateRangeLabel}</p>
            </div>
            <div class="report-meta">
              <div>Total Entries: ${expenses.length}</div>
              <div>Generated: ${new Date().toLocaleString()}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:20%">Date</th>
              <th style="width:25%">Category</th>
              <th style="width:30%">Description</th>
              <th style="width:10%">Recorded By</th>
              <th style="width:15%;text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>

        <div class="summary-container">
          <div class="summary-col">
            <h3 style="margin-top:0;margin-bottom:12px;font-size:16px;color:#1f2937;border-bottom:2px solid #e5e7eb;padding-bottom:6px;">Category Breakdown</h3>
            ${summaryHTML}
          </div>
          <div class="summary-col" style="display:flex;flex-direction:column;justify-content:center;">
            <div class="total-box">
              <div style="font-size:14px;font-weight:600;color:#991b1b;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;">Total Expenditure</div>
              <div style="font-size:32px;font-weight:800;color:#dc2626;">Rs. ${Number(totalAmount).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div class="signatures">
          <div class="sig-line">
            <div style="margin-top:50px;">Accountant Signature</div>
          </div>
          <div class="sig-line">
            <div style="margin-top:50px;">Owner Signature</div>
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
          <DialogTitle className="text-xl">Print Expense Report</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-muted-foreground mb-4">
            You are about to generate a professional expense report for <br/>
            <strong className="text-foreground">{dateRangeLabel}</strong>.
          </p>

          <div className="bg-muted/50 p-4 rounded-lg flex justify-between items-center text-sm border border-border">
            <span>Total Entries:</span>
            <span className="font-bold">{expenses.length}</span>
          </div>
          <div className="bg-red-50 p-4 rounded-lg flex justify-between items-center text-sm border border-red-100 mt-2">
            <span className="text-red-700">Total Expenditure:</span>
            <span className="font-bold text-red-700 text-lg">Rs. {totalAmount.toLocaleString()}</span>
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





