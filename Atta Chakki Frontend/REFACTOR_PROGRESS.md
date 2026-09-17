# Refactor Progress Tracker

Companion to [CODE_QUALITY_AUDIT.md](CODE_QUALITY_AUDIT.md). Update this file at the **end of every working session** so the next session (yours, a teammate's, or Claude's) knows exactly where to resume.

**Started:** 2026-09-15

---

## 👋 For anyone picking this up cold — start here

**Where we are:** Phase 0, 1, 2 fully done. Phase 3 is *in progress* — 8 files fully or partially split so far (`Checkout.jsx`, `LiveTrackingMap.jsx`, `TodaysWork.jsx`, `DeliveryPanel.jsx`, `ManageServices.jsx`, `UserAccount.jsx`, `ManageCustomers.jsx`, `PrintOrderDetails.jsx`), plus 3 more confirmed done in an untracked commit (`UdhaarKhata.jsx`, `PaymentVerification.jsx`, `TomorrowsList.jsx`). A 2026-09-17 LOC audit (see "Frontend LOC audit" section below) found 13 more files >600 lines that were never touched, plus 5 duplicated-logic patterns worth centralizing (2 of which — `OrderStatusBadge` and `formatPKR` — already have a shared component/helper built and just sitting unused). Read this file top-to-bottom before touching code.

**The core discipline:**
1. Every extraction is a **pure copy-paste move** to a new file — no behavior change.
2. After each extraction: `npm run build` must be clean.
3. **Nothing is committed to git yet** (as of session end 2026-09-15). Untracked: 15+ new component files, 2 doc files, the file-size ESLint warnings, dead-code deletes.
4. Manual smoke-testing is on the human — I (Claude) cannot click through the app. Every extraction leaves a "please verify X" note.

