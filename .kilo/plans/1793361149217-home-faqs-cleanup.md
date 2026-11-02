# Security Vulnerability Analysis — Arees Perfumes Storefront + Server

**Goal:** Analyze all functions across the storefront (React/Vite SPA) and server (Express + Supabase) for vulnerabilities, then remediate. Produce an implementation-ready plan for a code-capable agent.

**Scope:** `storefront/` (frontend) and `server/` (backend API). Admin app out of scope unless referenced by shared server routes.

---

## Files analyzed (read-only)

- `storefront/src/services/api.js`
- `storefront/src/pages/Contact.jsx` (+ `contactForm.js`)
- `storefront/src/pages/ProductDetail.jsx`
- `storefront/src/pages/Cart.jsx`
- `storefront/src/context/CartContext.jsx`
- `storefront/src/components/seo/SEO.jsx`
- `storefront/src/components/product/ProductCard.jsx`
- `server/src/app.js`
- `server/src/routes/orders.routes.js`
- `server/src/controllers/orders.controller.js`
- `server/src/middleware/auth.middleware.js`
- `server/src/middleware/rateLimit.js`

---

## Vulnerabilities found (ranked)

### HIGH

**H1 — Client-side trust of pricing/cart snapshot (storefront)**
- `Contact.jsx` checkout builds the order payload from frontend `checkout.checkoutItems` (which came from `CartContext` / localStorage). Unit prices, subtotals, totals, variant pieces, and brand-bulk state are all derived in the frontend and sent to `/api/orders`.
- `server/src/controllers/orders.controller.js:createOrder` correctly **recomputes all pricing from database product/variant rows** and ignores frontend-supplied prices. So the server is NOT vulnerable to price tampering, BUT the frontend can still submit a `paymentMethod` value, `idempotency_key`, `city`/`state`/`locality`, and the `address` that become part of the stored `notes`. The frontend `submitOrder` also sends `payload.items` built from cart snapshot.
- Risk: a malicious/localStorage-tampered user can submit crafted `items` (e.g. wrong `variant_id`, inflated `quantity`, or bogus `unit_price`) — the server validates product existence and recomputes price from DB, so the **financial impact is mitigated**. However, malformed `items` could cause unexpected order snapshots or front-end validation gaps (e.g. `unit_price` NaN → `round2` → 0).
- Severity: MEDIUM on server side (mitigated), HIGH on client-side integrity (order snapshot could lie to customer).

**H2 — PII in generic error detail leaking (server)**
- `server/src/controllers/orders.controller.js:createOrder:762-766`: on a generic Supabase error, the response includes `detail: error.message`, `code: error.code`. Comment at `updateOrderStatus:1009-1011` explicitly notes PostgREST `details` can embed customer PII — but `createOrder` still returns `detail` and `code` to the client on 500.
- Severity: MEDIUM — PII could leak to the requester (the customer who placed the order) and to logs. Combined with rate limiting this is lower risk but still a leak.

### MEDIUM

**M1 — No CSRF protection on state-changing endpoints (server)**
- `/api/orders` (POST), `/api/auth/*`, `/api/admin/*` (PATCH/DELETE) accept JSON body via `fetch` with `Content-Type: application/json`. No `SameSite` cookie enforcement because auth is JWT in localStorage (not cookies) — so classic CSRF via cookie is not applicable. **However**, a malicious site can trigger a `fetch` with `Content-Type: text/plain` (simple request) that bypasses preflight but Express `express.json()` won't parse it. With `application/json` a preflight is required; CORS restricts origins to known storefronts/admin. **CSRF risk is low because auth is Bearer JWT (not sent automatically by browser)**. Mark as LOW/accepted, not a fix item.

**M2 — Order tracking phone enumeration via generic 404 (server)**
- `/api/orders/track` returns identical generic 404 for missing order OR wrong phone. Good — no enumeration leak. **No fix needed.**

**M3 — Rate limits use `req.ip` behind trust proxy=1 (server)**
- `rateLimit.js:clientKey` uses `req.ip`. `app.js` sets `trust proxy = 1`. This is correct for single-proxy (Render). **No fix needed**, but document assumption: if deployed behind multiple proxies, `trust proxy` must be set to the correct count.

**M4 — localStorage cart/wishlist persistence (storefront)**
- Cart stored in `localStorage` (`ad_cart_v1`, `ad_wishlist_v1`). Vulnerable to XSS exfiltration and client-side tampering. Cart is a snapshot re-validated on checkout by server. Wishlist is purely cosmetic. No sensitive PII stored. **LOW — document, no code fix unless XSS mitigations added.**

**M5 — Formspree endpoint hardcoded in frontend (storefront)**
- `contactForm.js:FORMSPREE_ENDPOINT = 'https://formspree.io/f/mjybybdy'` is public. Anyone can POST to it. It only accepts name/email/phone/message (4 fields, no auth data). **LOW — no secrets exposed.**

