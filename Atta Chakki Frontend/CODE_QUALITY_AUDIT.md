# Atta Chakki — Code Quality Audit

**Date:** 2026-09-15
**Scope:** `Atta Chakki Frontend/` (React + Vite) and `Atta_Chakki_API/` (PHP)
**Goal:** Identify duplication, oversized files, missing abstractions, and produce a phased refactor plan **that does not change behavior**.

> Sister file: [REFACTOR_PROGRESS.md](REFACTOR_PROGRESS.md) — updated after every phase so we know exactly where we left off.

---

## 1. Stack (as observed, not as CLAUDE.md claims)

| Layer      | Reality                                                                    |
| ---------- | -------------------------------------------------------------------------- |
| Frontend   | React 18 + Vite 6 + Tailwind 4 + Radix UI (shadcn-style) + react-router 7  |
| State      | Context API (`AuthContext`, `CartContext`, `LanguageContext`) — no Zustand |
| Realtime   | `socket.io-client` (paired with `socket-server/`)                          |
| Maps       | Both Leaflet **and** Mapbox GL bundled (see waste note below)              |
| Backend    | Plain PHP + MySQLi prepared statements. `composer.json` is empty `{}`.     |
| Auth       | Custom JWT (`utils/jwt_helper.php`, `utils/auth_middleware.php`)           |
| Deploy     | Vercel (`vercel.json`) + Heroku-style `Procfile` on API side               |

> The existing `.claude/CLAUDE.md` in the repo describes a **completely different project** (Nx monorepo, Next.js, Fastify, Drizzle). It should be rewritten to match this repo — flagged as **Phase 0 task**.

### Size snapshot

| Codebase | Files                 | Lines                      |
| -------- | --------------------- | -------------------------- |
| Frontend | ~90 JS/JSX            | **42,965**                 |
| Backend  | 126 PHP controllers + models/utils | **~15,442** |

---

## 2. Top pain points (ranked by impact)

### 🔴 P0 — Oversized page components (Frontend)

Ten files are single-file monoliths. Splitting these is the single biggest quality win.

| File                                       | Lines | useState | useEffect | fetch |
| ------------------------------------------ | ----: | -------: | --------: | ----: |
| `pages/customer/Checkout.jsx`              |  2409 |       40 |        11 |    15 |
| `pages/admin/LiveTrackingMap.jsx`          |  2083 |       32 |        16 |    13 |
| `pages/admin/TodaysWork.jsx`               |  1822 |       17 |         2 |    12 |
| `pages/delivery/DeliveryPanel.jsx`         |  1353 |       13 |         5 |    13 |
| `pages/admin/ManageServices.jsx`           |  1256 |       11 |         4 |     7 |
| `pages/customer/UserAccount.jsx`           |  1237 |       25 |         2 |     6 |
| `utils/translations.js` (data-only, ok)    |  1219 |        – |         – |     – |
| `pages/admin/UdhaarKhata.jsx`              |  1175 |        – |         – |     4 |
| `pages/admin/PaymentVerification.jsx`      |  1111 |        – |         – |     – |
| `pages/customer/ServiceCard.jsx`           |  1088 |        – |         – |     – |
| `pages/admin/TomorrowsList.jsx`            |  1087 |        – |         – |     7 |

**Concrete symptom (Checkout.jsx):** 40 `useState` calls in one component ⇒ every unrelated slice of UI re-renders on every keystroke. Also mixes map logic, payment logic, address logic, coupon logic, and cart summary in one file.

### 🔴 P0 — No HTTP client wrapper (Frontend)

- `utils/apiInterceptor.js` monkey-patches `window.fetch` globally to attach the JWT and handle 401. That works, **but** every page still writes 5–15 raw `fetch()` calls with hand-rolled `try/catch`, `toast.error`, `Content-Type` headers, JSON parsing, and duplicated URL joins.
- Zero pages import a client; there are **~200+ raw `fetch()` calls** across `pages/`.
- 39 files have inline `toast.error(...)` for the same failure shapes.

### 🔴 P0 — No PHP request/response scaffolding (Backend)

