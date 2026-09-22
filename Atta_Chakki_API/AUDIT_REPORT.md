# Project Security & Performance Audit Report
**Project Name:** Suchi Chakki (G3 Apni Chakki)  
**Date:** September 21, 2026  
**Scope:** Frontend (React + Vite PWA), Backend API (PHP / MySQL), Socket Server (Node.js / Express)  
**Status:** Completed  

---

## 1. Executive Summary

This audit assesses the overall security architecture, data handling practices, and performance characteristics of the Suchi Chakki platform. The platform handles customer orders, payment workflows, rider live GPS tracking, and administrative khata management.

While the core functionality is robust, the audit identified:
- **2 Critical Security Vulnerabilities** (Hardcoded default JWT secret fallback & exposed production credentials).
- **2 Medium Security Vulnerabilities** (Absence of brute-force rate limiting on auth endpoints & potential IDOR on order tracking).
- **3 Major Performance Bottlenecks** (N+1 database query patterns, unthrottled background polling, and third-party synchronous API blocking).

---

## 2. Security Vulnerabilities & Risk Assessment

### 2.1 [CRITICAL] Hardcoded Default JWT Secret Fallback
* **Location:** `Atta_Chakki_API/utils/jwt_helper.php` (Lines 5 & 23)
* **Code Snippet:**
  ```php
  $secret = getenv('JWT_SECRET') ?: 'default_jwt_secret_change_me_in_production';
  ```
* **Root Cause:** The `JWT_SECRET` environment key is neither configured in the system environment nor inside the active `.env` file. As a result, both token generation and verification fall back to the predictable literal string `'default_jwt_secret_change_me_in_production'`.
* **Impact & Exploitability:** Any attacker who reads or guesses this public repository default can forge arbitrary JWT tokens containing `{"role": "admin", "id": 1}` and obtain full administrative control over orders, customer data, and system settings without knowing any password.
* **Remediation:**
  1. Generate a cryptographically secure 64-character secret key:
     ```bash
     openssl rand -hex 32
     ```
  2. Define `JWT_SECRET=<your_secure_random_key>` inside `.env`.
  3. Throw an immediate fatal exception if `JWT_SECRET` is unset, disallowing fallback defaults in production:
     ```php
     $secret = getenv('JWT_SECRET') ?: ($envVars['JWT_SECRET'] ?? null);
     if (empty($secret)) {
         throw new Exception("JWT_SECRET is not configured.");
     }
     ```

---

### 2.2 [HIGH] Plaintext Production Credentials Stored in Root `.env`
* **Location:** `Atta_Chakki_API/.env`
* **Root Cause:** High-privilege production credentials are hardcoded into the local `.env` file:
  - Production TiDB Cloud credentials (`DB_PROD_HOST`, `DB_PROD_USER`, `DB_PROD_PASS`).
  - Cloudinary API Secret (`CLOUDINARY_API_SECRET`).
  - Google OAuth Client Secret (`GOOGLE_CLIENT_SECRET`).
  - Gmail App Password (`SMTP_PASS=avdf gukt hmbt wuuw`).
* **Impact & Exploitability:** If this directory or file is inadvertently committed to a public Git repository or accessible via direct web server access, malicious actors could access customer databases, exfiltrate private addresses, or hijack the email relay.
* **Remediation:**
  1. Ensure `.env` is strictly listed in `.gitignore`.
  2. Block direct web server access to dotfiles (`.env`, `.git`) in `.htaccess` or Nginx:
     ```apache
     <FilesMatch "^\.">
         Order allow,deny
         Deny from all
     </FilesMatch>
     ```
  3. Rotate all leaked credentials (especially Gmail App Passwords and Cloud database keys).

---

### 2.3 [MEDIUM] Lack of Rate Limiting on Authentication Endpoints
* **Location:** `Atta_Chakki_API/controllers/auth/login.php`
* **Root Cause:** The login controller executes credentials verification on every POST request without tracking failed attempts by IP or username.
* **Impact & Exploitability:** Susceptible to automated dictionary and brute-force attacks against administrative and customer phone numbers.
* **Remediation:**
  - Implement IP/phone-based failed attempt tracking in Redis or MySQL (e.g., maximum 5 failed attempts per 15 minutes before locking the account or requiring CAPTCHA).

---

### 2.4 [MEDIUM] Insecure Direct Object Reference (IDOR) on Order Tracking
* **Location:** `Atta_Chakki_API/controllers/orders/track_order.php`
* **Root Cause:** Querying order status and delivery address by sequential numeric ID (`order_id`) without validating whether the requesting user owns the order or possesses a valid unguessable tracking token.
* **Impact & Exploitability:** Attackers could enumerate order IDs sequentially (`1, 2, 3...`) to scrape customer names, delivery addresses, and phone numbers.
* **Remediation:**
  - Require customer authentication OR validate the unguessable tracking UUID (`tracking_token`) when an order status is accessed publicly.

