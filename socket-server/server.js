// live tracking k liye socket server hai ye

/* Express or Nodemailer imports */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { createServer } = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors()); // Allow requests from any origin
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const httpServer = createServer(app);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📨 Nodemailer Setup
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: (process.env.SMTP_PORT === '465'), // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER || 'apnichakki897@gmail.com',
    pass: process.env.SMTP_PASS || 'otlg jyzi fvxi ucbi'
  },
  tls: {
    rejectUnauthorized: false
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service error:', error);
  } else {
    console.log('✅ Email service ready to send emails');
  }
});


// 1. Order Confirmation Email
app.post('/send-order-confirmation', async (req, res) => {
  try {
    const { customerEmail, customerName, orderId, orderItems, totalPrice, deliveryAddress } = req.body;

    if (!customerEmail || !customerName || !orderId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const itemsHTML = orderItems.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">Rs. ${item.price}</td>
      </tr>
    `).join('');

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px; }
          .header { background-color: #8B7355; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: white; padding: 20px; }
          .order-id { font-size: 24px; font-weight: bold; color: #8B7355; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          table th { background-color: #f0f0f0; padding: 10px; text-align: left; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
          .button { background-color: #8B7355; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌾 Atta Chakki</h1>
            <p>Order Confirmation</p>
          </div>
          
          <div class="content">
            <p>السلام علیکم، <strong>${customerName}</strong></p>
            <p>Thank you for your order! Here are your order details:</p>
            
            <div class="order-id">Order ID: #${orderId}</div>
            
            <h3>Order Items:</h3>
            <table>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
              </tr>
              ${itemsHTML}
            </table>
            
            <h3>Total: Rs. ${totalPrice}</h3>
            
            ${deliveryAddress ? `
              <h3>Delivery Address:</h3>
              <p>${deliveryAddress}</p>
            ` : ''}
            
            <p>Your order will be delivered soon. Track your order using the order ID above.</p>
            
            <a href="http://localhost:5173/track-order/${orderId}" class="button">Track Your Order</a>
            
            <div class="footer">
              <p>Thank you for choosing Atta Chakki!</p>
              <p>📞 Contact: +92-XXX-XXXXXXX</p>
              <p>&copy; 2024 Atta Chakki. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: customerEmail,
      subject: `Order Confirmation - Order #${orderId}`,
      html: htmlTemplate,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Order confirmation email sent:', info.response);
    
    res.json({ 
      success: true, 
      message: 'Order confirmation email sent successfully',
      messageId: info.messageId 
    });

  } catch (error) {
    console.error('❌ Error sending order confirmation email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send email', 
      error: error.message 
    });
  }
});

