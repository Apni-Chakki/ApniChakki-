# Recommended Fixes — Frontend Review (2026-09-21)

Single to-do list for the project. It replaces `REFACTOR_PROGRESS.md`, `CODE_QUALITY_AUDIT.md`, `audit.md`, `PROJECT_AI_AUDIT_REPORT.md` and `SETUP_GUIDE_URDU.md`, which were removed on 2026-09-21 (all still recoverable from git history). Findings come from re-reviewing `Atta Chakki Frontend/src` after the other dev's commits (`1111306`, `348bb89`, `98787c6`). Everything under "Priority" below is still to be done; the "Backlog" section at the end carries over the open items from the removed documents; "Already done" lists what not to redo.

**Ground rules (same as the rest of the refactor):** every fix is a copy/move with no behavior change, `npm run build` must pass after each one, and each fix ends with a manual smoke test on the affected screen.

**Current state:** build passes. Files over 500 lines dropped from 27 to 11. Two files regressed and a few shared pieces are unused (below). A full FE + BE scan on 2026-09-21 also surfaced the security items now listed under Priority 0. The repo copy of `Atta_Chakki_API/` and the live XAMPP copy at `C:\xampp\htdocs\Atta_Chakki_API` were byte-for-byte identical at the time of the scan (no drift).

---

## Priority 0 — Critical security (do these before anything else)

Found on 2026-09-21 while scanning `Atta_Chakki_API/controllers/`. These are real bugs, not code-quality nits — anyone who knows the URL can call them from a browser or Postman with no login.

### 0a. Twenty write endpoints have no auth guard

None of the files below include `utils/auth_middleware.php` or call `require_auth()` / `require_admin()`. They accept a JSON body and mutate the database.

| File | What any anonymous caller can do |
|---|---|
| `controllers/products/add_product.php` | Insert products |
| `controllers/products/delete_product.php` | Delete any product |
| `controllers/products/update_product_status.php` | Enable/disable products |
| `controllers/products/update_category_status.php` | Enable/disable categories |
| `controllers/coupons/create_coupon.php` | Create discount coupons |
| `controllers/expenses/add_expense.php` | Insert expenses (trusts `user_id` from body) |
| `controllers/expenses/delete_expense.php` | Delete expenses |
| `controllers/orders/admin_create_order.php` | Create manual admin orders |
| `controllers/orders/assign_driver.php` | Reassign drivers |
| `controllers/orders/cancel_order.php` | Cancel any order (no ownership check) |
| `controllers/orders/update_driver_location.php` | Spoof driver GPS |
| `controllers/orders/update_delivery_settings.php` | Change delivery config |
| `controllers/rentals/create_rental.php` | Create rentals |
| `controllers/rentals/return_rental.php` | Close out rentals |
| `controllers/reviews/edit_comment.php` | Edit any review (no owner check) |
| `controllers/cart/add_to_cart_impl.php` | Modify any cart by supplying a `user_id` |
| `controllers/cart/update_cart_item_impl.php` | Same |
| `controllers/cart/remove_cart_item_impl.php` | Same |
| `controllers/cart/clear_cart_impl.php` | Same |
| `controllers/delivery/driver_notify.php` | Trigger driver notifications |
| `controllers/delivery/generate_tracking_link.php` | Mint tracking links |
| `controllers/payments/process_online_payment.php` | Hits `PaymentService` with only body input |

**Recommended fix (one line per file):** at the top of each controller, right after the `include`/`require_once __DIR__ . '/../../config/connect.php';` line, add:

```php
require_once __DIR__ . '/../../utils/auth_middleware.php';
$user = require_admin();          // for admin-only endpoints
// or
$user = require_auth();           // for user-scoped endpoints
```

Then use `$user['id']` (or `$user['sub']`) instead of trusting `user_id` from the JSON body. Split the list into three buckets and do them in this order:

