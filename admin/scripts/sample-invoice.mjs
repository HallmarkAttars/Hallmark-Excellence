// Generates a sample invoice PDF + print HTML using the real invoice module,
// with sample customer details so the wording/alignment changes can be checked.
// Run:  npx vite-node scripts/sample-invoice.mjs
import { writeFileSync } from 'node:fs'
import { buildInvoicePdf, printInvoice } from '../src/components/invoice/invoicePdf.js'

const sampleOrder = {
  order_number: 'ORD-362193',
  created_at: '2026-10-24T11:30:00+05:30',
  status: 'Processing',
  payment_method: 'Advance Payment',
  payment_status: 'Paid',
  shipping_charge: null,
  customer_name: 'Mohamed Irfan Abdul Kader',
  phone: '+91 90000 12345',
  email: 'irfan.abdulkader@example.com',
  address: 'No 42, Angappa Naicken Street, First Floor, Near Broadway Bus Stand',
  locality: 'Mannady, George Town',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600001',
  items: [
    {
      product_name: 'Royal Marriage Premium Oud Attar Concentrated Perfume Oil 12ml',
      brand_name: 'AREES',
      variant_label: '12 ML',
      quantity: 3,
      unit_price: 2499,
    },
    {
      product_name: 'Pink Musk & Rose Blossom Attar Long Lasting Fragrance',
      brand_name: 'DAHAB',
      variant_label: '12 ML',
      quantity: 2,
      unit_price: 1899,
    },
    {
      product_name: 'White Musk Reserve Attar',
      brand_name: 'AREES',
      variant_label: '6 ML',
      quantity: 5,
      unit_price: 799,
    },
  ],
}

sampleOrder.total_amount =
  sampleOrder.items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0)

const doc = await buildInvoicePdf(sampleOrder)
const pdfBytes = doc.output('arraybuffer')
writeFileSync(new URL('./sample-invoice.pdf', import.meta.url), Buffer.from(pdfBytes))
console.log(
  'wrote admin/scripts/sample-invoice.pdf',
  pdfBytes.byteLength,
  'bytes,',
  doc.getNumberOfPages(),
  'pages'
)

let html = ''
const fakeWin = {
  document: { write(s) { html += s }, close() {} },
  focus() {},
  print() {},
}
globalThis.window = { setTimeout: (fn) => fn() }
await printInvoice(sampleOrder, { win: fakeWin })
writeFileSync(new URL('./sample-invoice.html', import.meta.url), html, 'utf8')
console.log('wrote admin/scripts/sample-invoice.html', html.length, 'bytes')
console.log('Sample customer:', sampleOrder.customer_name)
console.log('Sample address:', sampleOrder.address)
console.log('Order total:', sampleOrder.total_amount)
