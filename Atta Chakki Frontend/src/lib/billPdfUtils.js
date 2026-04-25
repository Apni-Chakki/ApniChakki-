import { jsPDF } from 'jspdf';
import { API_BASE_URL } from '../config';

// getting store info for the pdf
async function fetchBrandSettings() {
  try {
    const res = await fetch(`${API_BASE_URL}/get_store_settings.php`);
    const data = await res.json();
    if (data.success && data.settings) {
      return {
        name: data.settings.storeName || 'MUGHAL ATTA CHAKKI',
        tagline: 'Pure & Fresh Processing',
        address: data.settings.address || 'Main Bazaar, Lahore',
        phone: data.settings.phone || '+92 322 8483029',
      };
    }
  } catch (err) {
    console.error('Error fetching brand settings for PDF:', err);
  }
  return {
    name: 'MUGHAL ATTA CHAKKI',
    tagline: 'Pure & Fresh Processing',
    address: 'Main Bazaar, Lahore',
    phone: '+92 322 8483029',
  };
}

// status label mapping
const getStatusLabel = (status) => {
  if (!status) return 'Unknown';
  const map = {
    pending: 'Pending',
    processing: 'Processing',
    ready: 'Ready for Pickup/Delivery',
    'out-for-delivery': 'Out for Delivery',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return map[status] || String(status);
};

// creating svg logo for pdf
const getLogoDataUrl = () => {
  return new Promise((resolve) => {
    const svg = `<svg width="256" height="256" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="#78350f" />
      <ellipse cx="32" cy="38" rx="16" ry="8" fill="#fef3c7" opacity="0.9" />
      <ellipse cx="32" cy="36" rx="12" ry="6" fill="#f59e0b" opacity="0.8" />
      <line x1="32" y1="44" x2="32" y2="18" stroke="#fef3c7" stroke-width="2" stroke-linecap="round" />
      <ellipse cx="27" cy="28" rx="4" ry="2.5" fill="#fef3c7" transform="rotate(-30 27 28)" />
      <ellipse cx="26" cy="23" rx="4" ry="2.5" fill="#fef3c7" transform="rotate(-25 26 23)" />
      <ellipse cx="37" cy="28" rx="4" ry="2.5" fill="#fef3c7" transform="rotate(30 37 28)" />
      <ellipse cx="38" cy="23" rx="4" ry="2.5" fill="#fef3c7" transform="rotate(25 38 23)" />
      <ellipse cx="32" cy="20" rx="3" ry="4" fill="#fef3c7" />
    </svg>`;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
};

// main pdf generation function
export async function generateBillPDF(order) {
  const BRAND = await fetchBrandSettings();
  const logoData = await getLogoDataUrl();

  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;

  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
  });

  const dateStr = new Date(order.createdAt || Date.now()).toLocaleDateString('en-GB');
  const timeStr = new Date(order.createdAt || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  let y = margin + 10;

  // header with logo
  if (logoData) {
    doc.addImage(logoData, 'PNG', pageW / 2 - 10, y - 10, 20, 20);
  } else {
    doc.setFillColor(120, 53, 15);
    doc.circle(pageW / 2, y, 10, 'F');
  }

  y += 18;
  doc.setFont('courier', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(BRAND.name.toUpperCase(), pageW / 2, y, { align: 'center' });

  y += 5;
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(BRAND.tagline.toUpperCase(), pageW / 2, y, { align: 'center' });

  y += 4;
  doc.text(`Location: ${BRAND.address}  |  Phone: ${BRAND.phone}`, pageW / 2, y, { align: 'center' });

  y += 8;
  doc.setLineWidth(0.5);
  doc.setDrawColor(50, 50, 50);
  doc.setLineDashPattern([2, 1.5], 0);
  doc.line(pageW / 2 - 30, y, pageW / 2 + 30, y);
  doc.setLineDashPattern([], 0);

  y += 8;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  doc.roundedRect(pageW / 2 - 18, y - 5, 36, 7, 1, 1, 'S');
  doc.setFontSize(9);
  doc.setFont('courier', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('ORDER DETAILS', pageW / 2, y, { align: 'center' });

  y += 12;

  // helper to draw section titles
  const drawSectionTitle = (title, cy) => {
    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(title.toUpperCase(), margin, cy);
    doc.setDrawColor(170, 170, 170);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, cy + 2, pageW - margin, cy + 2);
    doc.setLineDashPattern([], 0);
    return cy + 8;
  };

  // helper to draw rows
  const drawRow = (label, value, cy, isBold = false) => {
    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(label, margin, cy);
    if (isBold) doc.setFont('courier', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text(String(value), pageW - margin, cy, { align: 'right' });
    return cy + 6;
  };

  // order info section
  y = drawSectionTitle('Order Information', y);

  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, contentW, 20, 1.5, 1.5, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('ORDER ID', margin + 4, y + 6);
  doc.text('ORDER TYPE', margin + contentW / 2 + 4, y + 6);
  doc.text('DATE & TIME', margin + 4, y + 15);
  doc.text('STATUS', margin + contentW / 2 + 4, y + 15);

  doc.setFont('courier', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(String(order.id).toUpperCase(), margin + 4, y + 10);
  doc.text((order.type || 'pickup').toUpperCase(), margin + contentW / 2 + 4, y + 10);
  doc.text(`${dateStr} ${timeStr}`, margin + 4, y + 19);
  
  doc.setFont('courier', 'bold');
  doc.text(getStatusLabel(order.status).toUpperCase(), margin + contentW / 2 + 4, y + 19);

  y += 28;

  // customer info section
  y = drawSectionTitle('Customer Information', y);
  y = drawRow('Customer Name', order.customerName || 'Walk-in', y, true);
  y = drawRow('Phone Number', order.phone || '—', y, true);

  if (order.deliveryAddress && !order.deliveryAddress.toLowerCase().includes('pickup')) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Delivery Address', margin, y);
    doc.setFont('courier', 'bold');
    doc.setTextColor(20, 20, 20);
    const addrLines = doc.splitTextToSize(order.deliveryAddress, contentW - 50);
    doc.text(addrLines, pageW - margin, y, { align: 'right' });
    y += addrLines.length * 5 + 2;
  }
  y += 4;

  // order items section
  y = drawSectionTitle('Order Items', y);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(130, 130, 130);
  doc.text('ITEM', margin, y);
  doc.text('AMOUNT', pageW - margin, y, { align: 'right' });
  y += 5;

  order.items.forEach((item) => {
    y += 2;
    const name = item.service?.name || item.name || '—';
    const nameLines = doc.splitTextToSize(name, contentW * 0.7);

    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(nameLines, margin, y);

    if (item.isWeightPending) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(217, 119, 6);
      doc.text('** WEIGHT TO BE CONFIRMED **', margin, y + nameLines.length * 4.5);
      doc.setTextColor(40, 40, 40);
      doc.text('TBD', pageW - margin, y, { align: 'right' });
      y += (nameLines.length - 1) * 4.5 + 8;
    } else {
      const price = Number(item.service?.price || item.price_at_purchase || 0);
      const qty = Number(item.quantity || 0);
      const unit = item.service?.unit || '';
      const lineTotal = price * qty;

      doc.text(`Rs.${lineTotal.toLocaleString()}`, pageW - margin, y, { align: 'right' });

      doc.setFont('courier', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      doc.text(`${qty} ${unit} x Rs.${price.toLocaleString()}`, margin, y + 4.5);

      y += nameLines.length > 1 ? (nameLines.length - 1) * 4.5 : 0;
      y += 9;
    }

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, y, pageW - margin, y);
  });

  // totals section
  y += 8;
  doc.setLineDashPattern([], 0);
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  const hasPendingItems = order.items.some(i => i.isWeightPending);
  const total = Number(order.total || 0);
  const advance = Number(order.advancePayment || 0);
  const remainingDue = total - advance;

  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text('SUBTOTAL', margin, y);
  doc.text(`Rs.${total.toLocaleString()}${hasPendingItems ? ' + TBD' : ''}`, pageW - margin, y, { align: 'right' });

  if (advance > 0) {
    y += 7;
    doc.setFont('courier', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(21, 128, 61);
    doc.text('ADVANCE PAID', margin, y);
    doc.text(`- Rs.${advance.toLocaleString()}`, pageW - margin, y, { align: 'right' });
  }

  if (remainingDue > 0) {
    y += 5;
    doc.setLineDashPattern([2, 2], 0);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    doc.setLineDashPattern([], 0);
    y += 8;

    doc.setFont('courier', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(185, 28, 28);
    doc.text('REMAINING DUE', margin, y);
    doc.text(`Rs.${remainingDue.toLocaleString()}`, pageW - margin, y, { align: 'right' });
  }
  y += 8;

  // payment info section
  y = drawSectionTitle('Payment Information', y);

  const pyMethod = order.paymentMethod === 'jazzcash' ? 'JazzCash' : 
                   order.paymentMethod === 'easypaisa' ? 'EasyPaisa' : 
                   order.paymentMethod || 'CASH';
                   
  y = drawRow('Payment Method', pyMethod.toUpperCase(), y, true);
  
  doc.setFont('courier', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Payment Status', margin, y);
  
  doc.setFont('courier', 'bold');
  if (order.paymentStatus === 'paid') {
    doc.setTextColor(21, 128, 61);
    doc.text('PAID', pageW - margin, y, { align: 'right' });
  } else if (order.paymentStatus === 'partial') {
    doc.setTextColor(29, 78, 216);
    doc.text('PARTIAL', pageW - margin, y, { align: 'right' });
  } else {
    doc.setTextColor(217, 119, 6);
    doc.text('UNPAID', pageW - margin, y, { align: 'right' });
  }
  y += 8;

  if (order.paymentStatus !== 'paid' && remainingDue > 0) {
    y += 4;
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentW, 14, 2, 2, 'FD');
    doc.setFont('courier', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(127, 29, 29);
    doc.text(`COLLECT PAYMENT: Rs.${remainingDue.toLocaleString()}${hasPendingItems ? ' (+ TBD)' : ''}`, pageW / 2, y + 9, { align: 'center' });
    y += 18;
  }

  // footer
  y += 8;
  doc.setDrawColor(170, 170, 170);
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(margin, y, pageW - margin, y);
  doc.setLineDashPattern([], 0);

  y += 10;
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(130, 130, 130);
  doc.text(`Printed on: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`, pageW / 2, y, { align: 'center' });
  y += 5;
  doc.text('Thank you for your business!', pageW / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('courier', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text(`${BRAND.name} — ${BRAND.tagline}`, pageW / 2, y, { align: 'center' });

  const filename = `Bill_Order_${String(order.id).slice(-8)}_${dateStr.replace(/\//g, '-')}.pdf`;
  return { doc, filename };
}

// downloading the pdf
export async function downloadBillPDF(order) {
  const { doc, filename } = await generateBillPDF(order);
  doc.save(filename);
  return filename;
}

// getting pdf as data url
export async function generateBillPDFDataUrl(order) {
  const { doc } = await generateBillPDF(order);
  return doc.output('datauristring');
}