1. **Admin-only** (do these first): `add_product`, `delete_product`, `update_product_status`, `update_category_status`, `create_coupon`, `add_expense`, `delete_expense`, `admin_create_order`, `assign_driver`, `update_delivery_settings`, `driver_notify`, `generate_tracking_link`.
2. **User-scoped** (must verify the row belongs to the caller): `cancel_order`, `edit_comment`, all four `cart/*_impl` files.
3. **Special cases**: `update_driver_location` needs a driver check (require_auth then verify role = driver); `create_rental` / `return_rental` are admin-only in practice; `process_online_payment` intentionally allows guest checkout, but must at least validate the amount and order_id against the DB before hitting the gateway.

**Smoke test after each:** open the corresponding admin/customer screen while logged in, do the action, confirm it still works. Then log out and hit the URL directly with `curl` — it should return 401/403.

### 0b. Hardcoded SMTP credential in `socket-server/server.js`

`socket-server/server.js:25` still has:

```js
user: process.env.SMTP_USER || 'apnichakki897@gmail.com',
pass: process.env.SMTP_PASS || 'otlg jyzi fvxi ucbi'
```

This is a **third** credential leak, in addition to the two already listed in Backlog C (`utils/email_helper.php` and `utils/onesignal_helper.php`). It is in git history.

**Recommended fix:** remove the `||` fallback so the values come only from `process.env`, and rotate the Gmail app password (removing the string from the file does not un-leak it). Update Heroku/Vercel env vars in the same session so the socket server keeps working.

---

## Priority 1 — Regressions (files that grew back)

### 1. `UserAccount.jsx` — 612 → 1224 lines

**What happened:** commit `1111306` re-inlined about 900 lines. The page no longer imports `ProfileTab`, `OrdersTab`, `RentalsTab` from `components/features/customer/account/`, so those three files are dead code.

**Recommended fix:** put the page back on the existing tab components.
1. Diff `UserAccount.jsx` against `ProfileTab.jsx`, `OrdersTab.jsx`, `RentalsTab.jsx` to see what the other dev added inside the page (new fields, new logic).
2. Merge any genuinely new behavior into the tab components, then replace the inline JSX with `<ProfileTab />`, `<OrdersTab />`, `<RentalsTab />`.
3. Do not just revert the commit — the page may contain fixes that must be kept.

**Expected result:** about −600 lines. **Smoke test:** open My Account, check the Profile, Orders and Rentals tabs, edit a profile field, cancel an order.

### 2. `DeliveryPanel.jsx` — 995 → 1353 lines

**What happened:** same commit re-inlined about 400 lines. `DeliveryOrderCard` and `DeliveryConfirmDialog` are no longer imported (dead code); only `DeliveryStatusBadge` is still used.

**Recommended fix:** same approach as above. Diff, merge new behavior into the components, then swap the inline JSX back to `<DeliveryOrderCard />` and `<DeliveryConfirmDialog />`.

**Expected result:** about −350 lines. **Smoke test:** driver login, accept an order, mark picked up, mark delivered, confirm the dialogs still appear.

---

## Priority 2 — Finish the WhatsApp cleanup in `DeliveryPanel.jsx`

**The issue:** `src/utils/whatsappHelper.js` already has `formatWhatsAppPhone`, `getWhatsAppUrl` and `sendWhatsAppMessage`, and the rest of the app uses it. `DeliveryPanel.jsx` still builds links by hand: **4 hand-written `wa.me` links** and **4 copies of the phone-number cleanup**.

| Lines (approx.) | What it does |
|---|---|
| 424, 479, 676, 845 | the 4 `https://wa.me/...` links ("on the way", update, "delivered", "keep items ready") |
| 352, 437, 603, 807 | the 4 copies of phone cleanup (strip non-digits, turn a leading `0` into `92`) |

