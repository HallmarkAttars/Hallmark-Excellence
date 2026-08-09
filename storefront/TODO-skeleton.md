# Skeleton Loading + Cold-Start Notice — Task Tracker

## 1. Skeleton components (`storefront/src/components/skeleton/`)
- [x] `SkeletonBase.css` — shared shimmer/pulse animation + reduced-motion fallback
- [x] `SkeletonProductCard.jsx` — matches ProductCard.jsx layout/dimensions
- [x] `SkeletonProductGrid.jsx` — renders N cards in the real `grid-products` container
- [x] `SkeletonProductDetail.jsx` — matches ProductDetail.jsx layout
- [x] `SkeletonCategoryGrid.jsx` — matches CategoryGrid/Categories.jsx category-card shape

## 2. Wire into existing pages (presentational only)
- [x] `ProductGrid.jsx` — replace `loading-state` with `<SkeletonProductGrid />`
- [x] `ProductDetail.jsx` — replace `loading-state` with `<SkeletonProductDetail />`
- [x] `Categories.jsx` — replace `loading-state` with `<SkeletonCategoryGrid />`
- [ ] `Shop.jsx` — wire slow-load notice next to the skeleton grid

## 3. "Server waking up" notice
- [ ] `storefront/src/hooks/useSlowLoadNotice.js` — the 4s-delayed hook
- [ ] `SlowLoadNotice.jsx` + CSS — dismissible inline banner
- [ ] Wire into `Shop.jsx`

## 4. Warm-up ping (recommended)
- [ ] Add fire-and-forget `GET /api/health` on app mount in `App.jsx`

## 5. Verify
- [ ] No layout shift (skeleton uses real grid classes)
- [ ] Slow notice hidden on fast (<4s) load
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive breakpoints match (2/3/4/5-col)

