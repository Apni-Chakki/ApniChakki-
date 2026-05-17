# Nodemailer اور Google Sign-In Setup Guide

## خلاصہ (Summary)
یہ گائیڈ آپ کو دونوں features set up کرنے میں مدد دے گی:
1. ✉️ **Nodemailer** - ای میل بھیجنے کے لیے
2. 🔐 **Google Sign-In** - گوگل سے لاگ ان کریں

---

## PART 1: NODEMAILER SETUP

### مرحلہ 1: Node.js اور NPM انسٹال کریں
```bash
# چیک کریں کہ Node.js انسٹال ہے
node --version
npm --version

# اگر انسٹال نہیں ہے تو یہاں سے ڈاؤن لوڈ کریں:
# https://nodejs.org/
```

### مرحلہ 2: Node.js API سرور بنائیں (اگر نہیں ہے)
```bash
# اپنے API folder میں جائیں
cd c:\xampp\htdocs\Atta_Chakki_API

# نیا folder بنائیں (اگر server نہیں ہے)
mkdir nodejs-server
cd nodejs-server

# NPM initialize کریں
npm init -y
```

### مرحلہ 3: ضروری Packages انسٹال کریں
```bash
npm install express nodemailer cors dotenv axios body-parser
npm install --save-dev nodemon
```

### مرحلہ 4: .env فائل بنائیں
`nodejs-server` فولڈر میں `.env` فائل بنائیں:

```env
# Email Configuration (Gmail)
EMAIL_USER=آپ کی gmail@gmail.com
EMAIL_PASSWORD=آپ کا 16-character app password
EMAIL_FROM=آپ کی gmail@gmail.com
EMAIL_SERVICE=gmail

# یا دوسری Email Service کے لیے
# SMTP_HOST=smtp.mailtrap.io
# SMTP_PORT=2525
# SMTP_USER=آپ کا username
# SMTP_PASS=آپ کا password

# API Configuration
PORT=3002
NODE_ENV=development
PHP_API_URL=http://localhost/atta_chakki_api
```

### مرحلہ 5: Gmail App Password حاصل کریں

**اہم:** Gmail کے لیے regular password کام نہیں کرے گا۔ App Password بنانا پڑے گا۔

1. Gmail account میں جائیں: https://myaccount.google.com
2. Left side میں "Security" پر کلک کریں
3. "2-Step Verification" چالو کریں (اگر نہیں ہے)
4. وپس Security میں جائیں
5. "App passwords" تلاش کریں
6. Select device: Windows
7. Select app: Mail
8. 16-character password کاپی کریں اور `.env` میں پیسٹ کریں

### مرحلہ 6: Node.js Email Server بنائیں
`nodejs-server/server.js` میں یہ کوڈ ڈالیں:

```javascript
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Route 1: Forgot Password Email بھیجیں
app.post('/send-forgot-password-email', async (req, res) => {
  try {
    const { email, reset_token } = req.body;

    if (!email || !reset_token) {
      return res.status(400).json({
        success: false,
        message: 'Email اور reset token ضروری ہیں'
      });
    }

    const resetLink = `http://localhost:5173/reset-password?token=${reset_token}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'اپنا پاس ورڈ ری سیٹ کریں | Atta Chakki',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8b4513;">Atta Chakki - پاس ورڈ ری سیٹ</h2>
          <p>السلام علیکم،</p>
          <p>آپ نے اپنا پاس ورڈ ری سیٹ کرنے کی درخواست کی ہے۔</p>
          
          <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>آپ کا ری سیٹ ٹوکن:</strong> ${reset_token}</p>
            <p style="margin-top: 15px;">
              <a href="${resetLink}" 
                 style="background-color: #8b4513; color: white; padding: 10px 20px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                پاس ورڈ ری سیٹ کریں
              </a>
            </p>
          </div>

          <p><strong>یہ لنک 24 گھنٹے میں ختم ہو جائے گا۔</strong></p>
          <p>اگر یہ آپ نہیں تھے تو براہ کرم اس ای میل کو نظر انداز کریں۔</p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            © 2024 Atta Chakki. تمام حقوق محفوظ ہیں۔
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'ای میل کامیابی سے بھیج دی گئی'
    });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      success: false,
      message: 'ای میل بھیجنے میں خرابی: ' + error.message
    });
  }
});

