// ONE shared product-image resolver for the whole admin panel.
//
// The backend stores a single Cloudinary URL in `products.image`. Historical
// rows and older formats may carry the image in a different field, so the
// resolver checks every known shape before giving up:
//   product.image         → full Cloudinary URL (current format)
//   product.image_url     → full URL
//   product.imageUrl      → full URL
//   product.image_path    → storage-style path (accepted as-is)
//   product.product_image → full URL
//   product.images[]      → array of URLs (legacy mock format)
//
// Full URLs are returned unchanged — nothing here re-uploads or rewrites
// data. When no image exists, components fall back to PRODUCT_IMAGE_PLACEHOLDER.

export const PRODUCT_IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23FAF8F2'/%3E%3Cpath d='M12 3 4 7v10l8 4 8-4V7l-8-4Z' fill='none' stroke='%23B7A98F' stroke-width='1.1'/%3E%3Cpath d='M4 7l8 4 8-4M12 11v10' fill='none' stroke='%23B7A98F' stroke-width='1.1'/%3E%3C/svg%3E"

// Returns the best available image source for a product, or null.
export function resolveProductImage(product) {
  if (!product) return null

  const singleFields = [
    product.image,
    product.image_url,
    product.imageUrl,
    product.image_path,
    product.product_image,
  ]
  for (const value of singleFields) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  if (Array.isArray(product.images)) {
    for (const img of product.images) {
      if (typeof img === 'string' && img.trim()) return img.trim()
    }
  }

  return null
}

// Drop-in img onError handler — swaps a broken image to the placeholder
// exactly once (the flag prevents an infinite onError loop if the
// placeholder itself ever fails).
export function handleProductImageError(event) {
  const img = event.currentTarget
  if (img.dataset.imageFallback) return
  img.dataset.imageFallback = '1'
  img.src = PRODUCT_IMAGE_PLACEHOLDER
}