**Recommended fix:**
1. Delete the 4 hand-written phone cleanups and use `formatWhatsAppPhone(phone)` (or skip it, since `sendWhatsAppMessage` cleans the number itself).
2. Replace each `window.open(\`https://wa.me/...\`)` with `sendWhatsAppMessage(phone, message)`.
3. **Important:** the helper encodes the message itself, but DeliveryPanel wraps its messages in `encodeURIComponent(...)` first. When switching, remove that inner `encodeURIComponent`, otherwise the text is double-encoded and WhatsApp shows `%0A` / `%20`.
4. Keep the existing `setTimeout` delays (300 / 800 / 1500 ms) — they exist so the toast can close before the tab opens.

**Bonus:** the helper opens with `noopener,noreferrer`, which the current calls lack.

**Smoke test:** send one message from each of the 4 spots and check the text looks right in WhatsApp (line breaks and emojis intact).

---

## Priority 3 — Unused shared components

### What this means

In Phase 1 we built four small reusable UI pieces in `components/shared/` so every screen could look and behave the same:

| Component | Lines | What it is |
|---|---:|---|
| `PageHeader.jsx` | 23 | Page title + subtitle + action buttons row |
| `EmptyState.jsx` | 23 | The "nothing here yet" box with icon, title, optional button |
| `Loading.jsx` | 24 | The centered loading spinner |
| `ConfirmDialog.jsx` | 48 | A Yes/No confirmation popup (e.g. "Delete this?") |

They were created but **no page ever switched to them** — a project-wide search finds zero `import`s. So they are finished, working code sitting unused (dead code), while each screen keeps its own hand-written copy of the same thing. Measured on 2026-09-21:

| Hand-written copy still in the code | Files |
|---|---:|
| Own `Loader2` spinner (should be `Loading`) | 58 |
| Own "No ... found / available / yet" block (should be `EmptyState`) | 32 |
| Own `<h1>` title block (should be `PageHeader`) | 25 |
| Own `AlertDialog` confirm popup (should be `ConfirmDialog`) | 2 |

(The `AlertDialog` count is low because many screens confirm via a toast instead — see below.)

### Recommended fix: adopt them (don't delete)

Deleting only removes 4 tiny files. Adopting removes the duplicated JSX in dozens of screens, and gives one place to change the look later.

1. **Start with `Loading` and `EmptyState`.** Zero risk: they are plain display pieces with no logic, and the most-repeated patterns (58 and 32 files). Swap them in one screen at a time.
2. **Then `PageHeader`** on the admin pages that already follow "title + subtitle + button" (`ManageCoupons`, `ManageCategories`, `ManageDelivery`, `ManageServices` are good first ones).
3. **Then `ConfirmDialog`**, last, because it changes behavior slightly: several screens confirm deletes with `toast.warning(...)` + an action button (e.g. `ManageServices.jsx`). Switching those to a real dialog is a UX change, so decide first whether you want it. If not, leave those alone and use `ConfirmDialog` only for new code.
4. Do it while you're already editing a screen (Priority 1–2 files, new features), **not** as one big find-and-replace — each screen's markup differs a little, so check each swap visually.
5. After every swap: `npm run build`, open that screen, check loading / empty / title look right.

**Only delete** a component if the team decides the design should stay per-screen. In that case remove it from `components/shared/` so it stops looking like unfinished work.

---

## Priority 4 — Comment bloat (done)

The long comment blocks in `printSlipUtils.jsx`, `printHelpers.js`, `useTrackingMap.js` and `whatsappHelper.js` were shortened on 2026-09-21. Keep new files to short one-line comments so this does not come back.

---

## Priority 5 — Remaining large files (do last)

| File | Lines | Note |
|---|---:|---|
| `LiveTrackingMap.jsx` | 1760 | Already uses 5 extracted components; what's left is dense map logic. Move the map/socket logic into hooks (as was done for `useTrackingMap.js` on the customer side) rather than more display components. |
| `TodaysWork.jsx` | 1105 | Same idea — extract data/state logic into a hook like `useNewOrders.js`. |
| `ManageServices.jsx` | 727 | Grew from the category-tabs feature. Extract the fetch + cache logic into a small `useServicesByCategory` hook. |
| `useCheckoutAddress.js` | 711 | Large for a hook; split GPS/map logic from delivery-fee calculation. |

