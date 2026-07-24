# API Configuration Fix - TODO

## Completed Steps

- [x] Audit all source files for `localhost:5000` references
- [x] Create fix plan and get approval

## Remaining Steps

- [ ] Fix 1: `admin/src/services/api.js` - Replace fallback URL
- [ ] Fix 2: `storefront/src/services/api.js` - Replace fallback URL
- [ ] Fix 3: `admin/.env` - Replace development URL
- [ ] Fix 4: `admin/.env.example` - Update example URL
- [ ] Fix 5: `storefront/.env.example` - Update example URL
- [ ] Build `admin/` and verify no localhost in dist
- [ ] Build `storefront/` and verify no localhost in dist
- [ ] Final confirmation

