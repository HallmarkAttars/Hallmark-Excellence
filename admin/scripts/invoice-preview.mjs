// Generates a real invoice PDF + print HTML from the REAL module code so the
// A4 layout can be verified in a browser.
// Run:  npx vite-node scripts/invoice-preview.mjs
import { writeFileSync } from 'node:fs'
import { buildInvoicePdf, printInvoice } from '../src/components/invoice/invoicePdf.js'

// Realistic order with LONG names/details to expose right-edge clipping.
const order = {
  order_number: 'ORD-164714',
  created_at: '2026-08-11T14:32:00+05:30',
  status: 'Processing',
  payment_method: 'Cash on Delivery',
  payment_status: 'Pending',
  total_amount: 2940,
  shipping_charge: 0,
  customer_name: 'Mohamed Fareeth Abdul Rahman Siddiqui',
  phone: '+91 9363456545',
  email: 'fareeth.mohamed@gmail.com',
  address: 'No 95, Moore Street, First Floor, Near Kalaiyam School Opposite Building',
  locality: 'George Town',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600001',
  items: [
    {
      product_name: 'Royal Marriage Premium Oud Attar Concentrated Perfume Oil 12ml',
      brand_name: 'DAHAB',
      variant_label: '12 ML',
      quantity: 20,
      unit_price: 47,
    },
    {
      product_name: 'Pink Musk & Rose Blossom Attar For Women Long Lasting Fragrance',
      brand_name: 'AREES',
      variant_label: '100 Pieces',
      quantity: 10,
      unit_price: 45,
    },
    {
      product_name: 'CR7 Platinum Edition Men Luxury Perfume Attar',
      brand_name: 'AREES',
      variant_label: '60 Pieces',
      quantity: 1,
      unit_price: 45,
    },
    {
      product_name: 'Cold Water Fresh Aquatic Scent Premium Attar Bottle',
      brand_name: 'AREES',
      variant_label: '150 Pieces',
      quantity: 1,
      unit_price: 42,
    },
  ],
}

// ---- PDF ----
const doc = await buildInvoicePdf(order, { logoUrl: undefined })
const pdfBytes = doc.output('arraybuffer')
writeFileSync(new URL('./invoice-preview.pdf', import.meta.url), Buffer.from(pdfBytes))
console.log('wrote admin/scripts/invoice-preview.pdf', pdfBytes.byteLength, 'bytes,', doc.getNumberOfPages(), 'pages')

// ---- Print HTML ----
let html = ''
const fakeWin = {
  document: { write(s) { html += s }, close() {} },
  focus() {},
  print() {},
}
globalThis.window = { setTimeout: (fn) => fn() }
await printInvoice(order, { logoUrl: undefined, win: fakeWin })
writeFileSync(new URL('./invoice-preview.html', import.meta.url), html, 'utf8')
console.log('wrote admin/scripts/invoice-preview.html', html.length, 'bytes')