Do these after Priorities 1–2, since fixing the regressions removes the most lines for the least risk.

---

## Also worth knowing

### Why total frontend lines went up (42,965 → about 52,000)

Plain-English version: **the refactor moved code around, it didn't delete it — and moving code costs a few extra lines each time.**

Where the numbers stand (2026-09-21): 317 files, about 51,970 lines. At the 2026-09-15 baseline it was 42,965 lines in fewer files (about 190 at the time of our first scan).

Why the total grew:
1. **Every new file has overhead.** A component split out of a big page needs its own `import` lines, an `export`, and a props list; the page then needs an import and a `<Component prop={...} />` call to use it. That is roughly 10–25 extra lines per extraction. There are now 1,449 `import` lines across the app, and `components/features` alone is 166 files / about 23,000 lines.
2. **Props have to be passed down.** Code that used to read a variable directly now receives it through props (for example `ServiceForm` gets about 20 props), which adds lines on both sides.
3. **New hooks and helpers** (`useCheckoutAddress`, `useCheckoutOrder`, `useCancelOrder`, `whatsappHelper` …) were added. Good structure, but they are new lines, not removed ones.
4. **Real new features were added in the same period** (category tabs in Manage Services, the new rental modal, extra order statuses in `OrderStatusBadge`). Those are genuinely new code, not refactor overhead.
5. **Unused leftovers.** The orphaned components (`UserAccount` tabs, `DeliveryOrderCard`, the 4 shared components above) still count toward the total but do nothing. This is the one part that is pure waste.

**Is this a problem?** No, as long as the goal is what we stated: smaller, easier-to-read files. The biggest file went from 2,204 lines (`Checkout.jsx`) to 425, and files over 500 lines dropped from 27 to 11. A developer opens a 300-line file instead of a 2,000-line one. Total line count is the wrong scoreboard for a split.

**If you want the total to actually go down**, the real savings are:
- **Fix the two regressions** (`UserAccount.jsx`, `DeliveryPanel.jsx`) — about 950 lines gone, because that code already exists in the orphaned components.
- **Delete truly dead code** after checking nothing imports it (orphaned files stay in the count).
- **Adopt the shared components and helpers** above — one 23-line component replaces a repeated block in dozens of screens.
- **Reuse instead of re-writing:** cards, modals and badges that are copy-pasted across screens should become one shared piece.

Track it as two numbers going forward: *lines per file* (should fall) and *duplicated blocks* (should fall). Total lines will only fall once the duplicates and dead code are removed.
- **Keep this file up to date** after each fix: delete finished items and note new line counts. There is no separate progress tracker any more.
- **Currency formatting** is still manual in many files; `formatPKR` is only used in 4. Adopt it per file while touching each screen, not as a blind global replace.

---

## Suggested order

0. **Priority 0 first, before any refactor:** add auth on the 20 unauthenticated write endpoints (admin bucket first), then remove and rotate the SMTP credential in `socket-server/server.js`.
1. Fix `UserAccount.jsx` (biggest gain, about −600 lines)
2. Fix `DeliveryPanel.jsx` components (about −350 lines)
3. Switch `DeliveryPanel.jsx` WhatsApp to the helper
4. Decide on the four shared components (adopt or delete)
5. Trim the 3 new comment blocks
6. Hook extraction for the remaining large files
7. Fill the `clear_api_cache()` gaps listed in Backlog E

---

## Backlog carried over from the removed documents

Everything below was still open in `REFACTOR_PROGRESS.md` / `audit.md` / `PROJECT_AI_AUDIT_REPORT.md` and was re-checked against the code on 2026-09-21.

### A. Backend — use the new building blocks (largest remaining refactor)

`core/Response.php`, `core/Request.php` and the `repositories/` classes exist, but **no controller uses them**: 0 of 126 controllers call `Response::`, `Request::` or a repository. Controllers still do the manual `header(...)`, `json_decode(file_get_contents(...))`, inline SQL and `echo json_encode(...)`.

