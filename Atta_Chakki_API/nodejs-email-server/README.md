# Atta Chakki Email Server (Nodemailer)

## 📧 Setup Instructions

### 1. Gmail Configuration
- Sign in to your Gmail account
- Go to: https://myaccount.google.com/security
- Enable **2-Step Verification** (if not already enabled)
- Generate **App Password**
- Copy the 16-character app password

### 2. Environment Variables
Update `.env` file with your Gmail credentials:
```
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  (16-character app password)
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Email Server
**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server will run on: `http://localhost:3001`

---

## 📨 API Endpoints

### 1. Send Order Confirmation Email
**POST** `/send-order-confirmation`

```json
{
  "customerEmail": "customer@example.com",
  "customerName": "Abdul Sami",
  "orderId": "ORD-12345",
  "orderItems": [
    {
      "name": "Atta 2kg",
      "quantity": 2,
      "price": "150"
    }
  ],
  "totalPrice": "300",
  "deliveryAddress": "123 Main St, Lahore"
}
```

### 2. Send Contact Form Email
**POST** `/send-contact-email`

```json
{
  "name": "Abdul Sami",
  "email": "customer@example.com",
  "phone": "+92-300-1234567",
  "subject": "Query about your product",
  "message": "I have a question about your atta..."
}
```

### 3. Send Password Reset Email
**POST** `/send-password-reset`

```json
{
  "email": "customer@example.com",
  "name": "Abdul Sami",
  "resetLink": "http://localhost:5173/reset-password?token=xyz123"
}
```

### 4. Send Welcome Email
**POST** `/send-welcome-email`

```json
{
  "email": "customer@example.com",
  "name": "Abdul Sami"
}
```

### 5. Health Check
**GET** `/health`

```json
{
  "status": "Email Server is running",
  "timestamp": "2024-05-16T10:30:00Z"
}
```

---

## 🔗 Integration Examples

### From PHP Backend
```php
// Send order confirmation via email server
$emailServiceUrl = 'http://localhost:3001/send-order-confirmation';

$data = [
    'customerEmail' => $user_email,
    'customerName' => $user_name,
    'orderId' => $order_id,
    'orderItems' => $items,
    'totalPrice' => $total_price,
    'deliveryAddress' => $delivery_address
];

$ch = curl_init($emailServiceUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
$response = curl_exec($ch);
curl_close($ch);
```

### From JavaScript/React
```javascript
// Send welcome email
const sendWelcomeEmail = async (email, name) => {
  try {
    const response = await fetch('http://localhost:3001/send-welcome-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        name: name
      })
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('✅ Welcome email sent');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Usage
sendWelcomeEmail('customer@example.com', 'Abdul Sami');
```

---

## 🚀 Production Deployment

### Using PM2
```bash
npm install -g pm2

# Start
pm2 start server.js --name "atta-chakki-email"

# Save
pm2 save

# Startup
pm2 startup
```

### Using Docker
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3001
CMD ["npm", "start"]
```

---

## 🔧 Troubleshooting

### Error: "Gmail SMTP Error"
- Check if 2-Step Verification is enabled
- Generate new App Password
- Verify credentials in `.env`

### Error: "CORS blocked"
- Update `CORS_ORIGIN` in `.env` with your frontend URL
- Example: `CORS_ORIGIN=http://localhost:5173,http://localhost:3000`

### Email not sending
- Check server logs for errors
- Verify email subject is not empty
- Check `to` and `from` email addresses

---

## 📞 Support
For issues, check the server logs or contact the development team.
