import { brandPublicSlug } from './brandSlug.js'

const BRAND_COPY = {
  arees: {
    name: 'Arees Perfumes',
    heading: 'Arees Perfumes & Attars',
    label: 'Signature Arees Collection',
    intro:
      'Discover the complete Arees Perfumes collection — authentic, alcohol-free attars, oud, musk and traditional fragrance oils crafted with heritage in Chennai.',
    title: 'Arees Perfumes | Attars, Oud & Perfume Oils',
    description:
      'Discover Arees and Arees Perfumes: alcohol-free attars, musk, oud and concentrated fragrance oils crafted in Chennai. Retail and wholesale across India.',
  },
  dahab: {
    name: 'Dahab Attars',
    heading: 'Dahab Perfumes & Dahab Attars',
    label: 'Dahab Perfumes & Attars Collection',
    intro:
      'Authentic Dahab Perfumes and Dahab Attars — concentrated, 100% alcohol-free fragrance oils known for their rich projection, enduring sillage, and exquisite oriental character.',
    title: 'Dahab Attars | Alcohol-Free Perfume Oils | Chennai',
    description:
      'Shop Dahab Perfumes and Dahab Attars: concentrated, alcohol-free perfume oils with rich oriental projection, enduring sillage and delivery across India.',
  },
  'arees-luxury': {
    name: 'Arees Luxury',
    heading: 'Arees Luxury Perfumes',
    label: 'Artisanal Arees Luxury Collection',
    intro:
      'The pinnacle of royal oriental perfumery — Arees Luxury Perfumes features vintage oud, precious amber, velvety rose, and signature musk formulations crafted for true connoisseurs.',
    title: 'Arees Luxury | Rare Oud & Artisanal Attars | Chennai',
    description:
      'Explore Arees Luxury: rare oud, amber, rose and artisanal attars from Arees Perfumes in Chennai. Alcohol-free perfume oils for retail and wholesale.',
  },
  bakhoor: {
    name: 'Arees Bakhoor',
    heading: 'Arees Bakhoor',
    label: 'Arees Bakhoor Collection',
    intro:
      'Explore Arees Bakhoor — traditional scented wood chips, incense and bakhoor blends from Arees Perfumes in Chennai.',
    title: 'Arees Bakhoor | Bakhoor, Incense & Attar Oils',
    description:
      'Shop Arees Bakhoor for traditional scented wood chips, incense and bakhoor blends from Arees Perfumes in Chennai. Delivery across India.',
  },
  'arees-12ml': {
    name: 'Arees 12ml',
    heading: 'Arees 12ml Perfumes',
    label: 'Arees 12ml Collection',
    intro:
      'Discover the Arees 12ml collection of alcohol-free attars and concentrated perfume oils from Arees Perfumes in Chennai.',
    title: 'Arees 12ml | Attars & Alcohol-Free Perfume Oils',
    description:
      'Shop Arees 12ml attars and concentrated alcohol-free perfume oils from Arees Perfumes in Chennai, with delivery across India.',
  },
}

function cleanName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

export function brandDisplay(brand, slug) {
  const publicSlug = brandPublicSlug(slug)
  const preset = BRAND_COPY[publicSlug]
  if (preset) return { ...preset, slug: publicSlug }

  const name = cleanName(brand?.name) || 'Brand'
  return {
    slug: publicSlug,
    name,
    heading: name,
    label: `${name} Collection`,
    intro: brand?.tagline || `Explore the complete ${name} fragrance collection.`,
    title: `${name} Perfumes & Attars | Arees Perfumes`,
    description: `Discover authentic ${name} fragrances at Arees Perfumes. Pure, 100% alcohol-free concentrated oils delivered across India.`,
  }
}