- 107 out of 126 controller files re-declare `header('Content-Type: application/json')`.
- 53 include `auth_middleware.php` by hand.
- 92 have inline `SELECT` prepared statements — there is **no repository layer**, so the same query (e.g. product lookup, user lookup) is duplicated dozens of times.
- Empty `composer.json` — no autoload, no PSR-4. Everything is `include __DIR__ . '/../../...'`.

### 🟠 P1 — Bundle waste (Frontend)

- **Two map libraries shipped in production**: `leaflet` + `react-leaflet` + `mapbox-gl` (~500 KB gzipped combined). `Checkout.jsx` imports both. `USE_MAPBOX = true` const suggests Leaflet is dead code.
- `xlsx` (~600 KB) is imported at top level of admin pages instead of dynamically.
- `jspdf`, `recharts`, `mapbox-gl` — all should be lazy-loaded per-route or per-modal.

### 🟠 P1 — Repeated widgets that are not extracted

Patterns observed across admin pages — all inlined, none shared:

| Pattern                  | Occurrences (est.) | Suggested component        |
| ------------------------ | ------------------ | -------------------------- |
| Page header + search bar | ~15 admin pages    | `<AdminPageHeader />`      |
| Data-table with sort + pagination | ~12 pages | `<DataTable />`            |
| Empty state + spinner    | ~20 places         | `<EmptyState />`, `<Loading />` |
| Confirm-delete dialog    | ~10 places         | `<ConfirmDialog />`        |
| Currency formatter (`Rs ${n.toLocaleString()}`) | ~everywhere | `formatPKR()` util |
| Order status pill        | ~8 pages           | `<OrderStatusBadge />`     |
| Print-slip layout        | 5 files (`PrintSlip`, `PrintOrderDetails`, `PrintExpenseReport`, `PrintRestockList`, `PrintTaskList`) | `<PrintFrame />` shell |

### 🟠 P1 — Backend oversized files

| File                                              | Lines | Notes                                                            |
| ------------------------------------------------- | ----: | ---------------------------------------------------------------- |
| `controllers/payments/manage_wallets.php`         |   646 | multi-action switch in one file — split by action                |
| `controllers/orders/place_order.php`              |   550 | cart validation, stock, coupon, payment routing all inline       |
| `controllers/payments/process_online_payment.php` |   547 | gateway logic (JazzCash/EasyPaisa/card) not separated            |
| `controllers/orders/order_scheduler.php`          |   546 | multiple concerns                                                |
| `utils/email_helper.php`                          |   318 | fine, but templates should move to `views/emails/*.php`          |

### 🟡 P2 — Correctness / safety smells

- Frontend uses `localStorage.getItem('token')` and stores raw user object under `'user'`. If XSS ever lands, session is trivially exfiltrated. Consider HttpOnly cookie flow later.
- `apiInterceptor.js` mutates `response.json` and retries — clever but surprising, and the retry silently swallows HTML-error responses. Should be an explicit client method with logging.
- Two `admin_stats.php` files exist: `controllers/admin/admin_stats.php` and `controllers/dashboard/admin_stats.php`. Dead-code check needed.
- `models/` has files at root (`add_category.php`) **and** duplicates in `models/products/` (same names). One is unused. Delete the loser.
- Frontend has both `pages/customer/GoogleMapPicker.jsx` and `components/common/MapboxPicker.jsx` — Mapbox is the current picker, Google map file likely dead.

### 🟡 P2 — Config / tooling gaps

- No ESLint rules for max-lines, no Prettier, no import-order plugin. `eslint.config.js` exists; contents unknown — audit it.
- No unit tests anywhere. Playwright not present despite CLAUDE.md claim.
- No CI config visible (no `.github/`).
- `.gitignore` at repo root does NOT list `.claude/`. See §6.

---

## 3. Reusable pieces to introduce

### Frontend

`src/lib/` (new directory):
- `apiClient.js` — thin wrapper: `apiGet`, `apiPost`, `apiPut`, `apiDelete` returning `{ok, data, error}`, single place for `toast.error` on network failure.
- `formatters.js` — `formatPKR`, `formatDate`, `formatPhone`, `formatOrderId`.
- `constants.js` — order status enum, payment method labels, role names.

