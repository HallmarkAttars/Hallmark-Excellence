# Featured Products Attractiveness Plan

**Goal:** Make the Featured Products section more attractive — stronger branding/headline, better scent-first copy, richer call-to-action, and more prominent featured-item presentation — without breaking the existing continuous 3D circular orbit carousel or its responsive behavior.

**Target user ask:** "FEATURED PRODUCTS — Scents, made by hand — oud, rose and amber from our atelier in areesperfumes.in, give what are the changes to get more attractive FEATURED PRODUCTS"

---

## Current state (verified from source)

**Section header** — `storefront/src/components/home/FeaturedProducts.jsx:8-68`
- Title: `HOME_FEATURED.title` = 'Featured Products' (`storefront/src/data/content.js:119-122`)
- Subtitle: Hardcoded `'Scents, made by hand — oud, rose and amber from our atelier.'` (line 49)
- View-all link: hidden on mobile (<1024px), points to `/shop`, label 'View All' (lines 51-56)
- Carousel: `FeaturedProductsCarousel` receives `allFeatured` (min 8 items, padded from full list if fewer than 8 explicit featured products)

**Carousel** — `storefront/src/components/home/FeaturedProductsCarousel.jsx`
- Continuous 3D circular orbit, 22-second rotation (`line 43`)
- Center product scales up to 1.20×; side/back items blur and scale down
- No prices shown (by design — cards deliberately hide prices until product page)
- Bottles upright, name + category below each bottle

**CSS** — `FeaturedProducts.css` + `FeaturedProductsCarousel.css`
- Section background: `--cream` (`#fbf9f5`)
- Title color `#85591a` (dark gold/brown), subtitle `var(--charcoal)`
- Mobile: fonts smaller, orbits narrower, filters disabled under 768px

**Data fetch** — `storefront/src/services/mockApi.js:57-81`
- `getFeaturedProducts({ limit: 18 })` fetches featured products via `?summary=true&featured=true&limit=18`

---

## Recommended changes

All changes limited to Featured Products section files only.

### 1. Section header copy & layout (`FeaturedProducts.jsx` + `content.js` + `FeaturedProducts.css`)

**a) Update HOME_FEATURED** in `storefront/src/data/content.js`:
- `title`: `'Featured Products'` → `'Featured Fragrances'` (keeps section short, scent-forward)
- Add `subtitle`: `'Scents, made by hand — oud, rose and amber from our atelier.'` (move from hardcoded in JSX to centralized content)
- Add `viewAll.to`: `/shop` (keep, but add `viewAll.label`: `'Browse All Featured'`)

**b) Update FeaturedProducts.jsx** to read subtitle from `HOME_FEATURED.subtitle` instead of hardcoded string.

**c) Add a "Browse all" intent nudge**: keep existing view-all link but make it more visible — show it on all breakpoints (not just desktop) at full width or as a centered pill below the carousel. Use `HOME_FEATURED.viewAll.label`.

**d) CSS tweaks** in `FeaturedProducts.css`:
- Increase section padding slightly for breathing room
- Make `featured-view-all-link` visible on all screens (`display: inline-flex` at all breakpoints, not just 1024px), center-aligned below the carousel divider
- Consider a subtle gold accent under the title (short border-bottom on `.featured-title-text`)

### 2. Carousel / featured-item prominence (`FeaturedProductsCarousel.jsx` + `FeaturedProductsCarousel.css`)

**a) Add price hint to front-center product only** (optional but high impact)
- The current design deliberately hides prices on cards (`ProductCard.jsx:79-84`). For the orbit, show price only on the front-center active item beneath the category line, e.g. `from ₹XXX` using `getDefaultVariant`/`getStockStatus`. Keep side/back items price-free.
- This draws the eye to the featured selection without cluttering the orbit.

**b) Strengthen the active/front product visual**
- Increase center scale max slightly (e.g. `1.20` → `1.30`) and/or add a subtle outer glow on `.is-active-front` bottle container
- Make front-center name even more prominent (already 1.15–1.25rem; fine)

**c) Improve item info legibility on back/side items**
- Side items have opacity 0.8–0.9, back items softer. Ensure name/category text contrast remains readable (`text-shadow` already present)

**d) Keep rotation feel but make it more "luxury"**
- `rotationDuration` 22s is fine — slow is premium. Keep.
- Add optional manual-rotation indicator already present (dots + arrows exist)

### 3. Data/fetch behavior (`Home.jsx` + `mockApi.js`) — minor

**a) Limit to 8–10 featured for impact**
- `getFeaturedProducts({ limit: 18 })` fetches 18; the orbit shows all. For a more curated feel, reduce to `limit: 10` so the carousel isn't overcrowded. (Or keep 18 if inventory supports it — decision point below.)
- Keep `summary=true` fast path (no variants/descriptions — correct for cards)

### 4. Accessibility & polish

- Keep `aria-label` on orbit items (already present)
- Keep keyboard Enter/Space support (already present)
- Add `prefers-reduced-motion` handling already in place

---

## Open decision — needs your confirmation

**Q1: Price visibility on featured items?**  
The current design intentionally hides prices on cards/variants until the product page. For the Featured orbit, show price (`from ₹XXX`) only on the front-center active product. Recommended: Yes — helps conversion without cluttering side items.
- Recommended: Yes, show price on front-center item only

**Q2: Number of featured products in orbit?**  
Currently `limit: 18`, padded to min 8. Recommended: `limit: 10` — curated, not overwhelming. Fewer items = each gets more spotlight time in the 22s rotation.
- Recommended: 10

**Q3: Section title?**  
`'Featured Products'` → `'Featured Fragrances'` to match scent-first copy.
- Recommended: Yes

---

## Implementation tasks (implementation-capable agent)

1. `storefront/src/data/content.js` — Update `HOME_FEATURED`: title, add subtitle + viewAll label
2. `storefront/src/components/home/FeaturedProducts.jsx` — Read subtitle from `HOME_FEATURED.subtitle`; show view-all link at all breakpoints
3. `storefront/src/components/home/FeaturedProducts.css` — Make view-all link visible on mobile; add title accent
4. `storefront/src/components/home/FeaturedProductsCarousel.jsx` — Optional: show price on front-center active product (import `getDefaultVariant` from `utils/productPricing`); increase center scale max
5. `storefront/src/components/home/FeaturedProductsCarousel.css` — Front-center glow/scale tweaks if needed
6. `storefront/src/pages/Home.jsx` — Change `getFeaturedProducts({ limit: 18 })` → `limit: 10`
7. Run `npm test` (vitest) + `npm run build` in storefront to verify no regressions

---

## Validation

- `storefront`: `npm run test` passes (existing FeaturedProducts tests must still pass — update mocks if price rendering changes break assertions)
- `storefront`: `npm run build` passes
- Visual: section loads without horizontal overflow; orbit rotates smoothly; front-center product distinct; view-all link visible

---

## Rollback

- Revert `content.js`, `FeaturedProducts.jsx`, `FeaturedProductsCarousel.jsx`, `Home.jsx` to prior state; no other files touched
