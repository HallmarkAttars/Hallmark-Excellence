// ==========================================================================
// SITE CONTENT
// Edit copy here — components read from this file, not hardcoded strings.
//
// STATIC copy lives here. DYNAMIC data (products, categories, brands,
// orders, prices, stock, customers) stays in Supabase / mockApi and must
// NEVER be moved into this file.
// ==========================================================================

// --------------------------------------------------------------------------
// BUSINESS — single source of truth for contact & social information.
// Footer, Contact page, order success and social strips all read from here.
// --------------------------------------------------------------------------
export const BUSINESS = {
  name: 'Arees & Dahab',
  tagline: 'The Art of Significance Attars',
  phoneDisplay: '+91 98407 50467',
  phoneTel: '+919840750467', // digits only — used for tel: links
  email: 'hikmaexports@gmail.com',
  address: '83 & 84, Moore St, Mannadi, George Town, Chennai, Greater Chennai, Tamil Nadu 600001',
  mapEmbedUrl:
    'https://www.google.com/maps?q=Arees%20Attars%20%26%20Perfumes%2C%2083%20Moore%20Street%2C%20Mannady%2C%20Chennai%2C%20Tamil%20Nadu%20600001&z=17&output=embed',
  mapDirectionsUrl:
    'https://www.google.com/maps/dir/?api=1&destination=Arees%20Attars%20%26%20Perfumes%2C%2083%20Moore%20Street%2C%20Mannady%2C%20Chennai',
  social: [
    { key: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/aree___s?igsh=a2sxMHk4NzN2bDdo' },
    { key: 'facebook', label: 'Facebook', href: '#' },
    { key: 'whatsapp', label: 'WhatsApp', href: '#' },
  ],
  // Lookup helpers — components should resolve by key, never by array index.
  socialByKey: (key) => BUSINESS.social.find((s) => s.key === key),
}

// --------------------------------------------------------------------------
// INVOICE — branding for the customer invoice / order receipt.
// companyName is the legal-style name printed on the invoice. Phone, email
// and address are intentionally REUSED from BUSINESS above (never invented).
// --------------------------------------------------------------------------
export const INVOICE = {
  // Legal-style name printed on the invoice (copyright line).
  companyName: 'Hallmark of Excellence',
  // Premium header brand title (reference design) — stacked centred on the
  // invoice and used for the thank-you sign-off ("— Team Arees Perfumes").
  // Falls back to companyName when unset.
  brandTitle: 'Arees Perfumes',
  gstNote: 'Prices are inclusive of applicable GST.',
  thanks: 'Thank you for your order.',
}

// --------------------------------------------------------------------------
// NAVIGATION — header nav (desktop + mobile drawer) and footer "Company".
// `end: true` keeps the Home link highlighted only on the exact "/" route.
// Brand links are NOT listed here — the header "Brands" dropdown (desktop
// and mobile) and the footer Shop column render the LIVE brand list fetched
// from GET /api/brands (name, slug, active state, display position all come
// from the database), so an Admin edit shows up everywhere instantly.
// --------------------------------------------------------------------------
export const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/categories', label: 'Categories' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
  { to: '/track-order', label: 'Track Order' },
]

// --------------------------------------------------------------------------
// HERO — homepage hero section
// --------------------------------------------------------------------------
export const HERO = {
  title: ['The Art of', 'Hallmark', 'Attars'],
  subtitle:
    'Alcohol-free oil perfumes, hand-blended in small batches from oud, rose, and amber — crafted to be worn, close to the heart and remembered long after.',
  primaryCta: { label: 'Shop the Collection', to: '/shop' },
  secondaryCta: { label: 'Explore Attars', to: '/categories/attars' },
}

// --------------------------------------------------------------------------
// HOMEPAGE — section headings for the shared category / featured grids
// --------------------------------------------------------------------------
export const HOME_CATEGORIES = {
  title: 'Shop by Category',
  viewAll: { label: 'View All', to: '/categories' },
}

export const HOME_FEATURED = {
  title: 'Featured Products',
  viewAll: { label: 'View All', to: '/shop' },
}

// --------------------------------------------------------------------------
// OUR BRANDS — homepage heading above the Arees / Dahab collection cards.
// The cards themselves are the existing COLLECTIONS banners (see below),
// rendered in Home.jsx — this is only the section heading.
// --------------------------------------------------------------------------
export const HOME_BRANDS = {
  title: 'Our Brands',
  subtitle: 'Timeless fragrances crafted with heritage and excellence.',
}

// --------------------------------------------------------------------------
// BRAND HERO IMAGES — collection-page hero banner backgrounds.
// The images live in storefront/public; the brand NAME (from the database)
// picks the image via brandHeroImage(name). Public URL paths are used
// (e.g. '/Arees8ml.webp') — never filesystem paths.
// --------------------------------------------------------------------------
export const BRAND_HERO_IMAGES = {
  'arees 12ml': '/arees12ml-hero.webp',
  'arees bakhoor': '/bakhoor-hero.webp',
  'arees luxury': '/areesluxury-hero.webp',
  'arees 8ml': '/arees-hero.webp',
  'dahab 8ml': '/Dahab-hero.webp',
}

