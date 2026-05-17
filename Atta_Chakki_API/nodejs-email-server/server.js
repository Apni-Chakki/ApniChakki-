const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service error:', error);
  } else {
    console.log('✅ Email service ready to send emails');
  }
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Email Server is running', timestamp: new Date() });
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🔴 Server Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════╗
║    🌾 Atta Chakki Email Server    ║
║    Running on port ${PORT}          ║
║    Node env: ${process.env.NODE_ENV}          ║
╚════════════════════════════════════╝
  `);
});

module.exports = app;
