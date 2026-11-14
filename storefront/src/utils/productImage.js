// Responsive product image URLs.
//
// Product images are served from Cloudinary at full original resolution
// (e.g. ~1200×1300 px) with no transformation parameters — the browser
// downloads the full-size file even for a 160px-wide grid card. This helper
// injects Cloudinary transformation parameters (auto format → WebP/AVIF,
// auto quality, capped width) so each surface downloads only as many bytes
// as it actually needs to display.
//
// Only Cloudinary URLs are rewritten (matched by the /image/upload/ segment);
// any other image host passes through untouched. Nothing about the API,
// product data, or image URLs themselves is changed — the transformation is
// purely a display-time concern.

const CLOUDINARY_UPLOAD = '/image/upload/'

/**
 * Return a resized/optimized Cloudinary URL for the given product image.
 * @param {string|null|undefined} url  original image URL
 * @param {{ width?: number, quality?: 'eco'|'good'|'best' }} [opts]
 *        display width cap (2x the CSS size) and optional quality tier
 * @returns {string|null|undefined}    transformed URL (or the original)
 */
export function cloudinarySrc(url, { width = 600, quality } = {}) {
  if (!url || typeof url !== 'string') return url
  const idx = url.indexOf(CLOUDINARY_UPLOAD)
  if (idx === -1) return url
  // Insert params right after /upload/ (before any version segment).
  const prefix = url.slice(0, idx + CLOUDINARY_UPLOAD.length)
  const rest = url.slice(idx + CLOUDINARY_UPLOAD.length)
  const qualityParam = quality ? `q_auto:${quality}` : 'q_auto'
  return `${prefix}f_auto,${qualityParam},w_${width}/${rest}`
}

/**
 * Return a srcSet for the given widths so browsers on small screens download
 * the smallest variant that still covers their device pixel ratio. Non-
 * Cloudinary URLs return undefined so the plain `src` stays the single source.
 * @param {string|null|undefined} url   original image URL
 * @param {number[]} [widths]           per-variant widths (small → large)
 * @param {{ quality?: 'eco'|'good'|'best' }} [options]
 * @returns {string|undefined}
 */
export function cloudinarySrcSet(url, widths = [400, 600, 900], options = {}) {
  if (!url || typeof url !== 'string') return undefined
  if (url.indexOf(CLOUDINARY_UPLOAD) === -1) return undefined
  return widths
    .map((width) => `${cloudinarySrc(url, { width, ...options })} ${width}w`)
    .join(', ')
}
