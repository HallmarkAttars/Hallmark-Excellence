// Curated homepage hero rotation.
//
// Every slide is a supplied Arees catalogue graphic from /public. The database
// brand images are intentionally NOT used here: the seeded brand records point
// at generic stock photography, which made the hero show Unsplash art instead
// of the actual bottles.
//
// All five graphics carry the AREES logo, product names and trust badges, so
// they are shown uncropped inside a 6:5 gallery stage (`fit: 'contain'`). A
// blurred copy of each image fills the stage around the artwork, so wide
// graphics never read as letterboxed on black. Desktop keeps the copy on the
// left; tablet and mobile stack the artwork above the copy.

const HOME_HERO_SLIDES = [
  {
    layout: 'showcase',
    src: '/hero/rollon-8ml.webp',
    mobileWebp: '/hero/rollon-8ml-mobile.webp',
    blur: '/hero/rollon-8ml-blur.webp',
    alt: 'Arees 8ml roll-on attars: Sandal, Zam Zam, Litchi and Mukhallath al Oudh',
    brandName: 'Arees 8ml Roll-On',
    fit: 'contain',
    mobileFit: 'contain',
    focus: '50% 50%',
    mobileFocus: '50% 50%',
    brightness: 1,
    duration: 7000,
  },
  {
    layout: 'showcase',
    src: '/hero/bakhoor.webp',
    mobileWebp: '/hero/bakhoor-mobile.webp',
    blur: '/hero/bakhoor-blur.webp',
    alt: 'Arees bakhoor collection: Ameer al Oudh, Noora, Jannat ul Firdouse, Ad Dawli, Bait alzawaj and Bait al Oudh',
    brandName: 'Arees Bakhoor',
    fit: 'contain',
    mobileFit: 'contain',
    focus: '50% 50%',
    mobileFocus: '50% 50%',
    brightness: 1,
    duration: 7000,
  },
  {
    layout: 'showcase',
    src: '/hero/bulk-1kg.webp',
    mobileWebp: '/hero/bulk-1kg-mobile.webp',
    blur: '/hero/bulk-1kg-blur.webp',
    alt: 'Arees 1kg bulk perfume oils: Hawas Ice, Javadhul, Jannathul Firdouse Swiss, Lavender Oudh, MAD4U and Oud Kuwait 1st',
    brandName: 'Arees 1kg Bulk',
    fit: 'contain',
    mobileFit: 'contain',
    focus: '50% 50%',
    mobileFocus: '50% 50%',
    brightness: 1,
    duration: 7000,
  },
  {
    layout: 'showcase',
    src: '/hero/luxury-12ml.webp',
    mobileWebp: '/hero/luxury-12ml-mobile.webp',
    blur: '/hero/luxury-12ml-blur.webp',
    alt: 'Arees 12ml luxury perfume collection: Club de Delight, White Orchid Aqua, Top Fort Black Orchid, Hawas and Oudh',
    brandName: 'Arees 12ml',
    fit: 'contain',
    mobileFit: 'contain',
    focus: '50% 50%',
    mobileFocus: '50% 50%',
    brightness: 1,
    duration: 7000,
  },
  {
    layout: 'showcase',
    src: '/wholesale/rollon-bottle-range.webp',
    mobileWebp: '/wholesale/rollon-bottle-range-900.webp',
    blur: '/wholesale/rollon-bottle-range.webp',
    alt: 'Arees roll-on bottle range with 6ml, 8ml and 12ml glass bottle specifications',
    brandName: 'Arees Roll-On Range',
    fit: 'contain',
    mobileFit: 'contain',
    focus: '50% 50%',
    mobileFocus: '50% 50%',
    brightness: 1,
    duration: 7000,
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
