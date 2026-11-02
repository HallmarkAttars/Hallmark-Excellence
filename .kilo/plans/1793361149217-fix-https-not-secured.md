# HTTPS/SSL plan — "site is not secured" fix

**Goal:** Ensure `https://www.areesperfumes.in` (and the apex `areesperfumes.in`) load over HTTPS with a valid cert, force all HTTP traffic to HTTPS, eliminate mixed-content warnings, and confirm via browser/GSC that the site reports as secure.

**Key context (verified from repo):**
- The storefront is a Vite SPA hosted on **Vercel** (`storefront/vercel.json` exists).
- Canonical/schema/og URLs already use `https://www.areesperfumes.in`.
- Vercel provides free automatic SSL/HTTPS for custom domains — HTTPS should already be active if the domain is added in Vercel.
- The "not secured" symptom is therefore almost certainly a **redirect / HSTS / apex-vs-www / mixed-content** configuration issue, not a missing certificate.
- Backend: Express on `server/` (Render per `.env.example` comments, or local `:5000`). Not the primary website host.

## Decision points to resolve with the user (ask one at a time)

Q1. Is the domain (`www.areesperfumes.in` / `areesperfumes.in`) already added in the Vercel project (Project Settings → Domains), and does Vercel show a valid, issued SSL certificate for it?
- Recommended answer: Verify in Vercel dashboard → Project → Settings → Domains. If not added, add both `areesperfumes.in` and `www.areesperfumes.in` (apex auto-creates www redirect or vice versa depending on configuration).
- This determines whether HTTPS is even enabled at the edge.

Q2. When visiting `http://www.areesperfumes.in`, does the browser auto-redirect to `https://www.areesperfumes.in`? If not, what happens?
- Recommended answer: Enable an HTTP→HTTPS redirect at the Vercel domain layer (apex redirect to www or www→apex canonical + HTTPS).

Q3. Is the reported "not secured" on the live `www.areesperfumes.in` domain, a Vercel preview/branch deploy (`*.vercel.app`), or a local dev server (`localhost:5173`)?
- Recommended answer: Live production domain is the priority; preview and localhost are secondary/local-only and do not need public HTTPS certificates.

## Plan (implementation-ready once Q1–Q3 confirmed)

1. **Verify Vercel domain + SSL**
   - Open Vercel project → Settings → Domains.
   - Confirm `www.areesperfumes.in` and `areesperfumes.in` are listed and status is "Configured" / valid certificate issued.
   - If missing, add both custom domains; wait for certificate issuance (automatic, free).

2. **Enforce HTTPS redirect at the edge (Vercel)**
   - Add/verify an HTTP→HTTPS redirect for both apex and www in Vercel project settings (domains redirect config), OR implement via `vercel.json` redirects with `status: 308` for `http://` → `https://`.
   - Pick one canonical host (www or apex) and 308 the other to it over HTTPS to avoid duplicate-content/index-splitting in GSC.

3. **Add HSTS header (Vercel)**
   - Add a headers entry in `vercel.json` for the root path with `Strict-Transport-Security: max-age=31536000; includeSubDomains` so browsers always use HTTPS after the first visit.

4. **Fix mixed content (storefront)**
   - Audit `storefront/` for any hardcoded `http://` asset/API references that break on HTTPS pages:
     - `storefront/index.html` preconnects to `https://api.areesperfumes.in` and `https://res.cloudinary.com` — already HTTPS.
     - `storefront/src/config/assets.js` — check image base URLs are protocol-relative or `https`.
     - `storefront/.env.production` — `VITE_API_BASE_URL=https://api.areesperfumes.in/api` — already HTTPS.
   - Replace any remaining `http://` with `https://` or protocol-relative `//`.

5. **Validate**
   - Open `https://www.areesperfumes.in/` in Chrome DevTools Security tab; confirm certificate valid, connection secure, no mixed-content warnings.
   - Open `http://www.areesperfumes.in/`; confirm it redirects to `https://`.
   - Run GSC URL Inspection on the homepage; confirm HTTPS indexing.
   - Confirm no "Not secure" indicator in the browser address bar.

## Rollback / fallback
- If Vercel certificate issuance fails, check DNS records (A/CNAME) point to Vercel and domain is verified; retry.
- If `vercel.json` redirect rules conflict with existing rewrites, order `redirects` before `rewrites` and test with `vercel dev`/`vercel build` locally before pushing.

## Open questions (must be answered before implementation)
- Q1, Q2, Q3 above. Until confirmed, no source/mutating changes should be made (permissions currently restrict edits/mutations anyway).
