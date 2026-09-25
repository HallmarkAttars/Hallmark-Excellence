import { IMAGES } from '../config/assets'
import { BRAND_HERO_IMAGES, brandHeroImage } from '../data/content'
import { cloudinarySrc } from './productImage'

/**
 * Dynamically collects and normalizes all available brand and product hero images
 * from database brands, catalog content, and site assets.
 *
 * Ensures:
 * 1. The primary hero image (Arees luxury perfume hero) is always first in rotation.
 * 2. All brands from the database (active brands, plus any newly added brands from admin)
 *    have their hero/cover/card images included.
 * 3. All static BRAND_HERO_IMAGES from content.js (arees 8ml, 12ml, luxury, bakhoor, dahab 6ml)
 *    are included.
 * 4. All fallback collection images are included.
 * 5. URLs are deduplicated, normalized, and optimized via cloudinarySrc.
 *
 * When an admin adds a new brand or edits its image in the admin panel,
 * it automatically appears in the hero rotation without any code changes.
 *
 * @param {Array<Object>} [brands=[]] - Array of brand objects from getBrands()
 * @param {Array<Object>} [products=[]] - Optional array of products
 * @returns {Array<{ src: string, webp: string|null, alt: string, brandName: string|null }>}
 */
export function collectBrandHeroImages(brands = [], products = []) {
  const images = []
  const seenUrls = new Set()

  const addImage = (src, webp, alt, brandName) => {
    if (!src || typeof src !== 'string') return
    const trimmed = src.trim()
    if (!trimmed || seenUrls.has(trimmed)) return

    seenUrls.add(trimmed)
    const optSrc = cloudinarySrc(trimmed, { width: 1920 })
    const optWebp = webp && typeof webp === 'string'
      ? cloudinarySrc(webp.trim(), { width: 1920 })
      : (trimmed.endsWith('.webp') ? optSrc : null)

    images.push({
      src: optSrc,
      webp: optWebp,
      alt: alt || (brandName ? `${brandName} — Hallmark Luxury Fragrance Collection` : 'Arees Perfumes — Hallmark luxury perfume and attar collection'),
      brandName: brandName || null,
    })
  }

  // 1. Primary Hero background image (first in rotation, matches existing hero exactly)
  addImage(
    IMAGES.heroBackground,
    IMAGES.heroBackgroundWebp,
    'Arees Perfumes — Hallmark luxury perfume and attar collection',
    'Arees Perfumes'
  )

  // 2. Database brands (dynamically fetched from API / admin panel)
  if (Array.isArray(brands) && brands.length > 0) {
    for (const brand of brands) {
      if (!brand || !brand.name) continue
      const name = brand.name

      // Check brandHeroImage mapping
      const heroImage = brandHeroImage(name)
      if (heroImage) {
        addImage(heroImage, heroImage, `${name} Luxury Perfume Collection`, name)
      }

      // Brand cover image (configured in Admin)
      if (brand.cover_image_url) {
        addImage(brand.cover_image_url, null, `${name} Collection`, name)
      }

      // Brand card image (configured in Admin)
      if (brand.card_image_url) {
        addImage(brand.card_image_url, null, `${name} Perfume Card`, name)
      }

      // Banner or generic image fields if present
      if (brand.banner_image_url) {
        addImage(brand.banner_image_url, null, `${name} Banner`, name)
      }
      if (brand.image) {
        addImage(brand.image, null, `${name} Fragrance`, name)
      }

      // Fallback collection image by brand slug
      if (brand.slug && IMAGES.collections?.[brand.slug]) {
        addImage(IMAGES.collections[brand.slug], null, `${name} Collection`, name)
      }
    }
  }

  // 3. Static BRAND_HERO_IMAGES from content.js (covers Arees 8ml, 12ml, Luxury, Bakhoor, Dahab 6ml)
  if (BRAND_HERO_IMAGES && typeof BRAND_HERO_IMAGES === 'object') {
    for (const [brandKey, imgPath] of Object.entries(BRAND_HERO_IMAGES)) {
      const displayName = brandKey.charAt(0).toUpperCase() + brandKey.slice(1)
      addImage(imgPath, imgPath, `${displayName} Luxury Perfume`, displayName)
    }
  }

  // 4. Fallback IMAGES.collections (Unsplash editorial photography for collections)
  if (IMAGES.collections && typeof IMAGES.collections === 'object') {
    for (const [slug, url] of Object.entries(IMAGES.collections)) {
      const displayName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      addImage(url, null, `${displayName} Collection`, displayName)
    }
  }

  // 5. Featured product images if available
  if (Array.isArray(products) && products.length > 0) {
    for (const product of products) {
      if (product && product.is_featured && product.image) {
        addImage(product.image, null, `${product.name} — Premium Fragrance`, product.brand_name || null)
      }
    }
  }

  return images
}
