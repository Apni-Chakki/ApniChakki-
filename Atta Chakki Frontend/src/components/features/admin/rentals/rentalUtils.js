import { sendWhatsAppMessage } from '../../../../utils/whatsappHelper';

export const getOverdueDays = (rental) => {
  if (!rental) return 0;
  if (rental.overdue_days) return parseInt(rental.overdue_days);
  const today = new Date();
  const endDate = new Date(rental.rental_end_date);
  const diff = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

export const getDaysRemaining = (rental) => {
  if (!rental) return 0;
  if (rental.days_remaining) return parseInt(rental.days_remaining);
  const today = new Date();
  const endDate = new Date(rental.rental_end_date);
  const diff = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

export const mapRentalToOrder = (rental) => {
  const isOverdue = rental.status === 'overdue';
  const overdueDays = getOverdueDays(rental);
  const runningPenalty = isOverdue
    ? overdueDays * parseFloat(rental.late_penalty_per_day || 0)
    : 0;

  const totalAmount =
    parseFloat(rental.total_rental_amount || 0) +
    parseFloat(rental.security_deposit || 0) +
    runningPenalty;

  return {
    id: `RENTAL-${rental.id}`,
    createdAt: rental.created_at || rental.rental_start_date,
    customerName: rental.customer_name,
    phone: rental.customer_phone,
    deliveryAddress: rental.customer_address,
    paymentMethod: rental.payment_method || 'cash',
    paymentStatus:
      parseFloat(rental.amount_paid || 0) >= totalAmount
        ? 'paid'
        : parseFloat(rental.amount_paid || 0) > 0
        ? 'partial'
        : 'unpaid',
    total: totalAmount,
    advancePayment: parseFloat(rental.amount_paid || 0),
    status:
      rental.status === 'overdue'
        ? 'ready'
        : rental.status === 'returned'
        ? 'completed'
        : 'processing',
    items: [
      {
        name: rental.product_name,
        isRental: true,
        quantity: rental.quantity || 1,
        rental_days: rental.rental_days,
        rental_price_per_day: rental.rental_price_per_day,
        security_deposit: rental.security_deposit,
        runningPenalty: runningPenalty,
        rental_start_date: rental.rental_start_date,
        rental_end_date: rental.rental_end_date,
        price_at_purchase: rental.rental_price_per_day,
        unit: 'unit',
      },
    ],
  };
};

export const generateWhatsAppReminder = (rental) => {
  let phone = (rental.customer_phone || '').replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '92' + phone.substring(1);
  else if (!phone.startsWith('92')) phone = '92' + phone;

  const isOverdue = rental.status === 'overdue';
  const overdueDays = getOverdueDays(rental);
  const runningPenalty = isOverdue
    ? overdueDays * parseFloat(rental.late_penalty_per_day || 0)
    : 0;
  const remainingBalance =
    parseFloat(rental.total_rental_amount || 0) +
    parseFloat(rental.security_deposit || 0) -
    parseFloat(rental.amount_paid || 0);

  const title = isOverdue
    ? `🚨 *RENTAL OVERDUE NOTICE* 🚨\n⚠️ *YOUR RENTAL IS OVERDUE BY ${overdueDays} DAY${
        overdueDays !== 1 ? 'S' : ''
      }!*`
    : `⏰ *RENTAL RETURN REMINDER* ⏰`;

  const statusSection = isOverdue
    ? `• Overdue Days: ${overdueDays} day(s)\n• Running Penalty: Rs. ${parseInt(
        runningPenalty
      ).toLocaleString()}`
    : `• Days Remaining: ${getDaysRemaining(rental)} day(s)`;

  const message = `*SUCHI CHAKKI* 🌾
───────────────────────────
Hello *${rental.customer_name}*! 👋

${title}

Your rental of *${rental.product_name}* is due for return on *${new Date(
    rental.rental_end_date
  ).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}*.

📋 *Rental Details:*
• Item: ${rental.product_name}
• Quantity: ${rental.quantity || 1}
• Rental ID: #${rental.id}
• Start Date: ${new Date(rental.rental_start_date).toLocaleDateString()}
• End Date: ${new Date(rental.rental_end_date).toLocaleDateString()}
${statusSection}
📍 *Delivery/Pickup Address:* ${rental.customer_address || 'Provided Address'}

💰 *PRICING BREAKDOWN:*
• Rental Rate: Rs. ${parseInt(rental.rental_price_per_day).toLocaleString()}/day
• Total Rental (${rental.rental_days} days): Rs. ${parseInt(
    rental.total_rental_amount || 0
  ).toLocaleString()}
• Security Deposit: Rs. ${parseInt(rental.security_deposit || 0).toLocaleString()}
• Advance Paid: Rs. ${parseInt(rental.amount_paid || 0).toLocaleString()}
• Remaining Dues: Rs. ${parseInt(remainingBalance).toLocaleString()}
${
  isOverdue
    ? `• Total Amount Payable (with penalty): Rs. ${parseInt(
        remainingBalance + runningPenalty
      ).toLocaleString()}`
    : ''
}

⚠️ Late return penalty: Rs. ${parseInt(rental.late_penalty_per_day).toLocaleString()}/day

Please return the item promptly or contact us to extend your rental.

Thank you! 🙏
Suchi Chakki - Fresh Flour Daily`.trim();

  sendWhatsAppMessage(phone, message);
};
