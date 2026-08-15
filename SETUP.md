# Arees & Dahab — Setup Guide (after this fix pass)

This zip is the same three apps you had — `storefront/`, `admin/`, `server/`
— now actually wired together. Here's exactly what changed and what you
need to do to run it.

## What was broken and what I fixed

**Backend (`server/`)**
- `.env` had the admin app's CORS origin set to port `5175`, but the admin
  app actually runs on `5174` — every admin request would've been silently
  blocked by CORS. Fixed.
- Generated a real `JWT_SECRET` for you (it was blank).
- Added two missing routes the frontends needed: `GET /api/admin/products/:id`
  (so the admin edit form can load a single product) and
  `GET /api/products/:id/related` (so the storefront's "You May Also Like"
  section has something to call).
- `scripts/createAdmin.js` now reads the admin login from server-side env
  (`ADMIN_USERNAME` / `ADMIN_PASSWORD` in `server/.env.local`) instead of a
  hardcoded default.

**Storefront (`storefront/`)**
- Categories weren't showing their images — the code read `cat.image` but
  the backend field is `image_url`.
- Checkout/contact form errors were silently swallowed; now shown to the
  shopper.
- Added `.env` pointing the app at `http://localhost:5000`.

**Admin (`admin/`)** — this had the most issues:
- Product list was calling the *public* products endpoint, so inactive
  products just disappeared from the admin panel. Now uses `/api/admin/products`.
- The Active/Inactive toggle checked a field (`active`) that doesn't exist
  on the backend (`is_active`) — it always showed "Active" and called an
  endpoint that didn't exist. Fixed.
- **Image upload was fake.** Both the product form and category form only
  did a local file preview — nothing was ever sent to Cloudinary. Now both
  upload the real file to `POST /api/upload` and store the returned
  Cloudinary URL.
- Orders and Dashboard pages read `o.date` / `o.customer` / `o.total`,
  none of which exist — the real fields are `created_at` / `customer_name`
  / `total_amount`. Fixed.
- Category create/edit sent `{ image }` instead of `{ image_url }`.
- Login errors were swallowed (an uncaught rejection); now shown on the
  login form.
- Added session verification on load and auto-logout if your token expires,
  and added `.env` pointing the app at `http://localhost:5000`.

The backend's own logic (routes, controllers, RLS policies, auth) was
already solid — nothing there needed fixing beyond the two missing routes
above.

## Steps to run it

### 1. Database (Supabase)
In your Supabase project's SQL editor, run, in order:
```
server/db/schema.sql
server/db/seed.sql       (optional — Arees/Dahab + starter categories)
```

### 2. Backend
```bash
cd server
npm install
```
Open `server/.env` and paste in your real values for:
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```
(`JWT_SECRET` and the CORS URLs are already filled in — leave them.)

Set the admin login in `server/.env.local` (gitignored, never committed):
```
ADMIN_USERNAME=you@example.com
ADMIN_PASSWORD=your-password
```
These credentials are validated server-side only. To also create the admin's
row in the database (used by the existing users-table employee flow), run:
```bash
npm run create-admin
```
Then start the server:
```bash
npm run dev        # http://localhost:5000
```

### 3. Storefront
```bash
cd storefront
npm install
npm run dev         # http://localhost:5173
```

### 4. Admin
```bash
cd admin
npm install
npm run dev         # http://localhost:5174/admin/login
```
Log in with the `ADMIN_USERNAME` / `ADMIN_PASSWORD` set in `server/.env.local`.

## Confirming the "edit in admin → changes on site" flow works

1. In the admin, edit a product's price or upload a new image, save.
2. Refresh the storefront's Shop page or that product's detail page —
   the new price/image should appear immediately (both read from the same
   Supabase table; there's no caching layer in between).
3. Same for categories: edit a category's image/name in the admin, then
   check the Home page and `/categories` on the storefront.

## Note on `node_modules`

This zip does **not** include `node_modules` (they're OS-specific and
bloat the download) — run `npm install` in each of `server/`, `storefront/`,
and `admin/` before starting.