**Recommended fix:** migrate controllers one endpoint at a time, never as a bulk replace.
1. **Check the response shape first.** Some controllers return `{success: true, orders: [...]}` while `Response::json` wraps in `{success, data}`. Switching silently breaks the frontend. Change the controller and the page that reads it together (or keep the old shape until both are updated).
2. Start with read-only endpoints, moving their SQL into `UserRepository`, `ProductRepository`, `OrderRepository`, `CouponRepository`, `WalletRepository` (about 15 user queries, about 20 product queries were counted).
3. A `CartRepository` was planned but not created yet.
4. Do not change request/response contracts, routes or the DB schema without flagging it first (the mobile app and integrations depend on them).

### B. Frontend — stop using raw `fetch`

`src/lib/apiClient.js` (`apiGet` / `apiPost` …, returns `{ok, data, error}`) is used by **1 file**, while **64 files** still call `fetch` directly and repeat their own error toasts.

**Recommended fix:** adopt it per screen while you are already editing that screen (many toast messages are business-specific, so review each). Do not do a global replace.

### C. Security items

| Item | Fix |
|---|---|
| **Unauthenticated write endpoints (20 files).** See Priority 0a. | Add `require_admin()` / `require_auth()` + owner check per file. Do the admin bucket first. |
| **Hardcoded fallback secrets** in `Atta_Chakki_API/utils/email_helper.php` (an SMTP app password), `utils/onesignal_helper.php` (a OneSignal REST API key), and `socket-server/server.js:25` (the same SMTP app password, added on 2026-09-21 — see Priority 0b). All three are in git history. | Remove the hardcoded fallbacks so the values come only from environment variables, then **rotate all three credentials** (removing them from the files does not un-leak them). |
| **JWT still in `localStorage`.** The HttpOnly-cookie migration only exists as a written blueprint; nothing in the backend sets or reads an auth cookie. | Implement the dual-auth plan (accept `auth_token` cookie and `Authorization: Bearer`), then drop the localStorage token. Needs product sign-off and a login/logout smoke test. |

### D. Leftover backend files to remove (after checking)

The old audit flagged these as dead. They still exist:
- `Atta_Chakki_API/Manage_Services/` (3-line proxy files forwarding to `controllers/products/`)
- `Atta_Chakki_API/models/` (3-line proxy files such as `add_category.php`, `add_expense.php`) — this folder was deleted earlier and has reappeared
- `Atta_Chakki_API/products_output.json` (a testing dump)

**Before deleting any of them**, run the safety checklist: search the backend for `include`/`require` of the file, search the frontend `src/` for the URL, and check the `index.php` route map. `.htaccess` serves any existing `.php` file directly, so a file can be live even if nothing imports it. Keep `payments/jazzcash_callback.php` (needed for payment callbacks) and `core/`, `repositories/`, `services/`.

### E. Tooling and hygiene

- **Run `npm install`** in `Atta Chakki Frontend/`: on 2026-09-17 `eslint` failed because `@eslint/js` was missing from `node_modules` (later the build and lint worked, so this may already be fixed on your machine — confirm `npm run lint` and `npm test` both run).
- **Cache invalidation is done, keep the rule:** every write endpoint must call `clear_api_cache()`. `clear_api_cache()` wipes the whole cache folder; a narrower `delete_api_cache($key)` helper is an optional improvement.
- **Cache invalidation gaps found on 2026-09-21.** Only 20 write controllers currently call `clear_api_cache()`. The following write endpoints mutate data but do **not** clear the cache, so admin/customer lists can show stale data until the TTL expires — add the call to each:
  - `orders/update_order_status.php`, `orders/update_pickup_weight.php`, `orders/update_order_items.php`, `orders/override_order_schedule.php`, `orders/cancel_order.php`, `orders/assign_driver.php`, `orders/process_eod_selection.php`, `orders/process_rollover.php`, `orders/reschedule_pending.php`
  - `payments/record_payment.php`, `payments/record_udhaar_payment.php`, `payments/record_driver_settlement.php`
  - `users/promote_to_vip.php`, `users/toggle_customer_status.php`, `users/manage_vip_privilege.php`, `users/update_user_profile.php`, `users/change_password.php`
  - `expenses/add_expense.php`, `expenses/delete_expense.php`
  - `reviews/add_comment.php`, `reviews/edit_comment.php`, `reviews/delete_comment.php`, `admin/reply_contact_message.php`
  - `delivery/toggle_driver_status.php`, `delivery/generate_tracking_link.php`, `delivery/driver_notify.php`
  - `admin/delete_contact_message.php`, `admin/update_custom_mix_request.php`