**M6 — Google Maps iframe `allowFullScreen` without `sandbox` (storefront)**
- `Contact.jsx:1268-1274` embeds Google Maps iframe with `allowFullScreen` and no `sandbox` attribute. Google Maps is a trusted third party, but `allowFullScreen` expands attack surface slightly. **LOW.**

**M7 — `target="_blank"` with `rel="noopener noreferrer"` (storefront)**
- `Contact.jsx:1275-1282` correctly uses `rel="noopener noreferrer"`. **No fix needed.**

**M8 — No Content Security Policy (storefront)**
- `storefront/index.html` has no CSP header. Vercel `vercel.json` defines cache headers but no CSP. Inline scripts exist (GA4, Seorce, `document.documentElement.classList.add`). Without CSP, XSS could execute inline. **MEDIUM.**

**M9 — Order number generation is predictable (server)**
- `generateOrderNumber` uses `Math.random()` (6-digit, `ORD-` + 100000–900000). Not cryptographically random. Combined with tracking requiring phone too, enumeration risk is low, but `Math.random` is not CSPRNG. **LOW.**

**M10 — Email validation DNS check is fail-open (server)**
- `validateEmailWithHost` is fail-open (DNS blip never blocks checkout; only nonexistent domains rejected). This is intentional and documented. **No fix needed.**

**M11 — Non-atomic read-then-update on order status notes (server)**
- `updateOrderStatus` reads `notes`, mutates, writes back. Two concurrent admin status changes could lose one notes write. Comment acknowledges this as acceptable for low-frequency admin actions. **LOW.**

**M12 — Supabase service key in server env (server)**
- `server/.env.example` requires `SUPABASE_SERVICE_KEY`. Server uses service role (bypasses RLS). If leaked, full DB access. This is standard for server-side Supabase usage; key must not be committed. `server/.env.local` is gitignored. **No code fix — operational security item.**

### LOW / Accepted (documented, no fix)

- M1 CSRF (JWT in localStorage, CORS-restricted).
- M3 rate-limit proxy assumption.
- M4 localStorage tampering (re-validated server-side).
- M5 Formspree public endpoint (no secrets).
- M7 `noopener noreferrer` present.
- M8 DNS fail-open (intentional).
- M9 predictable order number (phone also required for tracking).
- M10 DNS fail-open intentional.
- M11 non-atomic notes write (accepted).
- M12 service key operational security.

---

## Remediation plan (implementation-capable agent)

### Files to change

| File | Change |
|------|--------|
| `server/src/controllers/orders.controller.js` | Remove `detail` and `code` from the 500 error response (line 762-766). Return only generic `{ error: 'Failed to place order.' }`. Keep full error in server logs only. |
| `storefront/index.html` | Add a Content Security Policy `<meta http-equiv="Content-Security-Policy">` (or Vercel `vercel.json` headers) that allows: self, scripts.seorce.com, googletagmanager.com, res.cloudinary.com, api.areesperfumes.in, formspree.io, fonts.gstatic.com / Google Fonts, and inline scripts only via nonce or `'unsafe-inline'` for GA4/Seorce. Prefer nonce-based or hash-based where feasible; fallback `'unsafe-inline'` for inline GA4/Seorce scripts with `script-src` listing trusted domains. |
| `storefront/src/components/home/HomeFaqs.jsx` | No change — already fixed heading. |
| `server/src/controllers/orders.controller.js` | Optionally replace `Math.random()` with `crypto.randomInt` for order number. Low priority. |

### Tasks
1. Edit `server/src/controllers/orders.controller.js` — strip PII-leaking fields from 500 response.
2. Add CSP to `storefront/index.html` (meta tag) and/or `vercel.json` headers.
3. Run `npm run test` and `npm run build` in storefront; run server lint if available.
4. Commit + push to `origin/master` (Vercel auto-deploys storefront; Render auto-deploys server if connected).

### Validation
- `npm run test` → all pass (532 tests).
- `npm run build` → succeeds.
- Confirm 500 error on `/api/orders` no longer returns `detail`/`code`.
- Confirm CSP header present on live site (browser DevTools → Network → `index.html` response headers).

### Rollback
- Revert `orders.controller.js` 500 response change and CSP addition. No database migration required.

### Open decision
- CSP: use `'unsafe-inline'` for GA4/Seorce inline scripts (simplest) vs nonce/hash (stricter, requires build-step script injection). Recommend `'unsafe-inline'` with domain allowlist as first step; tighten later.

---

**Plan file:** `.kilo/plans/1793361149217-home-faqs-cleanup.md` (reused path per instructions). Implementation must be done by switching to a code-capable agent — I cannot modify files or run mutating commands in plan mode.