// 2. Contact Form Email
app.post('/send-contact-email', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Send to admin
    const adminHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #8B7355; color: white; padding: 15px; border-radius: 5px; }
          .content { background-color: #f9f9f9; padding: 15px; margin-top: 15px; }
          .field { margin: 10px 0; }
          .label { font-weight: bold; color: #8B7355; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Contact Form Submission</h2>
          </div>
          <div class="content">
            <div class="field">
              <span class="label">Name:</span> ${name}
            </div>
            <div class="field">
              <span class="label">Email:</span> ${email}
            </div>
            <div class="field">
              <span class="label">Phone:</span> ${phone || 'Not provided'}
            </div>
            <div class="field">
              <span class="label">Subject:</span> ${subject}
            </div>
            <div class="field">
              <span class="label">Message:</span><br>
              ${message}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send confirmation to customer
    const customerHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #8B7355; color: white; padding: 20px; text-align: center; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌾 Atta Chakki</h1>
          </div>
          <p>السلام علیکم ${name},</p>
          <p>Thank you for contacting Atta Chakki. We have received your message and will get back to you soon.</p>
          <p><strong>Reference Subject:</strong> ${subject}</p>
          <p>Best regards,<br>Atta Chakki Team</p>
        </div>
      </body>
      </html>
    `;

    // Send to admin
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: process.env.EMAIL_FROM, // Admin email
      subject: `New Contact: ${subject}`,
      html: adminHTML,
      replyTo: email,
    });

    // Send confirmation to customer
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'We received your message',
      html: customerHTML,
    });

    console.log('✅ Contact emails sent successfully');
    res.json({ success: true, message: 'Contact emails sent successfully' });

  } catch (error) {
    console.error('❌ Error sending contact emails:', error);
    res.status(500).json({ success: false, message: 'Failed to send emails', error: error.message });
  }
});

// 3. Password Reset Email
app.post('/send-password-reset', async (req, res) => {
  try {
    const { email, name, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Missing required fields (email, otp)' });
    }

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f0eb; margin: 0; padding: 20px; }
          .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #8b6f47 0%, #6d5635 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .body { padding: 30px; }
          .otp-box { background: #f5f0eb; border: 2px dashed #8b6f47; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 36px; font-weight: 700; color: #8b6f47; letter-spacing: 8px; margin: 10px 0; }
          .footer { padding: 20px 30px; background: #faf8f5; text-align: center; color: #999; font-size: 12px; }
          p { color: #444; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌾 Atta Chakki</h1>
          </div>
          <div class="body">
            <p>Assalam o Alaikum <strong>${name || 'User'}</strong>,</p>
            <p>You requested a password reset. Use the following OTP to reset your password:</p>
            <div class="otp-box">
                <p style="margin:0;color:#666;font-size:14px;">Your Verification Code</p>
                <div class="otp-code">${otp}</div>
                <p style="margin:0;color:#999;font-size:12px;">Valid for 10 minutes</p>
            </div>
            <p>If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>&copy; Atta Chakki - Fresh Atta, Delivered to Your Door</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Apni Chakki - Password Reset OTP',
      html: htmlTemplate,
    });

    console.log('✅ Password reset OTP email sent');
    res.json({ success: true, message: 'Password reset email sent successfully' });

  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});

// 4. Welcome Email (for new registrations)
app.post('/send-welcome-email', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #8B7355; color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .features { margin: 20px 0; }
          .feature { margin: 10px 0; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #8B7355; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌾 Welcome to Atta Chakki</h1>
          </div>
          
          <p>السلام علیکم ${name},</p>
          <p>Welcome to Atta Chakki! We're excited to have you as part of our family.</p>
          
          <div class="features">
            <h3>What you can do now:</h3>
            <div class="feature">📦 Place orders for quality atta and flour</div>
            <div class="feature">🚚 Track your deliveries in real-time</div>
            <div class="feature">💬 Leave reviews and feedback</div>
            <div class="feature">📞 Contact us anytime for support</div>
          </div>
          
          <p>Start exploring and enjoy amazing deals!</p>
          <p>Best regards,<br>Atta Chakki Team</p>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Welcome to Atta Chakki!',
      html: htmlTemplate,
    });

    console.log('✅ Welcome email sent');
    res.json({ success: true, message: 'Welcome email sent successfully' });

  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});

// 5. Contact Form Reply Email
app.post('/send-contact-reply', async (req, res) => {
  try {
    const { customerEmail, customerName, originalSubject, originalMessage, replyMessage } = req.body;

    if (!customerEmail || !replyMessage) {
      return res.status(400).json({ success: false, message: 'Missing required fields (customerEmail, replyMessage)' });
    }

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px; }
          .header { background-color: #8B7355; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: white; padding: 25px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
          .quote-box { background-color: #f5f0eb; border-left: 4px solid #8B7355; padding: 15px; margin: 15px 0; border-radius: 4px; font-style: italic; }
          .reply-box { background-color: #fcf8f2; border: 1px solid #e8d8c8; padding: 20px; margin: 20px 0; border-radius: 6px; }
          .footer { text-align: center; color: #888; font-size: 12px; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🌾 Atta Chakki</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Response to Your Inquiry</p>
          </div>
          
          <div class="content">
            <p>السلام علیکم <strong>${customerName || 'Customer'}</strong>,</p>
            <p>Thank you for reaching out to us. Here is the response to your message regarding <strong>"${originalSubject || 'Contact Inquiry'}"</strong>:</p>
            
            <div class="reply-box">
              <h4 style="margin-top: 0; color: #8B7355; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Our Reply:</h4>
              <p style="margin: 0; font-size: 15px; white-space: pre-wrap;">${replyMessage}</p>
            </div>

            ${originalMessage ? `
              <h4 style="margin-bottom: 5px; color: #666; font-size: 13px;">Your Original Message:</h4>
              <div class="quote-box">
                <p style="margin: 0; font-size: 14px; color: #555; white-space: pre-wrap;">${originalMessage}</p>
              </div>
            ` : ''}
            
            <p style="margin-top: 25px;">If you have any further questions or need additional assistance, feel free to reply directly to this email.</p>
            <p style="margin-bottom: 0;">Best regards,<br><strong>Atta Chakki Team</strong></p>
            
            <div class="footer">
              <p style="margin: 5px 0;">Thank you for choosing Atta Chakki!</p>
              <p style="margin: 5px 0;">📞 Contact: +92-XXX-XXXXXXX</p>
              <p style="margin: 5px 0;">&copy; 2026 Atta Chakki. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: customerEmail,
      subject: `RE: ${originalSubject || 'Your Inquiry to Atta Chakki'}`,
      html: htmlTemplate,
    });

    console.log('✅ Contact reply email sent to:', customerEmail);
    res.json({ success: true, message: 'Reply email sent successfully' });

  } catch (error) {
    console.error('❌ Error sending contact reply email:', error);
    res.status(500).json({ success: false, message: 'Failed to send reply email', error: error.message });
  }
});

// 6. Payment Rejection Email
app.post('/send-payment-rejection', async (req, res) => {
  try {
    const { customerEmail, customerName, orderId, amount, transactionId, reason } = req.body;

    if (!customerEmail || !orderId) {
      return res.status(400).json({ success: false, message: 'Missing required fields (customerEmail, orderId)' });
    }

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #faf7f2; margin: 0; padding: 20px; color: #333; }
          .container { max-width: 550px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e8dcc4; }
          .header { background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%); padding: 25px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
          .header p { margin: 5px 0 0 0; opacity: 0.9; font-size: 14px; }
          .body { padding: 30px; line-height: 1.6; }
          .alert-box { background-color: #ffebee; border-left: 4px solid #c62828; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .alert-title { font-weight: bold; color: #c62828; margin-bottom: 5px; font-size: 15px; }
          .alert-reason { font-size: 14px; color: #b71c1c; font-style: italic; }
          .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #fafafa; border-radius: 6px; overflow: hidden; border: 1px solid #eee; }
          .details-table td { padding: 12px 15px; border-bottom: 1px solid #eee; font-size: 14px; }
          .details-table td.label { color: #666; width: 40%; font-weight: 500; }
          .details-table td.value { font-weight: 600; text-align: right; }
          .footer { padding: 20px 30px; background: #fdfbf7; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #f0e6d2; }
          .urdu-text { direction: rtl; text-align: right; font-family: 'Nafees', Arial, sans-serif; margin-top: 15px; border-top: 1px dashed #e0d0b0; padding-top: 15px; line-height: 1.8; }
          p { margin: 0 0 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Apni Chakki - Payment Rejected ❌</h1>
            <p>Verification Alert / ادائیگی کی تصدیق کا مسئلہ</p>
          </div>
          
          <div class="body">
            <p>Assalam-o-Alaikum <strong>${customerName || 'Customer'}</strong>,</p>
            <p>We regret to inform you that your direct bank transfer payment for <strong>Order #${orderId}</strong> could not be verified by our accounts department and has been rejected. As a result, <strong>your order has been converted to Cash on Delivery (COD)</strong>. Please pay the order total in cash when the rider delivers your package.</p>
            
            <div class="alert-box">
              <div class="alert-title">⚠️ Reason for Rejection / مسترد ہونے کی وجہ:</div>
              <div class="alert-reason">${reason || 'Incorrect transaction reference or amount not received.'}</div>
            </div>

            <table class="details-table">
              <tr>
                <td class="label">Order ID:</td>
                <td class="value">#${orderId}</td>
              </tr>
              <tr>
                <td class="label">Amount:</td>
                <td class="value" style="color: #c62828;">Rs. ${amount ? parseFloat(amount).toLocaleString() : 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Transaction ID:</td>
                <td class="value" style="font-family: monospace; font-size: 13px;">${transactionId || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Payment Method:</td>
                <td class="value" style="color: #1b5e20; font-weight: bold;">CASH ON DELIVERY (COD)</td>
              </tr>
              <tr>
                <td class="label">Payment Status:</td>
                <td class="value" style="color: #c62828; font-weight: bold;">UNPAID (Pay Cash on Delivery)</td>
              </tr>
            </table>

            <p>You do not need to resubmit payment online. Your order will be delivered to your address shortly, and you can pay the amount in cash to our delivery rider.</p>
            
            <div class="urdu-text">
              <p><strong>محترم کسٹمر،</strong></p>
              <p>ہمیں افسوس کے ساتھ مطلع کرنا پڑ رہا ہے کہ آپ کے آرڈر <strong>#${orderId}</strong> کی بینک ٹرانسفر ادائیگی کی تصدیق نہیں ہو سکی اور اسے مسترد کر دیا گیا ہے۔</p>
              <p>تصدیق نہ ہونے پر <strong>آپ کا آرڈر اب کیش آن ڈلیوری (Cash on Delivery) پر منتقل کر دیا گیا ہے</strong>۔ اب آپ کو کسی قسم کی آن لائن ادائیگی کی ضرورت نہیں ہے۔ برائے مہربانی آرڈر وصول کرتے وقت Rs. ${amount ? parseFloat(amount).toLocaleString() : 'N/A'} کیش ہمارے رائڈر کو ادا کریں۔ شکریہ۔</p>
            </div>
          </div>
          
          <div class="footer">
            <p>🌾 Apni Chakki - Pure Atta & Grains, Delivered Fresh</p>
            <p>📞 Helpline: +92 3228483029</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: customerEmail,
      subject: `🔴 Payment Rejected - Order #${orderId}`,
      html: htmlTemplate,
    });

    console.log('✅ Payment rejection email sent successfully to:', customerEmail);
    res.json({ success: true, message: 'Payment rejection email sent successfully' });

  } catch (error) {
    console.error('❌ Error sending payment rejection email:', error);
    res.status(500).json({ success: false, message: 'Failed to send payment rejection email', error: error.message });
  }
});




