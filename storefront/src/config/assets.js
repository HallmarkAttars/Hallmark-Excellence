/**
 * ==========================================================================
 * ASSET CONFIGURATION
 * --------------------------------------------------------------------------
 * Central place for every STATIC image / icon used by the storefront.
 * Products, categories, brands and their images stay in Supabase — this file
 * only holds the site's fixed visual assets (logo, hero, banners, about).
 *
 * For local files: reference them as "/your-file.jpg" (they live in /public).
 * For remote files: just paste the full URL as a string.
 *
 * Change a value here and every component consuming it updates immediately.
 * ==========================================================================
 */

export const IMAGES = {
  // Brand logos
  logo: '/HE color Logo.png', // Navbar (light background)
  logoLight: '/HE white Logo.png', // Footer (dark background)

  // Hero — full-bleed background image (dark overlay is applied in CSS)
  heroBackground: '/Hero.png',

  // Homepage collection banners
  collections: {
    arees: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=1200&q=70',
    dahab: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=1200&q=70',
  },

  // About page story image — local file in /public
  aboutImage: '/about-image.jpeg',
}