// Normalized brand-name → hero image lookup (case/space-insensitive).
// Returns null when the brand has no hero image (the plain dark header
// remains) — never a hardcoded fallback image.
export function brandHeroImage(name) {
  if (!name) return null
  const key = String(name).trim().toLowerCase()
  return BRAND_HERO_IMAGES[key] || null
}

// --------------------------------------------------------------------------
// COLLECTIONS — homepage brand banner copy (fallbacks; live copy comes from
// the Admin/database per brand and overrides these when set).
// --------------------------------------------------------------------------
export const COLLECTIONS = {
  arees: {
    eyebrow: 'Arees Collection',
    lines: ['Timeless Scents', 'Pure Elegance'],
    description: 'Discover timeless fragrances crafted with refined elegance.',
    button: 'Shop Now',
  },
  dahab: {
    eyebrow: 'Dahab Collection',
    lines: ['Rich Heritage', 'Lasting Impressions'],
    description: 'A rich fragrance collection created to leave a lasting impression.',
    button: 'Shop Now',
  },
  'misk-al-arab': {
    eyebrow: 'Misk Al Arab Collection',
    lines: ['The essence of purity', 'and tradition'],
    description: 'Soft, clean musks crafted with care.',
    button: 'Shop Now',
  },
  'oud-al-haramain': {
    eyebrow: 'Oud Al Haramain Collection',
    lines: ['Sacred oud,', 'deeply rooted'],
    description: 'Rich and smoky scents of timeless heritage.',
    button: 'Shop Now',
  },
  'amber-oud': {
    eyebrow: 'Amber Oud Collection',
    lines: ['Warm amber,', 'luminous oud'],
    description: 'Golden resinous blends of quiet luxury.',
    button: 'Shop Now',
  },
}

// --------------------------------------------------------------------------
// SOCIAL_STRIP — homepage "Follow Our Journey" band
// --------------------------------------------------------------------------
export const SOCIAL_STRIP = {
  title: 'Follow Our Journey',
  subtitle: 'Scent, made by hand — oud, rose and amber from our atelier.',
  cta: { label: 'Follow Us on Instagram', href: BUSINESS.socialByKey('instagram').href },
}

// --------------------------------------------------------------------------
// ABOUT — About page copy (image lives in assets.js)
// --------------------------------------------------------------------------
export const ABOUT = {
  eyebrow: 'Our Story',
  title: 'About Arees & Dahab',
  story: {
    heading: 'A Craft, Not a Category',
    paragraphs: [
      'Arees & Dahab began as two family recipes — one built around oud and smoke, the other around rose and gold — before becoming a single house under one roof. Every attar is still blended in small batches, aged in glass, and bottled by hand.',
      'We work only in oil. No alcohol, no shortcuts — just concentrated fragrance the way it was worn long before spray perfume existed.',
    ],
  },
  values: [
    {
      title: 'Small Batch',
      description: 'Every attar is blended in limited runs so quality never scales down.',
    },
    {
      title: 'Alcohol-Free',
      description: 'Pure oil concentrates that sit closer to skin and last far longer.',
    },
    {
      title: 'Two Houses, One Standard',
      description: 'Arees leans bold and smoky; Dahab leans golden and floral. Both are held to the same bar.',
    },
  ],
}

// --------------------------------------------------------------------------
// CONTACT — Contact page / checkout page headings + side info block
// --------------------------------------------------------------------------
export const CONTACT = {
  eyebrow: 'Contact Us',
  title: "We'd Love to Hear From You",
  subtitle:
    'Have a question about our products, orders or collections? Our team is here to help.',
  info: {
    title: 'Visit or Reach Us',
    phoneLabel: 'Phone',
    emailLabel: 'Email',
    addressLabel: 'Address',
    // Values come from BUSINESS (single source of truth) — never duplicated here.
  },
  checkout: {
    eyebrow: 'Checkout',
    title: 'Complete Your Order',
  },
}

// --------------------------------------------------------------------------
// FOOTER — footer copy (logo image lives in assets.js)
// --------------------------------------------------------------------------
export const FOOTER = {
  description:
    'The Art of Significance Attars — small-batch oils crafted from oud, rose, and resin, made to be worn close and remembered long after.',
  columns: [
    {
      heading: 'Shop',
      // Brand links are appended dynamically by Footer.jsx from the live
      // brand list (see Navbar comment above) — nothing hard-coded here.
      links: [
        { label: 'All Attars', to: '/shop' },
        { label: 'Categories', to: '/categories' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'About Us', to: '/about' },
        { label: 'Contact', to: '/contact' },
        { label: 'Track Order', to: '/track-order' },
      ],
    },
  ],
  copyright: `© ${new Date().getFullYear()} Arees & Dahab. All rights reserved.`,
}

// --------------------------------------------------------------------------
// INTERIOR PAGES — static page headings
// --------------------------------------------------------------------------
export const SHOP_PAGE = {
  eyebrow: 'Our Collection',
  title: 'Find Your Signature Scent',
  subtitle: 'Explore attars and fragrances from Arees and Dahab, crafted for every mood and occasion.',
}

export const CATEGORIES_PAGE = {
  eyebrow: 'Browse',
  title: 'All Categories',
  subtitle: 'Find your signature scent by fragrance family.',
}

export const TRACK_ORDER_PAGE = {
  eyebrow: 'Track Your Order',
  title: 'Track Your Order',
  subtitle: 'Enter your order details to check the latest status.',
}