// 7. Order Status Update Email
app.post('/send-order-status-update', async (req, res) => {
  try {
    const { customerEmail, customerName, orderId, newStatus, cancellationReason } = req.body;

    if (!customerEmail || !orderId || !newStatus) {
      return res.status(400).json({ success: false, message: 'Missing required fields (customerEmail, orderId, newStatus)' });
    }

    const statusMap = {
      'pending': 'Pending / زیر التواء',
      'processing': 'Processing / تیاری جاری ہے',
      'ready': 'Ready for Delivery / ڈیلیوری کے لیے تیار',
      'batch_ready': 'Ready for Delivery / ڈیلیوری کے لیے تیار',
      'out-for-delivery': 'Out for Delivery / ڈیلیوری کے لیے روانہ',
      'completed': 'Delivered & Completed / ڈیلیور ہو گیا',
      'cancelled': 'Cancelled / منسوخ شدہ',
      'scheduled-tomorrow': 'Scheduled for Tomorrow / کل کے لیے شیڈول',
      'pickup_pending': 'Pending Pickup / پک اپ کا انتظار',
      'coming_for_pickup': 'Rider Coming for Pickup / رائڈر پک اپ کے لیے آ رہا ہے',
      'arrived_at_shop': 'Arrived at Shop / دکان پر پہنچ گیا'
    };

    const displayStatus = statusMap[newStatus] || newStatus;
    const isCancelled = newStatus === 'cancelled';
    const headerColor = isCancelled ? '#d32f2f' : '#8B7355';

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #faf7f2; margin: 0; padding: 20px; color: #333; }
          .container { max-width: 550px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e8dcc4; }
          .header { background: ${headerColor}; padding: 25px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
          .header p { margin: 5px 0 0 0; opacity: 0.9; font-size: 14px; }
          .body { padding: 30px; line-height: 1.6; }
          .status-box { background-color: #fcf8f2; border-left: 4px solid ${headerColor}; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 16px; font-weight: bold; }
          .footer { padding: 20px 30px; background: #fdfbf7; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #f0e6d2; }
          .urdu-text { direction: rtl; text-align: right; font-family: Arial, sans-serif; margin-top: 15px; border-top: 1px dashed #e0d0b0; padding-top: 15px; line-height: 1.8; }
          p { margin: 0 0 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌾 Apni Chakki - Order Update</h1>
            <p>Order Status Changed / آرڈر کی تازہ ترین صورتحال</p>
          </div>
          
          <div class="body">
            <p>Assalam-o-Alaikum <strong>${customerName || 'Customer'}</strong>,</p>
            <p>Your order <strong>#${orderId}</strong> status has been updated.</p>
            
            <div class="status-box">
              New Status: ${displayStatus}
            </div>

            ${isCancelled ? `
              <p style="color: #d32f2f; font-weight: bold;">Reason for Cancellation / منسوخی کی وجہ:</p>
              <p style="font-style: italic; color: #666;">${cancellationReason || 'Not specified / وجہ نہیں بتائی گئی'}</p>
            ` : ''}

            <p>You can track your order status in real-time by logging into your account or clicking the button below:</p>
            <p style="text-align: center; margin: 25px 0;">
              <a href="http://localhost:5173/track-order/${orderId}" style="background-color: #8B7355; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Track Your Order</a>
            </p>

            <div class="urdu-text">
              <p><strong>محترم کسٹمر،</strong></p>
              <p>آپ کے آرڈر نمبر <strong>#${orderId}</strong> کا اسٹیٹس اپ ڈیٹ کر دیا گیا ہے۔</p>
              <p>نیا اسٹیٹس: <strong>${displayStatus}</strong></p>
              ${isCancelled ? `<p>آرڈر منسوخ ہونے کی وجہ: <em>${cancellationReason || 'معلوم نہیں'}</em></p>` : ''}
              <p>براہ کرم اپنے آرڈر کو ٹریک کرنے کے لیے اوپر دیے گئے بٹن پر کلک کریں۔ شکریہ۔</p>
            </div>
          </div>
          
          <div class="footer">
            <p>🌾 Apni Chakki - Pure Atta & Grains, Delivered Fresh</p>
            <p>&copy; 2026 Apni Chakki. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: customerEmail,
      subject: `Order Status Update - Order #${orderId}`,
      html: htmlTemplate,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Order status update email sent:', info.response);
    res.json({ success: true, message: 'Order status update email sent successfully', messageId: info.messageId });

  } catch (error) {
    console.error('❌ Error sending order status update email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});



// 8. VIP Promotion Congratulations Email
app.post('/send-vip-congratulations', async (req, res) => {
  try {
    const { customerEmail, customerName, vipDiscount, vipFreeShipping } = req.body;

    if (!customerEmail || !customerName) {
      return res.status(400).json({ success: false, message: 'Missing required fields (customerEmail, customerName)' });
    }

    const discountTextEN = vipDiscount ? 'Active (10% Discount on Every Order)' : 'Inactive';
    const shippingTextEN = vipFreeShipping ? 'Active (Free Delivery on Every Order)' : 'Inactive';
    
    const discountTextUR = vipDiscount ? 'فعال (ہر آرڈر پر %10 رعایت)' : 'غیر فعال';
    const shippingTextUR = vipFreeShipping ? 'فعال (ہر آرڈر پر مفت ڈلیوری)' : 'غیر فعال';

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #faf7f2; margin: 0; padding: 20px; color: #333; }
          .container { max-width: 550px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e8dcc4; }
          .header { background: linear-gradient(135deg, #8b6f47 0%, #6d5635 100%); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .header p { margin: 5px 0 0 0; opacity: 0.9; font-size: 14px; }
          .body { padding: 30px; line-height: 1.6; }
          .privileges-list { background-color: #fcf8f2; border: 1px solid #e8d8c8; padding: 20px; margin: 20px 0; border-radius: 8px; list-style-type: none; }
          .privileges-list li { margin-bottom: 10px; font-size: 15px; font-weight: 500; display: flex; align-items: center; gap: 8px; }
          .privileges-list li::before { content: "🌟 "; }
          .footer { padding: 20px 30px; background: #fdfbf7; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #f0e6d2; }
          .urdu-text { direction: rtl; text-align: right; font-family: Arial, sans-serif; margin-top: 15px; border-top: 1px dashed #e0d0b0; padding-top: 15px; line-height: 1.8; }
          p { margin: 0 0 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌾 Congratulations / مبارک ہو!</h1>
            <p>You are now a VIP Customer / آپ اب ہمارے وی آئی پی کسٹمر ہیں</p>
          </div>
          
          <div class="body">
            <p>Assalam-o-Alaikum <strong>${customerName}</strong>,</p>
            <p>We are delighted to promote you to a <strong>VIP Customer</strong> at Apni Chakki! As a token of our appreciation for your loyalty, we have enabled special privileges on your account.</p>
            
            <h3>Your VIP Privileges:</h3>
            <ul class="privileges-list" style="padding-left: 20px;">
              <li><strong>10% Overall Discount:</strong> <span style="color: ${vipDiscount ? '#2e7d32' : '#c62828'};">${discountTextEN}</span></li>
              <li><strong>Free Shipping / Delivery:</strong> <span style="color: ${vipFreeShipping ? '#2e7d32' : '#c62828'};">${shippingTextEN}</span></li>
            </ul>

            <p>These benefits will be automatically applied to your account when you log in and place an order on our app/website.</p>

            <div class="urdu-text">
              <p><strong>محترم کسٹمر،</strong></p>
              <p>ہم آپ کو اپنی چکی پر <strong>وی آئی پی (VIP) کسٹمر</strong> بننے پر مبارکباد پیش کرتے ہیں! آپ کی محبت اور وفاداری کے اعتراف میں، ہم نے آپ کے اکاؤنٹ پر خصوصی مراعات فعال کر دی ہیں۔</p>
              <p><strong>آپ کی وی آئی پی مراعات:</strong></p>
              <ul style="list-style-type: none; padding-right: 0; margin: 10px 0;">
                <li style="margin-bottom: 8px;">⭐ <strong>%10 ڈسکاؤنٹ:</strong> <strong style="color: ${vipDiscount ? '#2e7d32' : '#c62828'};">${discountTextUR}</strong></li>
                <li style="margin-bottom: 8px;">⭐ <strong>مفت ڈیلیوری:</strong> <strong style="color: ${vipFreeShipping ? '#2e7d32' : '#c62828'};">${shippingTextUR}</strong></li>
              </ul>
              <p>جب بھی آپ لاگ ان کر کے آرڈر کریں گے، یہ مراعات آپ کے آرڈر پر خود بخود لاگو ہو جائیں گی۔</p>
            </div>
          </div>
          
          <div class="footer">
            <p>🌾 Apni Chakki - Premium Quality Flour, Delivered with Care</p>
            <p>📞 Helpline: +92 3228483029</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: customerEmail,
      subject: '🌾 Congratulations! You are now an Apni Chakki VIP Customer',
      html: htmlTemplate,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ VIP Congratulations email sent to:', customerEmail, info.response);
    res.json({ success: true, message: 'VIP Congratulations email sent successfully', messageId: info.messageId });

  } catch (error) {
    console.error('❌ Error sending VIP Congratulations email:', error);
    res.status(500).json({ success: false, message: 'Failed to send VIP email', error: error.message });
  }
});



app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeConnections: io.engine ? io.engine.clientsCount : 0,
    activeDrivers: Object.keys(activeDrivers).length,
    timestamp: new Date().toISOString()
  });
});



app.use((err, req, res, next) => {
  console.error('🔴 Server Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});



const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 10000,
  pingInterval: 5000,
  transports: ['websocket', 'polling']
});

// driver aur watchers ka data yahan save hoga
const activeDrivers = {};
const orderRooms = {};

// jab koi naya banda connect ho
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // driver apni location bhej raha hai
  socket.on('driver:location_update', (data) => {
    const { order_id, latitude, longitude, heading, speed, driver_name, accuracy } = data;

    if (!order_id || latitude == null || longitude == null) {
      socket.emit('error', { message: 'Missing required fields: order_id, latitude, longitude' });
      return;
    }

    // nai location save kar rahe han
    activeDrivers[order_id] = {
      order_id,
      latitude,
      longitude,
      heading: heading || 0,
      speed: speed || 0,
      accuracy: accuracy || 0,
      driver_name: driver_name || 'Driver',
      lastUpdate: Date.now(),
      socketId: socket.id
    };

    // sab ko location bhej rahe han jo dekh rahe han
    const roomName = `order_${order_id}`;
    io.to(roomName).emit('tracking:location_update', {
      order_id,
      latitude,
      longitude,
      heading: heading || 0,
      speed: speed || 0,
      accuracy: accuracy || 0,
      driver_name: driver_name || 'Driver',
      timestamp: Date.now()
    });

    // admin ko bhi bata rahe han driver kahan hai
    io.to('admin_tracking').emit('tracking:driver_moved', {
      order_id,
      latitude,
      longitude,
      heading: heading || 0,
      speed: speed || 0,
      driver_name: driver_name || 'Driver',
      timestamp: Date.now()
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`📍 Driver [${driver_name}] Order #${order_id}: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} | heading: ${(heading || 0).toFixed(0)}° | speed: ${(speed || 0).toFixed(1)} m/s`);
    }
  });

  // jab delivery ho jaye
  socket.on('driver:delivery_completed', (data) => {
    const { order_id, driver_name } = data;
    const roomName = `order_${order_id}`;

    io.to(roomName).emit('tracking:delivery_completed', {
      order_id,
      driver_name,
      timestamp: Date.now()
    });

    io.to('admin_tracking').emit('tracking:delivery_completed', {
      order_id,
      driver_name,
      timestamp: Date.now()
    });

    delete activeDrivers[order_id];
    console.log(`✅ Delivery completed: Order #${order_id} by ${driver_name}`);
  });

  // customer order track karna chahta hai
  socket.on('tracking:subscribe', (data) => {
    const { order_id } = data;
    if (!order_id) return;

    const roomName = `order_${order_id}`;
    socket.join(roomName);

    if (!orderRooms[order_id]) orderRooms[order_id] = new Set();
    orderRooms[order_id].add(socket.id);

    console.log(`👀 Customer ${socket.id} watching Order #${order_id} (${orderRooms[order_id].size} watchers)`);

    // agar driver online hai to location bhej do
    if (activeDrivers[order_id]) {
      socket.emit('tracking:location_update', {
        ...activeDrivers[order_id],
        timestamp: activeDrivers[order_id].lastUpdate
      });
    }
  });

  // customer ne tracking band kar di
  socket.on('tracking:unsubscribe', (data) => {
    const { order_id } = data;
    if (!order_id) return;

    const roomName = `order_${order_id}`;
    socket.leave(roomName);

    if (orderRooms[order_id]) {
      orderRooms[order_id].delete(socket.id);
      if (orderRooms[order_id].size === 0) delete orderRooms[order_id];
    }
  });

  // admin tracking dekhne aaya hai
  socket.on('admin:subscribe', () => {
    socket.join('admin_tracking');
    console.log(`🔑 Admin ${socket.id} joined admin_tracking`);

    // send all active drivers
    socket.emit('admin:active_drivers', {
      drivers: Object.values(activeDrivers),
      count: Object.keys(activeDrivers).length
    });
  });

  // active drivers ki list nikal rahe han
  socket.on('tracking:get_active_drivers', () => {
    socket.emit('admin:active_drivers', {
      drivers: Object.values(activeDrivers),
      count: Object.keys(activeDrivers).length
    });
  });

  // jab koi chala jaye (disconnect)
  socket.on('disconnect', (reason) => {
    console.log(`❌ Client disconnected: ${socket.id} (${reason})`);

    for (const [orderId, driver] of Object.entries(activeDrivers)) {
      if (driver.socketId === socket.id) {
        console.log(`🚫 Driver disconnected for Order #${orderId}`);
        io.to(`order_${orderId}`).emit('tracking:driver_offline', {
          order_id: orderId,
          timestamp: Date.now()
        });
      }
    }

    for (const [orderId, watchers] of Object.entries(orderRooms)) {
      watchers.delete(socket.id);
      if (watchers.size === 0) delete orderRooms[orderId];
    }
  });
});

// har 30 second baad puray drivers ko saaf kar rahe han
setInterval(() => {
  const now = Date.now();
  const STALE_THRESHOLD = 2 * 60 * 1000;

  for (const [orderId, driver] of Object.entries(activeDrivers)) {
    if (now - driver.lastUpdate > STALE_THRESHOLD) {
      console.log(`🗑️ Removing stale driver for Order #${orderId} (last update: ${Math.round((now - driver.lastUpdate) / 1000)}s ago)`);
      
      io.to(`order_${orderId}`).emit('tracking:driver_offline', {
        order_id: orderId,
        timestamp: now
      });
      
      delete activeDrivers[orderId];
    }
  }
}, 30000);

// server start kar rahe han
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  🚚 Apni Chakki Tracking Server                      ║
║  ──────────────────────────────────────────────────── ║
║  Socket.io server running on port ${PORT}              ║
║  Health check: http://localhost:${PORT}/health          ║
║  Ready for real-time delivery tracking!               ║
╚═══════════════════════════════════════════════════════╝
  `);
});