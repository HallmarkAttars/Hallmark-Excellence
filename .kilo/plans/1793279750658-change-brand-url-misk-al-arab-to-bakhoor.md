# Plan: Change URL from /brand/misk-al-arab to /brand/bakhoor

## Goal
Change the URL of "https://www.areesperfumes.in/brand/misk-al-arab" to "https://www.areesperfumes.in/brand/bakhoor" without changing other functions.

## Analysis
The codebase has brand slug mapping utilities that handle public vs API slugs. Found in `storefront/src/utils/brandSlug.js`:
```js
const BRAND_API_SLUGS = new Map([
  ['arees-luxury', 'oud-al-haramain'],
])

const BRAND_PUBLIC_SLUGS = new Map([
  ['oud-al-haramain', 'arees-luxury'],
])
```

When building URLs, components use `brandPublicSlug()` to get the public-facing slug. When fetching from API, they use `brandApiSlug()` to map to the actual API slug.

So to make `/brand/misk-al-arab` accessible as `/brand/bakhoor` (and have links generated as `/brand/bakhoor`), we need to add mappings:
- Map API slug `misk-al-arab` → public slug `bakhoor` (so links show /brand/bakhoor)
- Map public slug `bakhoor` → API slug `misk-al-arab` (so when visiting /brand/bakhoor, it fetches correctly)

## Changes needed
1. **storefront/src/utils/brandSlug.js** - Add mappings:
```js
const BRAND_API_SLUGS = new Map([
  ['arees-luxury', 'oud-al-haramain'],
  ['bakhoor', 'misk-al-arab'],
])

const BRAND_PUBLIC_SLUGS = new Map([
  ['oud-al-haramain', 'arees-luxury'],
  ['misk-al-arab', 'bakhoor'],
])
```

This is the core change - all code using `brandPublicSlug()` will generate `/brand/bakhoor` and `brandApiSlug()` will correctly resolve it to fetch from the API.

## Verification
- Visiting `/brand/bakhoor` will work (mapped to API slug `misk-al-arab`)
- Visiting `/brand/misk-al-arab` will still work (brandApiSlug returns it as-is if not in API map, but better to add both directions; also need to ensure it resolves correctly)
- All existing links will now point to `/brand/bakhoor` 
- No other functionality changes

## Implementation
Only modify `storefront/src/utils/brandSlug.js`. This affects all brand URL generation across the storefront. The API/backend still uses the original slug `misk-al-arab` which is correct per the mapping.
