# Arees & Dahab — Perfume E-commerce (Frontend Only)

Two independent React (Vite) apps, mock data + localStorage only, no backend calls yet.

## Structure

```
perfume-ecommerce/
├── storefront/   customer-facing site (port 5173)
└── admin/        admin dashboard (port 5174)
```

They are separate apps on purpose — separate `package.json`, separate bundles,
separate dev servers. Nothing in the storefront links to the admin app.

## Running locally

Each app is installed and run independently:

```bash
cd storefront
npm install
npm run dev        # http://localhost:5173

cd ../admin
npm install
npm run dev        # http://localhost:5174/admin/login
```

Admin login is fake for now — any non-empty email/password logs you in
(`src/context/AuthContext.jsx` + `src/services/mockApi.js login()`).

## Where the real backend plugs in

All data access goes through `src/services/mockApi.js` in each app. Every
function is already `async` and returns a Promise, matching what a real
`fetch()`/`axios` call would return. To connect the Express API later:

1. Replace the body of each function in `mockApi.js` with a real HTTP call.
2. Leave every component untouched — they only ever call functions from this
   file, never `fetch` directly.
3. Swap the admin's fake `login()` for a real JWT call, and add a token to
   whatever request layer you introduce (axios instance, fetch wrapper, etc).

## Mock data

`src/data/*.json` in each app — `products.json`, `categories.json`,
`brands.json` (Arees & Dahab), plus `orders.json` in the admin app. The admin
app persists edits (add/edit/delete product, category, order status changes)
to `localStorage` so the dashboard feels alive across refreshes; storefront
cart also persists to `localStorage` via `CartContext`.

## Design

Storefront: warm cream/blush/gold/charcoal palette, Cormorant Garamond
(serif headings) + Jost (sans body) — see `src/index.css` in each app for
the token list.

Admin: dark charcoal sidebar with gold accent, cream content area, same
type pairing, per the "MAISON"-style reference in the brief.

## Notes / known gaps (frontend-only pass)

- Image "upload" is preview-only via `FileReader` — no actual storage.
- Contact page checkout flow (`/contact` reached from Cart's "Confirm Order")
  logs the order to console and shows a fake order number; nothing is sent
  anywhere yet.
- No real auth, payment, or persistence beyond `localStorage`.
