# TODO: Implement Product Variants in Admin Panel

## Steps
- [x] Analyze current ProductForm, mockApi, backend variants support
- [x] Confirm plan with user (refinements applied)

## ProductForm.jsx
- [x] Add `variants` state + UNITS constants
- [x] Add addVariant / updateVariant / removeVariant / default helpers
- [x] Searchable Unit combobox (preset + custom typing)
- [x] Load existing variants in edit mode
- [x] Validation (≥1 variant, exactly 1 default, no dup quantity+unit, price>0, stock>=0)
- [x] Disable Price field when variants exist + helper message
- [x] Send `variants[]` in payload on save

## ProductForm.css
- [x] Style variant section, cards, combobox, radio, delete trash

## Verify
- [x] Confirm HMR / build works (vite build succeeded)

# Storefront Product Variants on Product Details Page

## ProductDetail.jsx
- [x] Add selectedVariant state (default or first variant)
- [x] "Select Quantity" section with variant buttons
- [x] Price from selectedVariant.price (never product.price if variants exist)
- [x] Stock from selectedVariant.stock (In Stock / Only X left / Out of Stock)
- [x] Disable Add to Cart at stock 0; prevent qty > stock
- [x] Add to Cart sends complete variant info

## CartContext.jsx
- [x] Store complete variant info in cart item
- [x] Subtotal uses selected variant price

## ProductDetail.css
- [x] Style variant buttons (#5C0634 active, light maroon hover)
- [x] Responsive wrapping (2-3 mobile, 3-6 desktop, 12px gap)

## Verify
- [x] Build compiles (vite build succeeded)