---

### 2.5 [LOW] 30-Day Static JWT Lifespan Without Revocation
* **Location:** `Atta_Chakki_API/utils/jwt_helper.php` (Line 12)
* **Root Cause:** Tokens have a fixed 30-day expiration window (`time() + (86400 * 30)`) and cannot be revoked if a driver or admin's session is compromised.
* **Remediation:**
  - Shorten access token lifetime (e.g., 24-48 hours for administrative sessions) and implement a token blacklist or refresh-token rotation scheme.

---

## 3. Performance Bottlenecks & Optimization

### 3.1 [HIGH IMPACT] N+1 Database Query Patterns
* **Location:**
  - `Atta_Chakki_API/controllers/orders/get_all_orders.php`
  - `Atta_Chakki_API/controllers/orders/get_user_orders.php`
  - `Atta_Chakki_API/controllers/admin/admin_orders.php`
* **Root Cause:** Orders are fetched through a parent query, followed by individual queries executed in a `while($row = ...)` loop for each order to retrieve:
  - Line items (`order_items`)
  - Product specifications (`products`)
  - Customizations (`order_item_customizations`)
  - Rental details (`rentals`)
* **Impact:** A list of 20 orders triggers between 60 and 120 separate database round-trips, causing response times between 2.5s and 6.0s on high-latency cloud connections.
* **Remediation:**
  - Standardize on single-query SQL `LEFT JOIN` or two-step batch `WHERE order_id IN (...)` queries (as successfully implemented in `get_delivery_orders.php`).
  - Add compound indexes:
    ```sql
    CREATE INDEX idx_orders_status_created ON orders(status, created_at);
    CREATE INDEX idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX idx_order_item_cust ON order_item_customizations(order_item_id);
    ```

---

### 3.2 [MEDIUM IMPACT] Blocking High-Timeout Synchronous Sub-requests
* **Location:**
  - `Atta_Chakki_API/utils/email_helper.php`
  - `Atta_Chakki_API/utils/translate.php`
* **Root Cause:**
  - Status updates previously waited up to 6–15 seconds attempting synchronous cURL requests to remote notification services.
  - Translation requests to MyMemory API block page rendering for up to 10 seconds per phrase.
* **Remediation:**
  - Execute background tasks asynchronously via queues, socket dispatchers, or ultra-low socket timeouts (< 1.5 seconds).
  - Use database-level multilingual columns (such as `description_ur`) rather than runtime translation API calls.

---

### 3.3 [MEDIUM IMPACT] Unthrottled Client-Side Polling
* **Location:**
  - `src/pages/delivery/DeliveryPanel.jsx`
  - `src/pages/admin/DigitalKhata.jsx`
  - `src/pages/admin/ManageDelivery.jsx`
* **Root Cause:** React hooks run unconditional `setInterval(..., 15000)` or `setInterval(..., 20000)` polling loops regardless of network condition or window focus.
* **Impact:** Battery consumption and unnecessary CPU overhead on mobile devices; hundreds of redundant requests hitting the database every minute.
* **Remediation:**
  - Halt polling when the document is in the background (`document.hidden`).
  - Transition from aggressive HTTP polling to reactive WebSocket events (`driver:status_changed`, `order:status_updated`).

---

### 3.4 [LOW IMPACT] Client-Side Bundle Splitting Optimization
* **Location:** `vite.config.js`
* **Root Cause:** Mapbox GL (1.86 MB minified) and export utilities (jsPDF, XLSX) represent heavy single chunks.
* **Remediation:**
  - Continue code splitting via dynamic imports (`React.lazy(() => import('./LiveTrackingMap'))`) so that users browsing only the storefront do not download Mapbox binaries.

---

## 4. Remediation Checklist & Roadmap

| Priority | Category | Finding | Target Action |
| :--- | :--- | :--- | :--- |
| **P0** | **Security** | Hardcoded JWT Secret | Set high-entropy `JWT_SECRET` in `.env` and remove default fallback. |
| **P0** | **Security** | Plaintext Credentials | Protect `.env` from web accessibility and rotate external API keys. |
| **P1** | **Performance** | N+1 Order Item Queries | Replace per-row loops with batch SQL `IN (...)` queries across admin APIs. |
| **P1** | **Security** | Brute-force Vulnerability | Implement rate-limiting on `login.php` (max 5 attempts per IP/phone). |
| **P2** | **Performance** | Polling Overhead | Hook `setInterval` calls into `document.visibilitychange` & rely on Socket.io. |
| **P2** | **Security** | IDOR on Public Tracking | Restrict `track_order.php` lookups to authenticated users or signed tokens. |

---
*Report generated by Antigravity Engineering System.*
