# Home.jsx Skeleton Loading State — Task List

## Steps
- [x] Explore repo: read Home.jsx, skeleton components, Shop.jsx, home components (CategoryGrid, CollectionBanner, SocialStrip, FeaturedProducts), index.css, api.js, App.jsx
- [x] Confirm plan with user
- [x] Create `SkeletonCollectionBanner.jsx` (reuses SkeletonBase shimmer)
- [x] Create `SkeletonCollectionBanner.css` (scoped layout, no new keyframes)
- [x] Create `SkeletonSocialStrip.jsx` (reuses SkeletonBase shimmer)
- [x] Create `SkeletonSocialStrip.css` (scoped layout, no new keyframes)
- [x] Edit `Home.jsx`: add `loading` state via `Promise.allSettled`, wire `useSlowLoadNotice` + `SlowLoadNotice`, render skeleton placeholders while loading with exact same conditional sections when done
- [x] Verify build/lint passes (vite build → BUILD_OK)