`src/components/shared/` (extract from admin pages):
- `AdminPageHeader.jsx` (title, subtitle, actions, search)
- `DataTable.jsx` (headers, rows, sort, empty state, pagination hook)
- `EmptyState.jsx`, `Loading.jsx`, `ConfirmDialog.jsx`
- `OrderStatusBadge.jsx`, `PaymentMethodBadge.jsx`
- `PrintFrame.jsx` — shared A4/thermal print CSS

`src/hooks/`:
- `useApi.js` — fetch + loading + error state, replaces the `useEffect(() => { fetch() })` pattern (~50 occurrences)
- `usePagination.js`
- `useDebouncedValue.js` for search inputs
- `useSocket.js` — single socket connection instead of ad-hoc `io()` calls

### Backend

`Atta_Chakki_API/core/` (new):
- `Response.php` — `Response::json($data)`, `Response::error($msg, $code)`, `Response::unauthorized()`. Replaces the 107 hand-written `header('Content-Type: application/json'); echo json_encode(...)` blocks.
- `Request.php` — `Request::body()` (already validated JSON), `Request::int('id')`, `Request::bool('is_pickup_request')`. Removes the 20-line `isset(...) ? ... : default` pattern in every controller.
- `Router.php` (optional Phase 3) — lets `index.php` route without a big switch.

`Atta_Chakki_API/repositories/`:
- `UserRepository.php`, `ProductRepository.php`, `OrderRepository.php`, `CartRepository.php`, `CouponRepository.php`, `WalletRepository.php`.
- Each wraps the raw prepared statement + `fetch_assoc` boilerplate.

`Atta_Chakki_API/services/`:
- `OrderService.php` — extract stock validation, coupon application, splitting from `place_order.php`.
- `PaymentService.php` — extract JazzCash / EasyPaisa / card branches from `process_online_payment.php`.
- `WalletService.php` — split `manage_wallets.php` (646 lines) by action.

Autoload via `composer.json`:
```json
{ "autoload": { "psr-4": { "AttaChakki\\": "src/" } } }
```

---

## 4. Phased plan

Every phase ends with the app behaving identically. No API contract changes, no DB migrations, no route renames.

