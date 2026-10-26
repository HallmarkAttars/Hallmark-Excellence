// Fragrance Oil is always sold in configured packs, never loose exact pieces.

function normalize(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function isFragranceOilCategory(category) {
  const name = normalize(category?.name ?? category?.category_name)
  const slug = normalize(category?.slug ?? category?.category_slug)
  return (
    name === 'fragrance oil' ||
    slug === '10' ||
    slug === 'fragrance oil' ||
    slug === 'fragrance-oil'
  )
}

export function isFragranceOilProduct(product) {
  return isFragranceOilCategory({
    name: product?.category_name,
    slug: product?.category_slug,
  })
}
