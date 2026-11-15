const clean = (value) => String(value ?? '').trim()

export function buildWholesaleQuotePrefill(input) {
  const { productName, productUrl, variantLabel, quantityText } = input || {}
  const lines = []
  if (clean(productName)) lines.push(`Product: ${clean(productName)}`)
  if (clean(variantLabel)) lines.push(`Variant: ${clean(variantLabel)}`)
  if (clean(quantityText)) lines.push(`Requested: ${clean(quantityText)}`)
  if (clean(productUrl)) lines.push(`Link: ${clean(productUrl)}`)
  return lines.join('\n')
}

export function buildWholesaleQuotePath(input) {
  const prefill = buildWholesaleQuotePrefill(input)
  const params = new URLSearchParams()
  if (prefill) params.set('product', prefill)
  const query = params.toString()
  return `/wholesale${query ? `?${query}` : ''}#wholesale-enquiry`
}
