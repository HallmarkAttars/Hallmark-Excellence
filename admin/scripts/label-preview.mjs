// Generates a sample packing-label print HTML from the REAL module code, so
// the layout can be verified in a browser (run via: node scripts/label-preview.mjs).
import { writeFileSync } from 'node:fs'
import { printPackingLabels } from '../src/components/packing/packingLabelPdf.js'

const sampleOrder = {
  id: 'u1',
  order_number: 'ORD-164714',
  customer_name: 'MOHAMED FAREETH',
  phone: '+91 9363456545',
  address: 'no 95 moore street, first floor, kalajiyam school opp',
  locality: 'Chennai',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600001',
  payment_method: 'Cash on Delivery',
  items: [
    { product_name: 'CR7', quantity: 1, variant_label: '60 Pieces' },
    { product_name: 'Pink Musk', quantity: 2, variant_label: '100 Pieces' },
    { product_name: 'Cold Water', quantity: 3, variant_label: '150 Pieces' },
  ],
}

let html = ''
const fakeWin = {
  document: {
    write(s) {
      html += s
    },
    close() {},
  },
  focus() {},
  print() {},
}
// The module schedules the print via window.setTimeout.
globalThis.window = { setTimeout: (fn) => fn() }

await printPackingLabels([sampleOrder], { win: fakeWin })
writeFileSync(new URL('./label-preview.html', import.meta.url), html, 'utf8')
console.log('wrote admin/scripts/label-preview.html', html.length, 'bytes')