- **`C:\xampp\htdocs\Atta_Chakki_API` is not a git repository** (no `.git`). Any change made there is not tracked or pushed. Either work only in the repo copy and copy files to XAMPP, or `git init` / re-clone there. Verified on 2026-09-21: the repo copy and the XAMPP copy were byte-for-byte identical at scan time — keep it that way.
- The two backend `*.php` files edited during the comment cleanup exist in both folders — keep them identical.
- `CLAUDE.md` inside `.claude/` still says to check `REFACTOR_PROGRESS.md` and `CODE_QUALITY_AUDIT.md` before starting work; point it at this file instead.
- Deferred idea: replace `apiCache.js` with React Query — the earlier review judged the current setup fine, so this is optional.

### F. Currency formatting

`formatPKR()` is used in 4 files; about 39 still format `Rs.` by hand. Adopt per screen (see the note under "Also worth knowing").

---

## Already done — do not redo

Kept here so nobody repeats finished work (details are in git history).

- **Cleanup:** dead files and the old `models/` duplicates removed (Phase 0); Leaflet removed, `xlsx` / `jspdf` lazy-loaded, heavy chunks left out of the PWA precache (precache 5.8 MB → about 2.6 MB); build about 50% faster.
- **Foundations:** `apiClient`, `formatters`, shared components, hooks, `core/Response` + `Request`, `BaseRepository` and the manual autoloader.
- **Large-file splits (frontend):** `Checkout` (2,205 → 425), `Homepage` (988 → 270), `ServiceCard` (891 → 366), `OrdersRecord` (859 → 341), `LiveTrackingPage` (771 → 79), `PickupRequests`, `AddManualOrder`, `ActiveRentals`, `NewOrders`, `ManageDelivery`, `DigitalKhata`, `TrackOrder`, `Dashboard`, `PrintSlip`, `CustomMixRequests`, `InventoryManagement`, `UdhaarKhata`, `PaymentVerification`, `TomorrowsList`, `ManageCustomers`, `PrintOrderDetails`. (`UserAccount` and `DeliveryPanel` need re-fixing, see Priority 1.)
- **Backend splits:** `place_order.php` (550 → 278), `manage_wallets.php` (646 → 68), `order_scheduler.php` (546 → 47), `process_online_payment.php` (547 → 17) using `PaymentService`, `WalletService`, `SchedulerService`.
- **Duplication removed:** WhatsApp helper (`whatsappHelper.js`), `useCancelOrder` + shared `CancelOrderModal`, `printHelpers.js`, `OrderStatusBadge` adopted in 9 files.
- **Cache bugs fixed:** all product, category, coupon, store-settings, inventory, rental and admin-order write endpoints now call `clear_api_cache()`.
- **Safety net:** Zustand stores (`useCheckoutStore`, `useAdminOrdersStore`), 23 Vitest tests, GitHub Actions CI for frontend (lint, test, build) and backend (`php -l`), ESLint flat config.
- **Bugs and features:** Manage Services status toggle (optimistic update + endpoint URL typo fixed), category tabs with per-category server-side loading (`get_all_products.php?category_id=`), Today's Work search bar (order no, customer, phone, item).
- **Comment cleanup:** long comment blocks shortened in about 20 frontend and 17 backend files (migration file left untouched on purpose).
