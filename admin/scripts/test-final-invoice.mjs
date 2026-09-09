import { writeFileSync } from 'node:fs'
import { buildInvoicePdf } from '../src/components/invoice/invoicePdf.js'

const testOrder = {
  order_number: 'ORD-906529',
  created_at: '2026-08-24T12:09:00+05:30',
  status: 'Pending',
  payment_method: 'Advance Payment',
  payment_status: 'Pending',
  total_amount: 9288,
  shipping_charge: null,
  customer_name: 'Sheikh Mohamed Fareeth Abdul Rahman Siddiqui Al Haddad',
  phone: '+91 98765 43210',
  email: 'sheikh.fareeth.mohamed.longemail@example.com',
  address: 'No 95, Moore Street, First Floor, Near Kalaiyam School Opposite Building, George Town',
  locality: 'George Town, Chennai, Greater Chennai',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600001',
  items: [
    {
      product_name: 'Royal Marriage Premium Oud Attar Concentrated Perfume Oil 12ml',
      brand_name: 'AREES',
      variant_label: '12 ML',
      quantity: 216,
      unit_price: 43,
      total_price: 9288,
    },
  ],
}

console.log('Generating PDF for requested test case...')
const doc = await buildInvoicePdf(testOrder)
const pages = doc.getNumberOfPages()
console.log('Total pages:', pages)
if (pages !== 1) {
  throw new Error(`Expected exactly 1 page, got ${pages}`)
}

const pdfBytes = doc.output('arraybuffer')
writeFileSync(new URL('./test-final-invoice.pdf', import.meta.url), Buffer.from(pdfBytes))
console.log('Successfully wrote admin/scripts/test-final-invoice.pdf', pdfBytes.byteLength, 'bytes, 1 page.')