// Route 2: ترتیب کی تصدیق ای میل
app.post('/send-verification-email', async (req, res) => {
  try {
    const { email, otp, userName } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email اور OTP ضروری ہیں'
      });
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'اپنے اکاؤنٹ کی تصدیق کریں | Atta Chakki',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8b4513;">Atta Chakki - اکاؤنٹ تصدیق</h2>
          <p>السلام علیکم ${userName || 'دوست'},</p>
          <p>Atta Chakki میں خوش آمدید! اپنے اکاؤنٹ کی تصدیق کریں۔</p>
          
          <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
            <p><strong style="font-size: 24px; color: #8b4513;">آپ کا OTP:</strong></p>
            <p style="font-size: 32px; letter-spacing: 5px; color: #8b4513; font-weight: bold;">
              ${otp}
            </p>
            <p style="margin-top: 15px; color: #666;">یہ کوڈ 10 منٹ میں ختم ہو جائے گا</p>
          </div>

          <p>تشکریہ!</p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            © 2024 Atta Chakki. تمام حقوق محفوظ ہیں۔
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'تصدیق ای میل کامیابی سے بھیج دی گئی'
    });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      success: false,
      message: 'ای میل بھیجنے میں خرابی: ' + error.message
    });
  }
});

// Route 3: رابطہ فارم ای میل
app.post('/send-contact-email', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'تمام فیلڈز ضروری ہیں'
      });
    }

    // Admin کو ای میل بھیجیں
    const adminMailOptions = {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_FROM, // Admin email
      subject: `نیا رابطہ: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8b4513;">نیا رابطہ پیغام</h2>
          <p><strong>نام:</strong> ${name}</p>
          <p><strong>ای میل:</strong> ${email}</p>
          <p><strong>موضوع:</strong> ${subject}</p>
          <p><strong>پیغام:</strong></p>
          <p style="white-space: pre-wrap; background-color: #f0f0f0; padding: 15px; border-radius: 5px;">
            ${message}
          </p>
        </div>
      `
    };

    // User کو تصدیق ای میل بھیجیں
    const userMailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'ہم نے آپ کا پیغام وصول کر لیا | Atta Chakki',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8b4513;">Atta Chakki - رابطہ تصدیق</h2>
          <p>السلام علیکم ${name},</p>
          <p>ہم نے آپ کا پیغام وصول کر لیا ہے۔ ہم جلد آپ کے ساتھ رابطہ قائم کریں گے۔</p>
          <p>شکریہ!</p>
        </div>
      `
    };

    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    res.json({
      success: true,
      message: 'ای میلیں کامیابی سے بھیجی گئیں'
    });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      success: false,
      message: 'ای میل بھیجنے میں خرابی: ' + error.message
    });
  }
});

// Server شروع کریں
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`\n🚀 Email server چل رہا ہے: http://localhost:${PORT}\n`);
});
```

### مرحلہ 7: package.json میں Script شامل کریں
`nodejs-server/package.json` میں:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

### مرحلہ 8: سرور شروع کریں
```bash
npm run dev
```

---

## PART 2: GOOGLE SIGN-IN SETUP

### مرحلہ 1: Google Cloud Console میں جائیں
1. https://console.cloud.google.com پر جائیں
2. نیا project بنائیں
   - "Select a Project" پر کلک کریں
   - "New Project" پر کلک کریں
   - نام: "Atta Chakki"
   - Create کریں

### مرحلہ 2: OAuth Consent Screen سیٹ اپ کریں
1. Left sidebar میں "APIs & Services" > "OAuth consent screen" جائیں
2. "External" منتخب کریں (User type)
3. Create کریں
4. یہ معلومات بھریں:
   - **App name:** Atta Chakki
   - **User support email:** آپ کی ای میل
   - **Developer contact:** آپ کی ای میل

### مرحلہ 3: OAuth Credentials بنائیں
1. "Credentials" پر جائیں
2. "Create Credentials" > "OAuth client ID"
3. "Web application" منتخب کریں
4. Name: "Atta Chakki Frontend"
5. Authorized JavaScript origins:
   ```
   http://localhost:5173
   http://localhost:3000
   https://yourdomain.com (production)
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:5173/
   http://localhost:3000/
   https://yourdomain.com/ (production)
   ```
7. **Client ID** کاپی کریں (آپ کو اس کی ضرورت ہے)

### مرحلہ 4: Frontend میں Google Client ID سیٹ کریں
`Atta Chakki Frontend/.env.local` میں:

```env
VITE_GOOGLE_CLIENT_ID=آپ کی_GOOGLE_CLIENT_ID_یہاں_ڈالیں
```

### مرحلہ 5: Frontend میں Google Provider سیٹ کریں
`Atta Chakki Frontend/src/main.jsx` میں یہ کوڈ ڈھونڈیں اور یقینی بنائیں:

```javascript
import { GoogleOAuthProvider } from '@react-oauth/google';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
```

### مرحلہ 6: AuthContext میں googleLogin منطق چیک کریں
`AuthContext.jsx` میں یہ method ہونا چاہیے:

```javascript
const googleLogin = async (accessToken) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/Controllers/Auth/google_login.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: accessToken })
    });

    const data = await response.json();
    
    if (data.success) {
      setUser({
        id: data.user.id,
        name: data.user.full_name,
        email: data.user.email,
        phone: data.user.phone,
        role: data.user.role
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Google login error:', error);
    return false;
  }
};
```

### مرحلہ 7: Backend میں Google Login Endpoint یقینی بنائیں
PHP backend میں `google_login.php` پہلے سے موجود ہے۔ یقینی بنائیں:
- Endpoint موجود ہے: `http://localhost/atta_chakki_api/api/Controllers/Auth/google_login.php`
- CORS enabled ہے

---

## PART 3: PHP سے Node.js Email Server کو کال کریں

### مرحلہ 1: PHP میں Email بھیجنے کا Function بنائیں
`Atta_Chakki_API/api/Utils/email_helper.php` میں:

```php
<?php

class EmailService {
    private $emailServerUrl = "http://localhost:3002";
    
    public function sendForgotPasswordEmail($email, $resetToken) {
        $url = $this->emailServerUrl . "/send-forgot-password-email";
        
        $payload = json_encode([
            'email' => $email,
            'reset_token' => $resetToken
        ]);
        
        return $this->sendRequest($url, $payload);
    }
    
    public function sendVerificationEmail($email, $otp, $userName = '') {
        $url = $this->emailServerUrl . "/send-verification-email";
        
        $payload = json_encode([
            'email' => $email,
            'otp' => $otp,
            'userName' => $userName
        ]);
        
        return $this->sendRequest($url, $payload);
    }
    
    public function sendContactEmail($name, $email, $subject, $message) {
        $url = $this->emailServerUrl . "/send-contact-email";
        
        $payload = json_encode([
            'name' => $name,
            'email' => $email,
            'subject' => $subject,
            'message' => $message
        ]);
        
        return $this->sendRequest($url, $payload);
    }
    
    private function sendRequest($url, $payload) {
        $ch = curl_init();
        
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        curl_close($ch);
        
        if ($httpCode == 200) {
            return json_decode($response, true);
        }
        
        return [
            'success' => false,
            'message' => 'Email server سے رابطہ نہیں ہو سکا'
        ];
    }
}

?>
```

### مرحلہ 2: Forgot Password میں استعمال کریں
`api/Controllers/Auth/forgot_password.php` میں:

```php
<?php
require_once dirname(__DIR__, 2) . '/Config/cors.php';
require_once dirname(__DIR__, 2) . '/Config/connect.php';
require_once dirname(__DIR__, 2) . '/Utils/email_helper.php';

// ... existing code ...

$emailService = new EmailService();
$emailResult = $emailService->sendForgotPasswordEmail($email, $resetToken);

if ($emailResult['success']) {
    echo json_encode([
        'success' => true,
        'message' => 'ای میل بھیج دی گئی ہے'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'ای میل بھیجنے میں خرابی'
    ]);
}
?>
```

---

## PART 4: ٹیسٹنگ

### Nodemailer ٹیسٹ کریں
```bash
curl -X POST http://localhost:3002/send-verification-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "آپ کی ای میل",
    "otp": "123456",
    "userName": "احمد"
  }'
```

### Google Sign-In ٹیسٹ کریں
1. Frontend میں Login page کھولیں
2. "Sign in with Google" بٹن پر کلک کریں
3. اپنا Google account منتخب کریں
4. آپ کو logged in ہونا چاہیے

---

## PART 5: Troubleshooting

### Gmail "Access denied" خرابی
- Gmail 2-Step Verification چالو کریں
- App Password استعمال کریں (regular password نہیں)

### Google Login "Invalid Client ID"
- Client ID درست ہے چیک کریں
- Domain whitelisted ہے چیک کریں

### CORS Errors
- Email server میں CORS enabled ہے چیک کریں
- API endpoints میں CORS headers شامل کریں

---

## اگلے مراحل (Next Steps)
1. Email templates مختلف languages میں بنائیں
2. SMS notification شامل کریں
3. Email scheduling feature شامل کریں
4. Admin dashboard میں email history دیکھیں

---

**سوالات؟ ایک message بھیجیں!** 📧
