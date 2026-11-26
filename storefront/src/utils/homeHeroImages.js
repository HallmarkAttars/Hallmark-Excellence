// Curated homepage hero rotation.
//
// Every slide is a supplied Arees / Dahab product graphic from /public. The
// database brand images are intentionally NOT used here: the seeded brand
// records point at generic stock photography, which made the hero show
// Unsplash art instead of the actual bottles.
//
// All five slides render as framed `showcase` slides. These graphics carry a
// baked-in Arees logo, product names and a bottom feature strip, so cropping
// them with `cover` would cut that copy off. The showcase layout keeps the
// whole graphic contained on a blurred full-bleed backdrop, so the hero still
// reads as an immersive banner with zero cropping.
//
// Each slide links to the page its graphic represents (brand collection or
// wholesale) so the banner behaves like the Ajmal hero: the artwork itself is
// the link.
//
// Desktop uses the wide original; phones use the matching 900px-wide asset
// that is already shipped in /public, so phones never pull a 1500px+ file.

const HOME_HERO_SLIDES = [
  {
    layout: 'showcase',
    src: '/hero/rollon-8ml.webp',
    mobileWebp: '/hero/rollon-8ml-mobile.webp',
    alt: 'Arees 8ml roll-on attars: Sandal, Zam Zam, Litchi and Mukhallath al Oudh',
    brandName: 'Arees 8ml Roll-On',
    href: '/brand/arees',
    fit: 'contain',
    mobileFit: 'contain',
    focus: '50% 45%',
    mobileFocus: '50% 42%',
    brightness: 1,
    duration: 6000,
  },
  {
    layout: 'showcase',
    src: '/hero/bakhoor.webp',
    mobileWebp: '/hero/bakhoor-mobile.webp',
    alt: 'Arees bakhoor collection: Ameer al Oudh, Noora, Jannat ul Firdouse, Ad Dawli, Bait alzawaj and Bait al Oudh',
    brandName: 'Arees Bakhoor',
    href: '/brand/bakhoor',
    fit: 'contain',
    mobileFit: 'contain',
    focus: '50% 46%',
    mobileFocus: '50% 42%',
    brightness: 1,
    duration: 6000,
  },
  {
    layout: 'showcase',
    src: '/hero/bulk-1kg.webp',
    mobileWebp: '/hero/bulk-1kg-mobile.webp',
    alt: 'Arees 1kg bulk perfume oils: Hawas Ice, Javadhul, Jannathul Firdouse Swiss, Lavender Oudh, MAD4U and Oud Kuwait 1st',
    brandName: 'Arees 1kg Bulk',
    href: '/wholesale',
    fit: 'contain',
    mobileFit: 'contain',
    focus: '50% 46%',
    mobileFocus: '50% 42%',
    brightness: 1,
    duration: 6000,
  },
  {
    layout: 'showcase',
    src: '/hero/luxury-12ml.webp',
    mobileWebp: '/hero/luxury-12ml-mobile.webp',
    alt: 'Arees 12ml luxury perfume collection: Club de Delight, White Orchid Aqua, Top Fort Black Orchid, Hawas and Oudh',
    brandName: 'Arees 12ml',
    href: '/brand/arees-12ml',
    fit: 'contain',
    mobileFit: 'contain',
    focus: '50% 46%',
    mobileFocus: '50% 42%',
    brightness: 1,
    duration: 6000,
  },
  {
    layout: 'showcase',
    src: '/wholesale/rollon-bottle-range.webp',
    mobileWebp: '/wholesale/rollon-bottle-range-900.webp',
    alt: 'Arees roll-on bottle range with 6ml, 8ml and 12ml glass bottle specifications',
    brandName: 'Arees Roll-On Range',
    href: '/wholesale',
    fit: 'contain',
    mobileFit: 'contain',
    focus: '50% 45%',
    mobileFocus: '50% 42%',
    brightness: 1,
    duration: 6000,
  },
]

/**
 * Build the homepage hero slides.
 *
 * The order is fixed: the 8ml roll-on range, bakhoor, the 1kg bulk oils, the
 * 12ml luxury collection and the roll-on bottle range. No stock photography
 * and no product packshots are mixed in.
 *
 * @returns {Array<Object>} copies of the curated slide metadata
 */
export function buildHomeHeroImages() {
  return HOME_HERO_SLIDES.map((slide) => ({ ...slide }))
}
