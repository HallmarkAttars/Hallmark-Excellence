# Fix Plan: Database Schema Alignment

## Step 1: Fix Server Controllers
- [ ] `categories.controller.js` - Use `image` instead of `image_url`, remove `display_order` ordering
- [ ] `products.controller.js` - Use `image` (single string) instead of `images` (array), remove `compare_at_price`
- [ ] `brands.controller.js` - Remove `compare_at_price` references

## Step 2: Create Missing Tables & Admin User
- [ ] Create `admin_users` table via Supabase REST API
- [ ] Create `orders` table via Supabase REST API
- [ ] Seed admin user (`admin@gmail.com` / `admin321`)

## Step 3: Restart Server & Verify
- [ ] Restart server (nodemon picks up changes)
- [ ] Test API endpoints work
- [ ] Open storefront and admin in browser

