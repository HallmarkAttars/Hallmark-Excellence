# TODO: Full Product Variant support in Checkout, Orders, Admin Orders, Order History

## Goal
Persist a complete snapshot of every purchased item inside `orders.items` (JSONB) and display it across checkout, admin orders, and order history. Never fetch current product/variant data for completed orders — always use the saved snapshot. Legacy orders (no variants) keep working.

## Checkout (storefront/src/pages/Contact.jsx)
- [x] Map each cart item to snapshot shape: product_id, product_name, image, quantity, unit_price, subtotal, variant_id, variant_label, quantity_value, quantity_unit
- [x] unit_price = selected_price (variant price if variant, else product.price); subtotal = unit_price × quantity
- [x] Order Summary UI shows variant label under product name; use product_name/quantity/unit_price

## Backend (server/src/controllers/orders.controller.js)
- [x] Persist normalized items into `orders.items` jsonb column (complete snapshot)
- [x] Keep `notes` for backward compatibility
- [x] Keep customer info in direct columns + notes

## Admin Orders (admin/src/pages/Orders.jsx)
- [x] Show image, product name, variant label, unit price, quantity, subtotal per item
- [x] Read from saved snapshot (product_name, variant_label, unit_price, quantity, subtotal)
- [x] Legacy fallback (name, qty, price); hide variant line if variant_label missing

## Verify
- [x] Storefront build passes (68 modules, 4.91s)
- [x] Admin build passes (63 modules, 4.96s)
- [x] Dev servers healthy (storefront :5173, admin :5174, backend :5000)