### Phase 0 — Prep (0.5 day)
1. Fix `.claude/CLAUDE.md` to reflect the real stack (this file's §1).
2. Add project-relative `.gitignore` entries (see §6).
3. Snapshot bundle size (`vite build` → note main chunk KB) and PHP LOC baseline.
4. Enable `eslint` `no-unused-vars`, `max-lines` (soft warn at 400), import-order plugin.
5. Delete confirmed dead files (Google map picker, duplicate `models/*.php`, duplicate `admin_stats.php` after grep).

### Phase 1 — Foundations, zero UI change (1–2 days)
**Frontend**
- Create `src/lib/apiClient.js` and `src/lib/formatters.js`.
- Create `src/components/shared/` with `PageHeader`, `Loading`, `EmptyState`, `ConfirmDialog`, `OrderStatusBadge`.
- Create hooks `useApi`, `useDebouncedValue`, `usePagination`.
- **Do not migrate any page yet** — just land the utilities behind lint-passing tests.

**Backend**
- Create `core/Response.php` + `core/Request.php`.
- Add `composer.json` with PSR-4 autoload, `require_once 'vendor/autoload.php'` in `index.php`.
- Introduce `BaseRepository.php` with `prepare/execute/fetchAll` helpers.
- Nothing else migrated yet.

### Phase 2 — Quick wins across many files (2–3 days)
- Sweep every controller: replace inline JSON header + `json_encode` with `Response::json(...)` (mechanical, safe).
- Sweep every page: replace inline currency `Rs ${...}` with `formatPKR(...)`.
- Replace 39 inline `toast.error("Something went wrong")` patterns with `apiClient` error path.
- Move `xlsx`, `jspdf`, `mapbox-gl` to dynamic `import()` at call sites (admin export buttons only).
- Decide on **one** map library (recommend: keep Mapbox, remove Leaflet + `react-leaflet`) — saves ~200 KB gzipped.

### Phase 3 — Split monoliths, one file per PR (5–8 days total, 1 file/day)
Order (highest-value first):
1. `Checkout.jsx` → `CheckoutAddressStep`, `CheckoutSlotStep`, `CheckoutPaymentStep`, `CheckoutSummary`, `useCheckoutForm` hook.
2. `LiveTrackingMap.jsx` → `DriverMarkerLayer`, `OrderListPanel`, `RoutePolyline`, `useLiveDrivers` hook.
3. `TodaysWork.jsx` → `OrderKanban`, `AssignDriverDialog`, `TaskList`.
4. `DeliveryPanel.jsx` → similar decomposition.
5. `ManageServices.jsx`, `UserAccount.jsx`, `UdhaarKhata.jsx`, `PaymentVerification.jsx`, `ServiceCard.jsx`, `TomorrowsList.jsx`.

Backend:
6. `place_order.php` → `OrderController::place()` + `OrderService`.
7. `process_online_payment.php` → per-gateway class.
8. `manage_wallets.php` → per-action file (`admin_wallet_credit.php`, `admin_wallet_debit.php`, `get_wallet_transactions.php`).
9. `order_scheduler.php` → split scheduling vs notification.

### Phase 4 — Data-layer consolidation (3–4 days)
- Introduce repositories, migrate the top-5 most-duplicated queries (product-by-id, user-by-id, cart items, active orders, coupons).
- Delete inline SQL from ~20 controllers as they now call the repository.

### Phase 5 — Frontend state (optional, evaluate after Phase 3)
- Consider Zustand or `useReducer` for `CheckoutContext`, `AdminOrdersContext` — only if the Phase 3 split doesn't already fix re-render pain.
- Consider React Query for server state + caching (would replace `apiCache.js`).

### Phase 6 — Safety & polish
- Move JWT to HttpOnly cookie flow (breaking change — schedule with product).
- Add basic Vitest + one Playwright smoke (login → place order → admin sees it).
- Add GitHub Actions: lint + PHP `-l` syntax check on PR.

---

## 5. Suggested Claude skills to install

Add these under `.claude/skills/` (or invoke the existing ones):

- **`code-review`** (built-in) — run after every phase before merging.
- **`create-component`** — enforce the file-size + hook-extraction rules when splitting monoliths.
- **`optimize-performance`** — target bundle-size + re-render passes in Phase 2/5.

None of these are auto-triggered — invoke as `/code-review` etc. after each phase.

---

## 6. `.claude/` and `.gitignore`

Current `.gitignore` (root):
```
node_modules/
.env
error_log.txt
*.sql
*.txt
```

There is **no** `.claude` entry. Recommendation:

- **Commit `.claude/`** so skills, commands, and this CLAUDE.md are shared with anyone else who opens the repo with Claude Code. Team-wide consistency.
- **Ignore only the per-user file** `.claude/settings.local.json` (auto-created for personal permissions):
  ```
  .claude/settings.local.json
  ```

Also worth adding while we're here:
```
# Vendor / build
Atta Chakki Frontend/dist/
Atta Chakki Frontend/dev-dist/
Atta_Chakki_API/vendor/
Atta_Chakki_API/cache/*.cache
# Logs
*.log
# IDE
.vscode/
.idea/
```

I have **not** modified `.gitignore` yet — waiting for your call.

---

## 7. Definition of Done for each phase

Before ticking a phase in `REFACTOR_PROGRESS.md`:

1. `pnpm build` (frontend) succeeds with no new warnings.
2. `php -l` on every touched PHP file passes.
3. Manual smoke: login as customer → add to cart → checkout (COD) → admin sees order → assign driver → mark delivered.
4. No route URL, request body shape, or response shape changed (grep the diff for API contracts).
5. Progress file updated with what was done, what was skipped, next entry point.

---

## 8. Estimated total effort

| Phase | Days     |
| ----- | -------- |
| 0     | 0.5      |
| 1     | 1–2      |
| 2     | 2–3      |
| 3     | 5–8      |
| 4     | 3–4      |
| 5     | 2–3 (opt)|
| 6     | 2–3      |
| **Total** | **~15–24 dev-days** |

Sequential is safest. Phases 1 and 2 can run in parallel if two people split frontend/backend.