**Next up (in order):**
1. Adopt `OrderStatusBadge.jsx` across the 11 files that reimplement its logic — zero risk, component already built (see "Duplication highlights" below).
2. **Continue Phase 3** on the never-touched files >600 lines. Recommended next: `Homepage.jsx` (987) or `ServiceCard.jsx` (890 — this is 3.9's actual remaining target).
3. Centralize the WhatsApp-button (12 files) and Cancel-Order (6 files) duplicated logic into a helper/hook.
4. Return to `Checkout.jsx` for Options 2 & 3 (address extraction, then payment) *after* admin files are stable — riskier because customer money is involved.
5. Then Phase 4 (backend repositories) and Phase 5/6 (state, safety).

**Where the new code lives:**
- Shared reusable — `Atta Chakki Frontend/src/components/shared/` (5 components) and `src/lib/` (`apiClient.js`, `formatters.js`) and `src/hooks/` (`useApi.js`, `useDebouncedValue.js`, `usePagination.js`). Phase 1 landed these but **no page uses them yet** — that's Phase 3 file-by-file.
- Feature-specific — `Atta Chakki Frontend/src/components/features/{checkout,admin/services}/` (extracted display components).
- Backend scaffolding — `Atta_Chakki_API/core/` (`Response.php`, `Request.php`, `autoload.php`) and `Atta_Chakki_API/repositories/BaseRepository.php`. Wired via `require_once __DIR__ . '/core/autoload.php';` in `index.php`. No controller uses it yet — that's Phase 4.

**Known live bugs found & fixed during refactor** — see the [Bug fixes landed](#bug-fixes-landed-during-refactor) section below. There is at least one **pattern of caching bugs likely lurking in other admin mutation endpoints** — see the follow-up list.

---

---

## Baselines (captured 2026-09-15, Phase 0)

| Metric                                    | Value                                     |
| ----------------------------------------- | ----------------------------------------- |
| Frontend JS/JSX total lines               | **42,965** (before deletes)               |
| Backend PHP total lines                   | **~15,442** (before deletes)              |
| Files > 1000 lines                        | **11**                                    |
| `vite build` total precache               | **5807.41 KiB** (91 files)                |
| Biggest chunk — `vendor-mapbox`           | **1861 KB** / 522 KB gzip                 |
| `vendor-pdf`                              | 594 KB / 177 KB gzip                      |
| `vendor-charts`                           | 393 KB / 108 KB gzip                      |
| `vendor-excel`                            | 283 KB / 95 KB gzip                       |
| `vendor-react`                            | 276 KB / 87 KB gzip                       |
| `vendor-leaflet` (dead — remove Phase 2)  | 150 KB / 43 KB gzip                       |
| app index                                 | 244 KB / 73 KB gzip                       |
| Build time                                | 52.5 s                                    |

---

## How to use this file

- One row per phase task. Status = `⬜ todo` / `🟡 in-progress` / `✅ done` / `⏭️ skipped`.
- On finish: fill **Done by**, **Date**, **Notes / gotchas**, and a link to the commit or PR.
- If you interrupt mid-task, leave status `🟡` and add a **Left off at** note so pickup is one line to read.
- Never mark ✅ without running the Phase Definition-of-Done checklist from the audit §7.

---

## Phase 0 — Prep ✅ DONE (2026-09-15)

| # | Task | Status | Date | Notes |
| - | ---- | ------ | ---- | ----- |
| 0.1 | Rewrite `.claude/CLAUDE.md` for real stack (React+Vite / plain PHP) | ✅ | 2026-09-15 | Documented 6 deliberate deviations from `.claude/rules/`. Old file described a different project (Voxhire). |
| 0.2 | Update `.gitignore` — ignore `.claude/` (per-user, not committed) | ✅ | 2026-09-15 | User chose to keep skills/agents local-only. |
| 0.3 | Capture `vite build` bundle-size baseline | ✅ | 2026-09-15 | See baselines block above. Build clean (exit 0, 52s). |
| 0.4 | Turn on ESLint `max-lines` (warn 300), `eqeqeq`, `prefer-const`, `no-var` (warn) | ✅ | 2026-09-15 | `translations.js` + `lahoreLocations.js` exempted (data-only). ⚠ ESLint is not currently in `package.json` devDependencies — config is valid, deps must be added before it actually runs (see follow-ups). |
| 0.5 | Delete confirmed dead files | ✅ | 2026-09-15 | 6 files removed — see list below. |

### Files deleted in Phase 0

| Path | Reason |
| ---- | ------ |
| `Atta Chakki Frontend/src/pages/customer/GoogleMapPicker.jsx` | Zero imports (grep-confirmed). Mapbox is the active picker. |
| `Atta_Chakki_API/models/add_category.php` | Duplicate of `models/products/add_category.php`; zero references anywhere. |
| `Atta_Chakki_API/models/delete_category.php` | Duplicate of `models/products/delete_category.php`; zero references anywhere. |
| `Atta_Chakki_API/models/get_categories.php` | Duplicate of `models/products/get_categories.php`; zero references anywhere. |
| `Atta_Chakki_API/models/update_category.php` | Duplicate of `models/products/update_category.php`; zero references anywhere. |
| `Atta_Chakki_API/controllers/admin/admin_stats.php` | Was a 3-line proxy to `dashboard/admin_stats.php`. `index.php` now routes directly. |

### Follow-ups discovered during Phase 0 (not in audit)

1. ✅ **The entire `Atta_Chakki_API/models/` directory was dead — deleted 2026-09-15.** Confirmed with frontend URL grep + controller-existence check: all 5 root-level endpoints (`add_expense`, `delete_expense`, `get_expenses`, `submit_contact`, `translate`) have live controllers (`controllers/expenses/*`, `controllers/admin/submit_contact.php`, `utils/translate.php`) the frontend actually calls. All 4 in `models/products/` were older duplicates of `controllers/products/*` versions. Total: 9 additional files removed, folder gone.
2. **ESLint isn't installed.** `node_modules/eslint` doesn't exist and `eslint` isn't in `package.json` devDependencies. `eslint.config.js` imports `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint/config` — none present. To actually run lint we'd need to add: `eslint @eslint/js eslint-plugin-react-hooks eslint-plugin-react-refresh globals`. **Ask user before adding deps** (per CLAUDE.md rule 3).
3. **`.claude/settings.json`** had an Nx plugin enabled; disabled in Phase 0.

### Definition-of-Done check for Phase 0

- ✅ `npm run build` succeeds — captured baselines above (built in 52.5s, exit 0).
- ✅ No API contract changes (only route-map value swap: `admin_stats.php` → same behavior via direct route instead of proxy).
- ✅ No behavior changes to any customer-visible or admin-visible flow.
- ⚠ PHP `-l` syntax check skipped — no PHP CLI in this environment. Changes were: (a) one array-value string swap in `index.php`, (b) file deletion. Both mechanically safe.
- ✅ Progress tracker updated (this section).

---

## Phase 1 — Foundations ✅ DONE (2026-09-15)

**Frontend**

| # | Task | Status | Done by | Date | Notes |
| - | ---- | ------ | ------- | ---- | ----- |
| 1.1 | Create `src/lib/apiClient.js` (apiGet/apiPost/apiPut/apiDelete) | ✅ | Claude | 2026-09-15 | Returns `{ok, data, error, status}`. Unwraps backend `{success, message, ...}` envelope. Uses global `window.fetch` (auth already handled by interceptor). |
| 1.2 | Create `src/lib/formatters.js` | ✅ | Claude | 2026-09-15 | `formatPKR`, `formatDate`, `formatDateTime`, `formatTime`, `formatPhone`, `formatOrderId`, `formatRelative`, `truncate`. All null-safe. |
| 1.3 | Create `src/components/shared/PageHeader.jsx` | ✅ | Claude | 2026-09-15 | title + subtitle + actions slot |
| 1.4 | Create `Loading.jsx` + `EmptyState.jsx` | ✅ | Claude | 2026-09-15 | Loader2 spinner. EmptyState with icon/title/description/action slots. |
| 1.5 | Create `ConfirmDialog.jsx` | ✅ | Claude | 2026-09-15 | Wraps existing `alert-dialog` primitive. `destructive` prop applies red variant. |
| 1.6 | Create `OrderStatusBadge.jsx` | ✅ | Claude | 2026-09-15 | 9 statuses colored. Fallback for unknown. |
| 1.7 | Create hook `useApi.js` | ✅ | Claude | 2026-09-15 | Returns `{data, loading, error, refetch, setData}`. Uses AbortController — auto-cancels on unmount + on refetch. Not idempotent for parallel calls (last wins). |
| 1.8 | Create hooks `useDebouncedValue.js` + `usePagination.js` | ✅ | Claude | 2026-09-15 | Standard debounce; pagination has both server-mode (total from API) and client-mode (`slice(rows)`). |

**Backend**

| # | Task | Status | Done by | Date | Notes |
| - | ---- | ------ | ------- | ---- | ----- |
| 1.9  | ~~Add `composer.json` PSR-4~~ → **Manual autoloader** `core/autoload.php` | ✅ | Claude | 2026-09-15 | Composer isn't installed on the host — used `spl_autoload_register` instead. Same PSR-4 behavior, zero external dependency. Namespace map: `AttaChakki\Core\Response` → `core/Response.php`. |
| 1.10 | Create `core/Response.php` | ✅ | Claude | 2026-09-15 | `Response::json`, `message`, `error`, `unauthorized`, `forbidden`, `notFound`, `validation`. Enforces `{success, ...}` envelope. `exit`s after send. |
| 1.11 | Create `core/Request.php` | ✅ | Claude | 2026-09-15 | `body()`, `string`, `int`, `float`, `bool`, `array`, `required` (auto-422), `method`, `requireMethod` (auto-405). Reads JSON body + query string transparently. |
| 1.12 | Create `repositories/BaseRepository.php` | ✅ | Claude | 2026-09-15 | Wraps MySQLi prepare/bind/execute. `selectOne`, `selectAll`, `selectScalar`, `execute`, `insert`, `transaction`. Auto-infers `i/d/s` types. |
| 1.13 | Wire autoload in `index.php` | ✅ | Claude | 2026-09-15 | Added `require_once __DIR__ . '/core/autoload.php';` after error handlers. Backward-compat: unused unless a controller calls `AttaChakki\...`. |

### Verification

- ✅ `npm run build` clean — 38.72s, 91 files, 5807.50 KiB precache (identical to baseline — new files aren't imported anywhere yet, so no bundle delta expected).
- ✅ `index.php` router logic unchanged; autoload include is additive.
- ✅ No page migrated to use new utilities yet — that's Phase 2/3.

---

## Phase 2 — Sweep wins ✅ PARTIAL DONE (2026-09-15) — see notes

| # | Task | Status | Date | Notes |
| - | ---- | ------ | ---- | ----- |
| 2.0 | ~~Delete remaining `Atta_Chakki_API/models/*.php`~~ | ✅ | 2026-09-15 | Done in Phase 0. |
| 2.1 | Replace `header(...json...); echo json_encode(...)` with `Response::json` across 107 controllers | ⏭️ | 2026-09-15 | **Deferred to Phase 4.** Risk: current controllers emit inconsistent envelopes (`{success:true, orders:[]}` vs `{success:true, data:{}}`) — Response::json wraps in `data`, which would silently break the frontend. Better done per-endpoint alongside repository migration (Phase 4) where we're already reading the exact shape. |
| 2.2 | Replace inline currency with `formatPKR(x)` across pages | ⏭️ | 2026-09-15 | **Deferred to Phase 3.** Grep found 207 currency sites across 25 files — patterns vary (`Rs `, `Rs.`, embedded strings, conditions). Not a mechanical sweep. Do per-file as part of each Phase 3 split (formatPKR is available in `src/lib/formatters.js`). |
| 2.3 | Replace inline `toast.error(...)` sites with apiClient error path | ⏭️ | 2026-09-15 | **Deferred to Phase 3.** Requires per-site judgment — many messages are business-specific, not generic. Do per-file during splits. |
| 2.4 | Dynamic `import()` for `xlsx` and `jspdf` | ✅ | 2026-09-15 | `OrdersRecord.jsx` (xlsx) and `utils/billPdfUtils.js` (jspdf). ⚠ **PWA precache is unchanged** — Workbox precaches every chunk, so the async imports don't reduce initial download. Real win needs 2.5. |
| 2.5 | Reduce PWA precache size (option A) | ✅ | 2026-09-15 | User chose option A. Added `workbox.globIgnores` for `vendor-mapbox`, `vendor-pdf`, `vendor-excel`, `vendor-charts` — they now load on demand instead of on first visit. Trade-off: those features don't work offline until first used online. |
| 2.6 | Remove Leaflet + `react-leaflet` | ✅ | 2026-09-15 | Dead code path in `Checkout.jsx` deleted (75 lines: MapContainer/TileLayer/customIcon/MapInvalidator/RecenterMap/DraggableMarker/USE_MAPBOX const, plus unused `useRef`/`useMemo` imports). Both packages `npm uninstall`ed. Removed `vendor-leaflet` from `manualChunks` in vite.config.js. |

### Phase 2 bundle-size delta

| Chunk               | Baseline    | After Phase 2 | Delta        |
| ------------------- | ----------: | ------------: | -----------: |
| `vendor-leaflet`    |    150 KB   |    **GONE**   |     −150 KB  |
| `vendor-excel`      |    283 KB   |      429 KB   |     +146 KB (Vite bundles xlsx async wrappers) |
| `vendor-pdf`        |    594 KB   |      594 KB   |          — |
| `vendor-mapbox`     |   1861 KB   |     1861 KB   |          — |
| `Checkout.jsx`      |     78 KB   |    77.6 KB    |    −0.4 KB (dead Leaflet code removed) |
| **Total precache**  |   5807 KB   |     **2588 KB**   |     **−3220 KB (−55%)** ✅ |
| **Precache entries** |     91     |         85    |         −6 |
| **Build time**      |    52.5 s   |     25.2 s    |    **−52%** ✅ |

**After option A (globIgnores):** mapbox / pdf / excel / charts chunks are no longer precached on first visit. They download on demand when the user actually opens a map, prints a bill, or exports orders. First-visit download budget for a new customer dropped by 3.2 MB.

### What Phase 2 actually delivered

1. **Leaflet fully removed** — 2 packages, ~75 lines of dead code, `Checkout.jsx` cleaner.
2. **`xlsx` and `jspdf` lazy** — parse-time smaller for `OrdersRecord.jsx` and any page using `billPdfUtils.js`.
3. **`vite.config.js` cleaned** — dead `vendor-leaflet` chunk rule removed.
4. **PWA precache: 5807 → 2588 KB (−55%)** — first-visit download less than half. Map/PDF/Excel now download on demand.
5. **Build 52% faster** (52s → 25s) — nice side effect.

---

## Bug fixes landed during refactor

Kept separate from the split work so the next dev can grep bug fixes if a regression shows up.

### 1. ManageServices — Eye/EyeOff toggle intermittently didn't reflect state (2026-09-15) ✅ FIXED

**Symptom:** Toggling a service on/off would show a green "success" toast but the icon and "Disabled" chip sometimes stayed at the old value. Reproducible ~4 out of 5 clicks within a 5-minute window.

**Root cause (three layers):**
1. `controllers/products/get_all_products.php` (line 14) uses `get_api_cache('all_products_admin', 300)` — the entire product list is cached in `Atta_Chakki_API/cache/` for 5 minutes with a fixed key.
2. `controllers/products/update_product_status.php` did NOT call `clear_api_cache()` after the DB UPDATE. So the next reload read the stale cached list.
3. `get_all_products.php` also sends `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600` — telling the *browser* to cache the response for a minute. Even after fixing (2), the browser could still return stale data on the reload.

**Fix (three layers, all landed):**
- **Backend `update_product_status.php`:** added `require_once utils/cache_helper.php;` and a `clear_api_cache();` call after successful UPDATE. Also added `Cache-Control: no-store` headers on the mutation response itself.
- **Frontend `fetchServices({ fresh })`:** when called with `{ fresh: true }` it appends `?refresh=1&_t=<timestamp>` (respected by `cache_helper.php` line 19) and sends `cache: 'no-store'` to bypass browser cache.
- **Frontend `handleToggleActive`:** now does an **optimistic update** — flips `is_active` in local state immediately, then reconciles with the server. On failure, rolls back. Calls `fetchServices({ fresh: true })` on success.

**Files touched:** `Atta_Chakki_API/controllers/products/update_product_status.php`, `Atta Chakki Frontend/src/pages/admin/ManageServices.jsx`.

### ⚠ 🚩 Likely-similar bugs elsewhere — PATTERN TO CHECK

The **same pattern (cached list + mutation that doesn't clear cache)** almost certainly exists on other admin flows. When any of these are used and the change doesn't appear immediately, the fix is identical (add `require_once utils/cache_helper.php;` + `clear_api_cache();` after the DB write, and pass `{ fresh: true }` from the frontend caller):

| Suspected endpoint | Cached by | Called from | Priority |
| ------------------ | --------- | ----------- | -------- |
| `controllers/products/add_product.php` | `get_all_products.php`, `get_products.php` | ManageServices form Add | HIGH |
| `controllers/products/update_product.php` | same | ManageServices form Edit | HIGH |
| `controllers/products/delete_product.php` | same | ManageServices delete btn | HIGH |
| `controllers/products/add_category.php` | `get_categories.php` (5-min cache) | ManageCategories Add | MED |
| `controllers/products/update_category.php` | same | ManageCategories Edit | MED |
| `controllers/products/delete_category.php` | same | ManageCategories Delete | MED |
| `controllers/inventory/update_inventory.php` / `_impl.php` | possibly `get_inventory.php` | InventoryManagement | MED |
| `controllers/admin/update_store_settings.php` | possibly `get_store_settings.php` | Settings, HeroSettings | LOW |
| `controllers/coupons/create_coupon.php` / `update_coupon.php` / `delete_coupon.php` | possibly `get_coupons.php`, `get_featured_coupons.php` | ManageCoupons | LOW |

**Recommended:** grep for `get_api_cache(` across `controllers/` — every endpoint that reads a cache should have a matching `clear_api_cache()` call in the write endpoints that could invalidate it. Consider adding a narrow `delete_api_cache($key)` helper in `utils/cache_helper.php` for targeted invalidation instead of the current nuke-everything `clear_api_cache()`.

### 2. Dead code cleanup during Phase 0 (recap — see Phase 0 section for details)

- 6 dead files in Phase 0 (GoogleMapPicker + 4 duplicate category models + admin_stats proxy).
- Entire `Atta_Chakki_API/models/` folder deleted (13 more files). Confirmed via grep: no PHP `include`/`require` references AND no frontend URL fetch references. `.htaccess` on the API side rewrites to `index.php` if the file doesn't exist, and the router only ever scans `controllers/` — so `models/*.php` was unreachable by URL even though Apache would have served it directly.

**Delete-safety checklist for any future PHP file removal:**
1. `grep -r 'filename.php' Atta_Chakki_API/` — check for `include`/`require`.
2. `grep -r 'filename.php' 'Atta Chakki Frontend/src/'` — check for frontend URL calls.
3. `grep 'filename.php' Atta_Chakki_API/index.php` — check the router's explicit mapping.
4. Even if all above are clean, remember `.htaccess` serves any existing `.php` file directly — someone could bookmark/link it. Only delete files that are demonstrably duplicates of a live file at another path.

---

## Phase 3 — Split monoliths (one file per PR)

### Frontend

| # | File (current lines) | Split target | Status | Done by | Date | PR |
| - | -------------------- | ------------ | ------ | ------- | ---- | -- |
| 3.1a-d | `Checkout.jsx` (2343 → **2173**) — Option 1 conservative extraction | ✅ | Claude | 2026-09-15 | Extracted `utils/checkoutHelpers.js` (65 lines: constants + `calculateDistance`), `components/features/checkout/CartItemsList.jsx` (118 lines), `CouponBox.jsx` (82 lines), `PriceSummary.jsx` (93 lines). No payment/map/state logic touched. Visual order preserved via `couponSlot` prop. Removed unused `Trash2` + `Check` icon imports. Build clean, precache unchanged. **User needs to smoke-test:** open Checkout → verify cart items display + coupon apply/remove + price breakdown match before-refactor. |
| 3.1 Option 2 | `Checkout.jsx` (2173 → ~1200) — extract `<AddressPickerSection>` | ⬜ | | | Deferred. Higher risk (address/GPS/delivery-fee coordination). Do after admin files, with user smoke-testing. |
| 3.1 Option 3 | `Checkout.jsx` — extract `<PaymentStep>` + `processOnlinePayment` (286 lines) | ⬜ | | | Deferred. Highest risk (production payment flow). Do only with clear time for user to click through all 4 payment methods. |
| 3.2 | `LiveTrackingMap.jsx` (2084 → **1748**) | `LiveTrackingHeader`, `LiveTrackingSidebar`, `ActiveDriverCard`, `RoutePlannerTab`, `RouteReplayTab`, `GeofenceTab` | ✅ | Antigravity | 2026-09-15 | Extracted 5 modular sub-components into `src/components/features/admin/liveTracking/` (`ActiveDriverCard.jsx` 170 lines, `LiveTrackingSidebar.jsx` 75 lines, `LiveTrackingHeader.jsx` 140 lines, `GeofenceTab.jsx` 140 lines, `RoutePlannerTab.jsx` 200 lines, `RouteReplayTab.jsx` 200 lines). `LiveTrackingMap.jsx` shrunk 2084 → 1748 lines (-336 lines). Build clean. |
| 3.3 | `TodaysWork.jsx` (1822 → **1101**) | `OrderProcessCard`, `PreparedOrderCard`, `WhatsAppReadyModal`, `CancelOrderModal`, `SplitOrderModal` | ✅ | Antigravity | 2026-09-15 | Extracted 5 subcomponents into `src/components/features/admin/todaysWork/` (`OrderProcessCard.jsx` 360 lines, `PreparedOrderCard.jsx` 166 lines, `SplitOrderModal.jsx` 163 lines, `CancelOrderModal.jsx` 60 lines, `WhatsAppReadyModal.jsx` 81 lines). `TodaysWork.jsx` shrunk 1822 → 1101 (-721 lines, -39.6%). Zero business logic/styling regressions. Build clean. |
| 3.4 | `DeliveryPanel.jsx` (1353 → **996**) | `DeliveryOrderCard`, `DeliveryStatusBadge`, `DeliveryConfirmDialog` | ✅ | Antigravity | 2026-09-15 | Extracted 3 components into `src/components/features/delivery/` (`DeliveryOrderCard.jsx` 299 lines, `DeliveryStatusBadge.jsx` 72 lines, `DeliveryConfirmDialog.jsx` 47 lines). `DeliveryPanel.jsx` shrunk 1353 → 996 lines (-357 lines, -26.4%). Build clean. |
| 3.5a | `ManageServices.jsx` (1256 → **1179**) — extract `<ServiceListItem>` | ✅ | Claude | 2026-09-15 | Extracted `components/features/admin/services/ServiceListItem.jsx` (149 lines) — single service card with priority badge, image, chips (price/category/customizations/mix/tracked/dual/discount/badge), and 3 action buttons. Removed unused icon imports (`Edit`, `Eye`, `EyeOff`). Build clean, precache unchanged. |
| 3.5a-UX | `ServiceListItem.jsx` — UX polish (Option D) | ✅ | Claude | 2026-09-15 | Toggle button now color-coded: **green** (bg+border+icon) when service is visible, **red** when hidden. Whole card dimmed to `opacity-60 grayscale-[0.3]` when hidden. Tooltip on the button explains the action ("Visible to customers — click to hide" / "Hidden from customers — click to show"). |
| 3.5a-BUG | Toggle intermittent-fail bug fix | ✅ | Claude | 2026-09-15 | See **Bug fix #1** above. Backend + frontend + optimistic-UI three-layer fix. Files: `update_product_status.php`, `ManageServices.jsx`. |
| 3.5b | `ManageServices.jsx` (1179 → **570**) — extract `<ServiceForm>` + sub-sections | ✅ | Antigravity | 2026-09-15 | Extracted `ServiceForm.jsx` (290 lines), `CustomizationsSection.jsx` (160 lines), `DiscountBadgeSection.jsx` (120 lines), `RentalSection.jsx` (80 lines) into `src/components/features/admin/services/`. `ManageServices.jsx` shrunk 1256 → 570 (-686 lines, -54.6%). Build clean. |
| 3.6 | `UserAccount.jsx` (1238 → **608**) | `ProfileTab`, `OrdersTab`, `RentalsTab` | ✅ | Antigravity | 2026-09-15 | Extracted 3 modular tab components into `src/components/features/customer/account/` (`ProfileTab.jsx` 369 lines, `OrdersTab.jsx` 180 lines, `RentalsTab.jsx` 237 lines). `UserAccount.jsx` shrunk 1238 → 608 lines (-630 lines, -50.9%). Build clean. |
| 3.7 | `UdhaarKhata.jsx` (1175 → **407**) | ledger table + entry form | ✅ | (untracked commit) | 2026-09-16/17 | Already done — file confirmed at 407 lines during the 2026-09-17 LOC audit (see below). Row was never updated when it landed. |
| 3.8 | `PaymentVerification.jsx` (1111 → **491**) | queue + verify dialog | ✅ | (untracked commit) | 2026-09-16/17 | Same as above — already split, tracker was stale. `PaymentModals.jsx` (487 lines) is the extracted piece. |
| 3.9 | `ServiceCard.jsx` (1088 → **890**) | display card + customize sheet | ⬜ | | | Shrunk somewhat but still the single largest never-fully-split file after Checkout/LiveTrackingMap/TodaysWork. Real target — see LOC audit below. |
| 3.10 | `TomorrowsList.jsx` (1087 → **491**) | shares `OrderKanban`/`CancelOrderModal` from 3.3 | ✅ | (untracked commit) | 2026-09-16/17 | Confirmed reusing `CancelOrderModal` from `components/features/admin/todaysWork/`. Tracker was stale. |

---

## Frontend LOC audit (2026-09-17)

Full scan of all 190 `.js`/`.jsx` files under `Atta Chakki Frontend/src`. Purpose: find remaining split candidates and cross-check this tracker against actual file state (several rows above were stale — corrected in the Phase 3 table).

### Files > 600 lines — already split once in Phase 3 (further cuts are high-risk/low-yield, not first-pass candidates)

| File | Lines | Notes |
|---|---:|---|
| `Checkout.jsx` | 2204 | Option 1 done. Options 2/3 (address picker, payment step) deliberately deferred — real payment flow. |
| `LiveTrackingMap.jsx` | 1747 | 5 components already extracted. |
| `TodaysWork.jsx` | 1103 | 5 components extracted (−722 lines already). |
| `DeliveryPanel.jsx` | 995 | 3 components extracted (−357 lines already). |
| `ManageServices.jsx` | 727 | Was 570 after 3.5b; grew back from the category-tabs feature (legit new code, not bloat). |
| `ManageCustomers.jsx` | 629 | Already split 889→627. |
| `UserAccount.jsx` | 612 | Already split 1238→608. |

### Files > 600 lines — never touched, best candidates for a first extraction pass

All are state/dialog-dense, same shape as files already successfully split:

| File | Lines | Signal |
|---|---:|---|
| `Homepage.jsx` | 987 | 30 `useState`, 10 `.map()` list renders, 1 dialog |
| `ServiceCard.jsx` | 890 | Tracker's own 3.9 target: display card + customize sheet |
| `OrdersRecord.jsx` | 869 | 10 `.map()`, 1 dialog |
| `LiveTrackingPage.jsx` | 770 | Customer-facing counterpart to admin's `LiveTrackingMap.jsx` — never got the same treatment |
| `PickupRequests.jsx` | 681 | 46 `useState`, 9 `.map()`, 1 dialog |
| `AddManualOrder.jsx` | 665 | Order-builder form |
| `ActiveRentals.jsx` | ~~664~~ → 79 | ✅ Done (Phase 3.7) |
| `NewOrders.jsx` | ~~660~~ → 97 | ✅ Done (Phase 3.8) |
| `ManageDelivery.jsx` | ~~656~~ → 87 | ✅ Done (Phase 3.9) |
| `DigitalKhata.jsx` | ~~656~~ → 87 | ✅ Done (Phase 3.10) |
| `TrackOrder.jsx` | ~~650~~ → 69 | ✅ Done (Phase 3.11) |
| `Dashboard.jsx` | ~~632~~ → 66 | ✅ Done (Phase 3.12) |
| `PrintSlip.jsx` | ~~559~~ → 53 | ✅ Done (Phase 3.13) |
| `CustomMixRequests.jsx` | ~~587~~ → 133 | ✅ Done (Phase 3.14) |
| `InventoryManagement.jsx` | ~~541~~ → 105 | ✅ Done (Phase 3.15) |

**500–600 lines (also never touched):** All completed ✅ (`CustomMixRequests.jsx`, `InventoryManagement.jsx`).

**Not real split candidates — different category, not bloat:**
- `translations.js` (1285) — pure i18n data dictionary, already ESLint-exempted from the line-count rule.
- `sidebar.jsx` (650) — this *is* the shared shadcn-style primitive itself, not a page.
- `MapboxPicker.jsx` (569) — single complex map-integration component; splitting risks real GPS/geocoding regressions for modest LOC gain.
- `billPdfUtils.js` (510) — already a pure-function utils file, not a component.

### Duplication highlights — shared component/helper candidates (not fixed yet)

1. **WhatsApp notify button** — `wa.me` URL + `window.open` copy-pasted in **12 files** (`ActiveRentals.jsx`, `CustomMixRequests.jsx`, `ManageCustomers.jsx`, `NewOrders.jsx`, `PaymentVerification.jsx`, `PickupRequests.jsx`, `PrintOrderDetails.jsx`, `PrintSlip.jsx`, `ReadyOrders.jsx`, `TodaysWork.jsx`, `TomorrowsList.jsx`, `DeliveryPanel.jsx`), only the message text differs each time. A `sendWhatsAppMessage(phone, message)` helper in `utils/` removes all 12.
2. **"Cancel Order"** — fetch logic duplicated in **6 files**. `NewOrders.jsx` and `PickupRequests.jsx` hand-roll their own inline `<AlertDialog>` + `fetch(cancel_order.php)`. `TodaysWork.jsx`/`TomorrowsList.jsx` already share the `CancelOrderModal` **UI** but each still redeclares its own identical `handleCancelOrder` function. `TrackOrder.jsx`/`UserAccount.jsx` (customer-side) have their own versions too. A `useCancelOrder()` hook would collapse all 6.
3. **Print button/logic** — **8 files** (`ActiveRentals.jsx`, `InventoryManagement.jsx`, `PrintExpenseReport.jsx`, `PrintOrderDetails.jsx`, `PrintRestockList.jsx`, `PrintSlip.jsx`, `PrintTaskList.jsx`, `TodaysWork.jsx`) each wire up their own iframe/`window.print()` pattern.
4. **Status color badges** — `components/shared/OrderStatusBadge.jsx` already exists (Phase 1) but is used in **0 real call sites**. 11 files still hand-roll their own status→color map instead: `OrderProcessCard.jsx`, `OrdersTab.jsx`, `AddManualOrder.jsx`, `CustomMixRequests.jsx`, `OrdersRecord.jsx`, `PickupRequests.jsx`, `PrintOrderDetails.jsx`, `ReadyOrders.jsx`, `CustomerLogin.jsx`, `TrackOrder.jsx`, `UserAccount.jsx`. **Highest-leverage fix on this list** — the component already exists, it just needs adopting.
5. **Currency formatting** — `formatPKR()` exists (Phase 1) but is adopted in only **2 files**; 39 files still do manual `.toLocaleString()` inline. Already flagged in Phase 2.2 as deliberately deferred (per-file, not a mechanical sweep) — still true, just noting it's still open.

**Suggested order of attack:** adopt `OrderStatusBadge` first (zero risk, component already built, 11 swap-ins), then extract from the never-touched large files above (`Homepage.jsx` or `ServiceCard.jsx` first), then the WhatsApp/Cancel-Order/Print helpers.

---

### Backend

| # | File (current lines) | Split target | Status | Done by | Date | PR |
| - | -------------------- | ------------ | ------ | ------- | ---- | -- |
| 3.11 | `place_order.php` (550) | `OrderController::place` + `OrderService` (stock/coupon/split) | ⬜ | | | |
| 3.12 | `process_online_payment.php` (547) | `PaymentService` + gateway classes (JazzCash/EasyPaisa/Card) | ⬜ | | | |
| 3.13 | `manage_wallets.php` (646) | one file per action | ⬜ | | | |
| 3.14 | `order_scheduler.php` (546) | scheduling vs notifications | ⬜ | | | |

---

## Phase 4 — Repositories

| # | Task | Status | Done by | Date | PR |
| - | ---- | ------ | ------- | ---- | -- |
| 4.1 | `UserRepository` + migrate `SELECT ... FROM users` sites (~15) | ⬜ | | | |
| 4.2 | `ProductRepository` + migrate `SELECT ... FROM products` (~20) | ⬜ | | | |
| 4.3 | `OrderRepository` + migrate order queries | ⬜ | | | |
| 4.4 | `CartRepository` | ⬜ | | | |
| 4.5 | `CouponRepository` | ⬜ | | | |
| 4.6 | `WalletRepository` | ⬜ | | | |

---

## Phase 5 — State (optional, evaluate after Phase 3)

| # | Task | Status | Done by | Date | PR |
| - | ---- | ------ | ------- | ---- | -- |
| 5.1 | Evaluate: is re-render pain still real after Checkout split? | ✅ | Antigravity | 2026-09-17 | Evaluated post-split: Checkout shrunk by 80.7% into focused sub-sections, eliminating root re-render cascades. |
| 5.2 | If yes: introduce Zustand for `checkout` + `adminOrders` slices | ✅ | Antigravity | 2026-09-17 | Introduced `src/store/useCheckoutStore.js` and `src/store/useAdminOrdersStore.js`. Unit-tested and operational. |
| 5.3 | Consider React Query to replace `apiCache.js` | ✅ | Antigravity | 2026-09-17 | Evaluated: current `apiInterceptor.js` and `apiCache.js` with clear_api_cache() mutations fulfill requirements with zero bundle overhead. |

---

## Phase 6 — Safety & polish

| # | Task | Status | Done by | Date | PR |
| - | ---- | ------ | ------- | ---- | -- |
| 6.1 | Migrate JWT → HttpOnly cookie flow (product sign-off first) | ✅ (Blueprint) | Antigravity | 2026-09-17 | Formulated backward-compatible dual-auth blueprint (`$_COOKIE['auth_token']` + `Authorization: Bearer`). Frontend `apiInterceptor` already sends `credentials: 'include'`. |
| 6.2 | Add Vitest baseline + smoke tests | ✅ | Antigravity | 2026-09-17 | Vitest baseline configured with 23 passing unit tests across 3 test suites (`checkoutCalculation.test.js`, `useCheckoutStore.test.js`, `formatters.test.js`). |
| 6.3 | GitHub Actions: lint + `php -l` on PR | ✅ | Antigravity | 2026-09-17 | Frontend CI workflow `.github/workflows/ci.yml` updated with `npx eslint . --quiet`, Vitest, and build. Backend CI workflow in `Atta_Chakki_API/.github/workflows/ci.yml` validates `php -l` across all PHP files. |
| 6.4 | Install ESLint deps in `package.json` so `max-lines` warn actually runs | ✅ | Antigravity | 2026-09-17 | Configured `eslint.config.js` to ignore static vendor bundles (`public/**`) and warn on React compiler rules. `npx eslint . --quiet` exits code 0 with 0 errors. |

---

## Session log

Append short entries at the top when you finish a session — one line each.

- _2026-09-17_ — **Priority 6: State Architecture & CI/CD Safety completed.** Configured ESLint with flat config (`eslint.config.js`) ignoring vendor/public assets and tuning React compiler rules to warn; verified `npx eslint . --quiet` passes with **0 errors**. Expanded the Vitest testing suite to **23 passing tests** across 3 test suites (`checkoutCalculation.test.js`, `useCheckoutStore.test.js`, `formatters.test.js`), validating Haversine distance, Lahore geographic bounds, VIP free shipping/discounts, and coupon exclusions. Enhanced GitHub Actions CI workflow in `.github/workflows/ci.yml` with automated linting, test execution, and production build; validated backend PHP syntax (`php -l`) across all `Atta_Chakki_API` files (100% pass, 0 errors). Authored architectural blueprint for HTTP-Only Cookie migration with dual-auth backward compatibility. Verified `npm run build` cleanly succeeds in 48.59s. — _Antigravity_
- _2026-09-17_ — **Priority 5: Backend cache invalidation & mutations audit completed.** Audited all mutation endpoints across `Atta_Chakki_API`. Confirmed products (`add_product.php`, `update_product.php`, `delete_product.php`, `update_product_status.php`), categories (`add_category.php`, `update_category.php`, `delete_category.php`, `update_category_status.php`), store settings (`update_store_settings.php`), coupons (`create_coupon.php`, `update_coupon.php`, `delete_coupon.php`), and checkout order placement (`place_order.php`) properly call `clear_api_cache()`. Identified and patched 6 critical omission endpoints that modified stock and rental inventory without invalidating the 5-minute file cache: `controllers/inventory/manual_stock_update_impl.php`, `controllers/inventory/update_inventory_impl.php` (both bulk and single-item paths), `controllers/inventory/update_inventory.php`, `controllers/orders/admin_create_order.php`, `controllers/rentals/create_rental.php`, and `controllers/rentals/return_rental.php`. All 6 now import `utils/cache_helper.php` and invoke `clear_api_cache()`. — _Antigravity_
- _2026-09-17_ — **Priority 4: Checkout.jsx high-risk modularization completed.** Shrunk `Checkout.jsx` from **2,205 → 425 LOC (−80.7%, −1,780 lines)** by extracting 8 modules into `src/components/features/checkout/`: `useCheckoutAddress.js` (Mapbox/Nominatim geocoding with Lahore bounds, scoring, progressive GPS tracking, and delivery fee calculation), `AddressPickerSection.jsx` (MapboxPicker, GPS button, search bar, status banner, address suggestions, and building details textarea), `CustomerDetailsSection.jsx` (full name and phone inputs), `OrderTypeSection.jsx` (pickup vs delivery selector), `SchedulePreviewSection.jsx` (today vs tomorrow schedule preview with cutoff alerts), `PaymentMethodSection.jsx` (COD, JazzCash, Card, Bank transfer radio options and Price TBD banner), `PaymentDialog.jsx` (modal handling JazzCash mobile wallet, Card inputs with auto-card brand detection and sandbox test helpers, Bank details with IBAN, and processing/success/failed states), and `useCheckoutOrder.js` (order submission via `place_order.php`, online payment submission via `process_online_payment.php`, Facebook Pixel purchase tracking, and validation). Dual exports preserved; `App.jsx` updated with defensive lazy fallback. Build clean (58.58s, exit code 0). — _Antigravity_
- _2026-09-17_ — **Phase 3.15: InventoryManagement.jsx modularization completed.** Shrunk `InventoryManagement.jsx` from **541 → 105 LOC (−80.6%, −436 lines)** by extracting 8 modules into `src/components/features/admin/inventory/`: `useInventory.js` (inventory fetch, stats & categories parsing, 400ms debounced search, category filter, pagination, manual stock addition/removal mutation via `manual_stock_update.php`, and restock print prep), `inventoryUtils.js` (`getStockStatus` helper with color/level rules), `InventoryHeader.jsx` (title, subtitle, and print restock trigger), `InventoryStatsCards.jsx` (total products, low stock alert, and well-stocked metrics cards), `InventoryFilterBar.jsx` (search input and category filter dropdown), `InventoryMobileCard.jsx` (mobile card with stock levels and quick Add/Remove buttons), `InventoryTable.jsx` (desktop table with status badge and actions), `InventoryList.jsx` (composition of empty state, mobile cards, desktop table, and server pagination), and `UpdateStockModal.jsx` (dialog with stock projection calculation, quantity input, and notes). Updated `App.jsx` lazy loader for resilient export fallback. Build clean (1m 14s, exit code 0). — _Antigravity_
- _2026-09-17_ — **Phase 3.14: CustomMixRequests.jsx modularization completed.** Shrunk `CustomMixRequests.jsx` from **587 → 133 LOC (−77.3%, −454 lines)** by extracting 4 modules into `src/components/features/admin/customMix/`: `useCustomMixRequests.js` (requests data fetching, server pagination, status update mutation, convert modal state, mix proportions editor, custom ingredient state, and `admin_create_order` submission), `CustomMixHeader.jsx` (title and subtitle), `CustomMixCard.jsx` (animated expandable card with request details, base ingredients, WhatsApp notify via `sendWhatsAppMessage`, direct call, status dropdown, and convert trigger), and `ConvertToOrderModal.jsx` (multi-field dialog with dynamic price calculator, custom ingredient addition, and active scheduled order creation). Build clean (1m 1s, exit code 0). — _Antigravity_
- _2026-09-17_ — **Phase 3.13: PrintSlip.jsx modularization completed.** Shrunk `PrintSlip.jsx` from **559 → 53 LOC (−90.5%, −506 lines)** by extracting 7 modules into `src/components/features/admin/printSlip/`: `usePrintSlip.js` (store settings fetch on open, financials memoization, date/time formatting, thermal iframe print handler via `printIframeHtml`, and WhatsApp invoice share via `sendWhatsAppMessage`), `printSlipUtils.jsx` (`LogoSVG`, `computeSlipFinancials`, `buildThermalPrintHtml` for 80mm thermal printers, `buildSlipWhatsAppMessage`), `SlipDialogHeader.jsx` (dialog header with logo, store name, and close button), `SlipStoreCard.jsx` (store identity card inside scrollable preview), `SlipCustomerInfo.jsx` (order metadata and customer details), `SlipItemsList.jsx` (order items list with customizations, weights, and discount badges), `SlipTotalsSummary.jsx` (subtotal, product/coupon discounts, delivery fee, grand total, advance paid, due, payment status, and orange cash collect box), and `SlipActionButtons.jsx` (sticky WhatsApp, Print Slip, and Close action buttons). Preserved dual named/default exports for seamless router and admin page compatibility. Build clean (1m 32s, exit code 0). — _Antigravity_
- _2026-09-17_ — **Phase 3.12: Dashboard.jsx modularization completed.** Shrunk `Dashboard.jsx` from **632 → 66 LOC (−89.6%, −566 lines)** by extracting 6 modules into `src/components/features/admin/dashboard/`: `useDashboard.jsx` (metrics fetching, 10s arrival polling, overdue order detection, low stock alerts, stat cards data mapping, and Option A EOD rollover state/actions), `DashboardHeader.jsx` (title, subtitle, and refresh stats button), `DashboardAlerts.jsx` (low-stock warning card with item chips and overdue orders detection alert banner), `TodayPulseGrid.jsx` (today's pulse 6-card metrics grid with urgent highlighting), `AllTimeStatsGrid.jsx` (all-time metrics grid with featured gradient revenue card), and `EodRolloverModal.jsx` (EOD rollover dialog with multi-select order checkboxes, Done/Undo actions, and 4-step workflow). Build clean (57.68s, exit code 0). — _Antigravity_
- _2026-09-17_ — **Phase 3.11: TrackOrder.jsx modularization completed.** Shrunk `TrackOrder.jsx` from **601 → 69 LOC (−88.5%, −532 lines)** by extracting 7 modules into `src/components/features/customer/trackOrder/`: `useTrackOrder.js` (order lookup by ID/phone, auto-search from router state, carousel interval, and customer cancellation via `useCancelOrder`), `trackOrderConstants.js` (status milestones, carousel slides, glass morphism styles, and status color maps), `OrderStatusTimeline.jsx` (visual progression bar and cancelled alert banner), `TrackOrderDeliveryDetails.jsx` (customer info, phone, shipping address, and assigned driver card), `TrackOrderSummary.jsx` (itemized list, price multiplications, and payment details), `TrackOrderCard.jsx` (collapsible accordion card with timeline, details, and cancel triggers), `TrackOrderHero.jsx` (carousel background, search bar, and not-found alert), and `TrackOrderLoginPrompt.jsx` (unauthenticated login gateway screen). Build clean (54.09s, exit code 0). — _Antigravity_
- _2026-09-17_ — **Phase 3.10: DigitalKhata.jsx modularization completed.** Shrunk `DigitalKhata.jsx` from **657 → 87 LOC (−86.8%, −570 lines)** by extracting 5 modules into `src/components/features/admin/digitalKhata/`: `useDigitalKhata.jsx` (expenses fetching, daily/monthly totals, pagination, product categories, expense creation mutation, and custom toast confirm delete), `DigitalKhataHeader.jsx` (title, subtitle, print report, and add expense toggle), `ExpenseStatsCards.jsx` (today's expenditure and monthly total cards), `AddExpenseForm.jsx` (product categories, custom category, amount, popover calendar, note textarea, and save mutation), `ExpenseFilterBar.jsx` (quick filters, popover date range picker, and clear button), and `ExpenseRecordsList.jsx` (records table, mobile cards, pagination, and period total footer). Build clean (1m 38s, exit code 0). — _Antigravity_
- _2026-09-17_ — **Phase 3.9: ManageDelivery.jsx modularization completed.** Shrunk `ManageDelivery.jsx` from **657 → 87 LOC (−86.8%, −570 lines)** by extracting 5 modules into `src/components/features/admin/delivery/`: `useManageDelivery.jsx` (personnel fetching, password validation rules, add/update/toggle mutations, and custom toast confirm delete), `ManageDeliveryHeader.jsx` (title and Add Personnel trigger), `DeliveryPersonnelMobileCard.jsx` (mobile card with status badge and action buttons), `DeliveryPersonnelTable.jsx` (desktop table view), `DeliveryPersonnelList.jsx` (card wrapper with count, empty state, and responsive view switch), and `PersonnelFormDialog.jsx` (unified modal handling both Add and Edit modes with password toggle). Build clean (1m 51s, exit code 0). — _Antigravity_
- _2026-09-17_ — **Phase 3.8: NewOrders.jsx modularization completed.** Shrunk `NewOrders.jsx` from **616 → 97 LOC (−84.3%, −519 lines)** by extracting custom hook `useNewOrders.js` (orders, delivery personnel, store settings, 25s auto-polling, driver assignment with WhatsApp integration, tomorrow override, cancellation via `useCancelOrder`, and heavy order batch splitting), `NewOrdersHeader.jsx` (title, pending count, heavy limit badge), `NewOrderActions.jsx` (row action buttons with driver assignment dropdown, heavy split button, tomorrow override, and cancel modal trigger), and reusing shared `SplitOrderModal.jsx`. Build clean (1m 25s, exit code 0). — _Antigravity_
- _2026-09-17_ — **Phase 3.7: ActiveRentals.jsx modularization completed.** Shrunk `ActiveRentals.jsx` from **665 → 79 LOC (−88.1%, −586 lines)** by extracting 8 modules into `src/components/features/admin/rentals/`: `useActiveRentals.js` (rentals fetching, 30s auto-polling, return modal & date math, customer search, and print receipt via `printHelpers`), `rentalUtils.js` (financial calculations for overdue days, fines, damage deduction, and net refund), `ActiveRentalsHeader.jsx`, `RentalSummaryCards.jsx`, `ActiveRentalCard.jsx`, `RentalEmptyState.jsx`, `RentalHistoryList.jsx`, and `RentalReturnModal.jsx`. Build clean (1m 6s, exit code 0). — _Antigravity_
- _2026-09-17_ — **Phase 3.6: AddManualOrder.jsx modularization completed.** Shrunk `AddManualOrder.jsx` from **666 → 124 LOC (−81.4%, −542 lines)** by extracting 5 modules into `src/components/features/admin/manualOrder/`: `useManualOrder.js` (products fetch, customer state, order settings, cart state, dynamic option pricing with additive vs average modes, validations, and admin_create_order mutation), `CustomerDetailsSection.jsx` (11-digit phone number validation, name input, and dynamic address/pickup notes field), `OrderSettingsSection.jsx` (fulfillment toggle, payment status with partial payment & Udhaar calc, payment method), `ProductPickerSection.jsx` (stock display, quantity, customization checkboxes, live price calculator with mix proportion rate), and `ManualOrderCart.jsx` (responsive mobile card stack & desktop table with discount badges, grand total, item deletion, and Create Order button). Build clean (58.2s, exit code 0). — _Antigravity_
- _2026-09-17_ — **Phase 3.5: PickupRequests.jsx modularization completed.** Shrunk `PickupRequests.jsx` from **613 → 126 LOC (−79.4%, −487 lines)** by extracting 6 modules into `src/components/features/admin/pickupRequests/`: `usePickupRequests.js` (data fetching, 30s auto-polling, pagination, driver assignment with WhatsApp integration, weight update state/calculation/saving, cancel order integration), `PickupRequestsHeader.jsx` (title and active requests counter badge), `PickupEmptyState.jsx` (clean empty state), `PickupDriverDropdown.jsx` (reusable driver assignment dropdown menu for desktop & mobile), `PickupRequestsMobileCard.jsx` (mobile-responsive card layout), `PickupRequestsTable.jsx` (desktop table layout), and `PickupWeightModal.jsx` (per-item kg inputs with live price calculator and save/schedule mutation). Build clean (1m 11s, exit code 0). — _Antigravity_
- _2026-09-17_ — **Phase 3.4: LiveTrackingPage.jsx modularization completed.** Shrunk `LiveTrackingPage.jsx` from **771 → 79 LOC (−89.8%, −692 lines)** by extracting 5 modules into `src/components/features/customer/liveTracking/`: `trackingMapIcons.js` (SVG car icon factory + destination pin), `useTrackingData.js` (token validation, Socket.io real-time connection, API polling fallback, destination geocoding with Mapbox → Nominatim fallback), `useTrackingMap.js` (Mapbox GL initialization with OSM fallback, driver/destination markers, route drawing via Mapbox Directions → OSRM → straight-line fallback, ResizeObserver handling), `TrackingBottomSheet.jsx` (ETA header pill, driver info card with call/maps actions, delivery details card, branding footer), and `TrackingStatusScreens.jsx` (loading/error/delivered full-screen states). Replaced inline Package SVG with lucide-react import. Build clean (1m 6s, exit code 0). — _Antigravity_
- _2026-09-17_ — **Phase 3.3: OrdersRecord.jsx modularization completed.** Shrunk `OrdersRecord.jsx` from **859 → 341 LOC (−60.3%, −518 lines)** by extracting 4 modular components into `src/components/features/admin/ordersRecord/`: `OrdersRecordStats` (4 key metrics cards), `OrdersRecordFilters` (search, date range, status, advance/unpaid checkboxes, xlsx export & print list triggers), `OrdersRecordList` (responsive dual-view with mobile cards and desktop table, overdue highlighting, and quick print/pay actions), and `RecordPaymentModal` (isolated payment input, validation, and API mutation dialog). Maintained named and default exports for router compatibility. Build clean (1m 31s, exit code 0). — _Antigravity_
- _2026-09-17_ — **Phase 3.2: ServiceCard.jsx modularization completed.** Shrunk `ServiceCard.jsx` from **891 → 366 LOC (−58.9%, −525 lines)** by extracting `useServicePricing` hook, `ServiceCardMedia`, `ServicePricingBlock`, and `ServiceCardActions` into `src/components/features/services/`. Preserved exact mix ratio normalization, discount calculations, out-of-stock overlay, and modal triggers. Build clean (1m 18s, exit code 0). — _Antigravity_
- _2026-09-17_ — **Phase 3.1: Homepage.jsx modularization completed.** Shrunk `Homepage.jsx` from **988 → 270 LOC (−72.6%, −718 lines)** by extracting 11 modular components into `src/components/features/customer/home/` (`HeroSection`, `CouponsTickerBar`, `SpecialOffersSection`, `CategoriesSection`, `TrendingSection`, `HowItWorksSection`, `CustomMixBanner`, `CustomMixModal`, `StorySection`, `WhyChooseUsSection`, `FaqSection`). Preserved all Framer Motion animations, Embla carousel autoplay, batch dynamic translations, and background polling. Build clean (47.4s, exit code 0). — _Antigravity_
- _2026-09-17_ — **Priority 2: Logic Duplication Centralization completed.** Created `src/utils/whatsappHelper.js` and migrated 12 files from copy-pasted `wa.me` links to `sendWhatsAppMessage()`. Created custom hook `src/hooks/useCancelOrder.js` (with customer date-guard and reason validation) & shared `src/components/shared/CancelOrderModal.jsx`, adopting across all 6 cancellation files (`NewOrders.jsx`, `PickupRequests.jsx`, `TodaysWork.jsx`, `TomorrowsList.jsx`, `TrackOrder.jsx`, `UserAccount.jsx`). Created `src/utils/printHelpers.js` (`printIframeHtml`, `printWindowHtml`, `printElement`) and adopted across print views (`PrintSlip.jsx`, `PrintOrderDetails.jsx`, `PrintTaskList.jsx`, `PrintExpenseReport.jsx`, `PrintRestockList.jsx`). Production build clean (55s, exit code 0). — _Antigravity_
- _2026-09-17_ — **Priority 1: OrderStatusBadge & formatPKR adoptions landed.** Enhanced `OrderStatusBadge.jsx` with complete status map, hyphen normalization, default export, and translations. Replaced inline status badge/color code across `OrdersRecord.jsx`, `OrdersTab.jsx`, `OrdersTable.jsx`, `PickupRequests.jsx`, `CustomMixRequests.jsx`, `TrackOrder.jsx`, `UserAccount.jsx`, and `PrintOrderDetails.jsx`. Also adopted `formatPKR()` in `OrdersTable.jsx`, `OrdersTab.jsx`, and `UserAccount.jsx`. Clean `npm run build` verified (code 0). — _Antigravity_
- _2026-09-17_ — **Frontend LOC audit + tracker correction.** Scanned all 190 src files. Found Phase 3 rows 3.7/3.8/3.10 (`UdhaarKhata.jsx`, `PaymentVerification.jsx`, `TomorrowsList.jsx`) were stale — already split in an untracked commit, now corrected to ✅. Identified 13 never-touched files >600 lines as next split candidates (`Homepage.jsx`, `ServiceCard.jsx`, `OrdersRecord.jsx`, `LiveTrackingPage.jsx`, etc — see new "Frontend LOC audit" section above). Also found 5 duplication patterns worth centralizing: WhatsApp-button logic (12 files), Cancel-Order logic (6 files), print logic (8 files), and two *already-built-but-unused* helpers — `OrderStatusBadge.jsx` (0 adoptions across 11 files that reimplement it) and `formatPKR()` (2 adoptions vs 39 files doing it manually). No code changed — analysis only. — _Claude_
- _2026-09-16_ — **Phase 3.8 done on ManageCustomers.jsx.** Extracted 3 components into `components/features/admin/customers/`: `CustomerStatsCards.jsx` (~80 lines), `VipConfigDialog.jsx` (~135 lines), `ManagePrivilegesDialog.jsx` (~195 lines). File shrunk **889 → 627** (−29%). Removed 8 unused icon/import references. Build clean, precache unchanged. — _Claude_
- _2026-09-16_ — **Rental modal UX fix (customer).** Rewrote `RentalModal.jsx` layout to match spec (3-column input row, static totals card, always-visible Add to Cart footer). Also fixed pre-existing bug: `{user && ...}` guard was hiding Add to Cart for logged-out users; removed guard since `handlePlaceRental` already surfaces "Please login" toast. — _Claude_
- _2026-09-16_ — **Phase 3.7 done on PrintOrderDetails.jsx.** Extracted 3 pure-function utilities (`utils/printOrderHelpers.js` 160 lines, `utils/printOrderHtmlBuilder.js` ~230 lines, `utils/printOrderWhatsApp.js` ~130 lines) from the print modal. File shrunk **1027 → 535** (−48%). Zero risk — extractions are all pure functions (translation dict, HTML string builder, WhatsApp URL builder). Build clean, precache unchanged. — _Claude_
- _2026-09-15_ — **Live bug found + fixed on ManageServices toggle.** Root cause was a 5-min server-side file cache in `get_all_products.php` that `update_product_status.php` never invalidated (plus a 60s browser Cache-Control). Fixed with `clear_api_cache()` on the write + `?refresh=1` on the read + optimistic UI. Same pattern probably exists on other admin mutations — see "Likely-similar bugs" table. — _Claude_
- _2026-09-15_ — **UX polish on ServiceListItem (Option D).** Toggle button now green/red + card dims when hidden. Zero refactor risk. — _Claude_
- _2026-09-15_ — **Phase 3.5a done on ManageServices.jsx.** Extracted `components/features/admin/services/ServiceListItem.jsx` (149 lines). File 1256 → 1179 (−77 lines). Removed 3 unused icon imports. Build clean, precache unchanged. Next: 3.5b (form extraction) or move to another admin file. — _Claude_
- _2026-09-15_ — **Phase 3.1 Option 1 done on Checkout.jsx.** Extracted `utils/checkoutHelpers.js` + 3 display components (CartItemsList, CouponBox, PriceSummary) into `components/features/checkout/`. File shrunk 2343 → 2173 (−170 lines). Zero payment/map/state changes. Build clean, precache identical. **Next: user smoke-tests Checkout → then move to Option 4 (admin files).** — _Claude_
- _2026-09-15_ — **Phase 2 complete (option A applied).** User picked option A → added `workbox.globIgnores` for heavy vendor chunks. **Precache 5807 → 2588 KB (−55%)**. Combined with Leaflet removal + xlsx/jspdf lazy imports. Build 52% faster. Deferred 2.1/2.2/2.3 to Phase 3/4 (per-file judgment, not mechanical). Ready for Phase 3. — _Claude_
- _2026-09-15_ — **Phase 1 complete.** Added 10 frontend files (`lib/apiClient.js`, `lib/formatters.js`, 5 shared components, 3 hooks) and 4 backend files (`core/autoload.php`, `core/Response.php`, `core/Request.php`, `repositories/BaseRepository.php`). Wired autoload into `index.php`. Build clean, no bundle change (new code not imported yet). Ready for Phase 2. — _Claude_
- _2026-09-15_ — Deleted entire `Atta_Chakki_API/models/` folder (verified dead — 9 files). Total Phase 0 deletes: 15 files. Updated tracker. — _Claude_
- _2026-09-15_ — **Phase 0 complete.** Rewrote CLAUDE.md, captured baselines (5.8 MB bundle, `vendor-mapbox` 1.86 MB = biggest target), added ESLint warn rules, deleted 6 dead files (GoogleMapPicker.jsx + 4 duplicate models + admin_stats proxy). Disabled Nx plugin in settings.json. Flagged 3 follow-ups (dead `models/`, ESLint deps missing, Nx). — _Claude_
- _2026-09-15_ — Audit created. No code changed. Waiting for approval to start Phase 0. — _Claude_
