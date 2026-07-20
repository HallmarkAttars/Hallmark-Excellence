# Arees & Dahab — Backend API

Node.js + Express + Supabase + Cloudinary. Serves the existing storefront
and admin React frontends — no frontend code lives here.

## Setup

1. **Create the database.** In your Supabase project's SQL editor, run
   `db/schema.sql` (tables + RLS policies), then optionally `db/seed.sql`
   (Arees/Dahab brands + starter categories).

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment.** Copy `.env.example` to `.env` and fill in your
   real Supabase, Cloudinary, and JWT values:
   ```bash
   cp .env.example .env
   ```

4. **Create your first admin user:**
   ```bash
   # edit the email/name/password constants at the top of the file first
   node scripts/createAdmin.js
   ```

5. **Run the server:**
   ```bash
   npm run dev     # nodemon, auto-restarts on change
   # or
   npm start        # plain node
   ```
   Server listens on `PORT` from `.env` (default 5000).

## Auth model

- `POST /api/auth/login` returns a JWT (7-day expiry). The admin frontend
  should store it and send it as `Authorization: Bearer <token>` on every
  `/api/admin/*` and `/api/upload` request.
- `POST /api/auth/verify` is a protected route the admin frontend can call
  on page load/refresh to check the stored token is still valid.

## Route map

Public (storefront):
- `GET /api/health`
- `GET /api/products` (?category_id, ?brand_id, ?search, ?sort=price_asc|price_desc)
- `GET /api/products/:id`
- `GET /api/categories`
- `GET /api/categories/:slug/products`
- `GET /api/brands`
- `GET /api/brands/:slug/products`
- `POST /api/orders`

Admin (JWT required):
- `POST /api/auth/login`, `POST /api/auth/verify`
- `GET /api/admin/stats`
- `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `PATCH /api/admin/orders/:id/status`
- `GET /api/admin/products`, `POST /api/admin/products`, `PATCH /api/admin/products/:id`, `DELETE /api/admin/products/:id`
- `GET /api/admin/categories`, `POST /api/admin/categories`, `PATCH /api/admin/categories/:id`, `DELETE /api/admin/categories/:id`
- `POST /api/upload` (multipart, field name `image`)

## Notes

- All Supabase calls use the **service role key**, which bypasses Row Level
  Security — this is safe only because this key is never sent to, or used
  in, any browser-facing code.
- Product/category images are uploaded to Cloudinary first via `POST
  /api/upload`, and the returned `secure_url` is what gets stored in the
  `images` / `image_url` columns — this server does not accept raw image
  bytes on the product/category create/update endpoints themselves.
