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
  phoneDisplay: '+91 98765 43210',
  phoneTel: '+919876543210', // digits only — used for tel: links
  email: 'hello@areesdahab.com',
  address: '83 Moore Street, Mannady, Chennai, Tamil Nadu 600001',
  mapEmbedUrl:
    'https://www.google.com/maps?q=Arees%20Attars%20%26%20Perfumes%2C%2083%20Moore%20Street%2C%20Mannady%2C%20Chennai%2C%20Tamil%20Nadu%20600001&z=17&output=embed',
  mapDirectionsUrl:
    'https://www.google.com/maps/dir/?api=1&destination=Arees%20Attars%20%26%20Perfumes%2C%2083%20Moore%20Street%2C%20Mannady%2C%20Chennai',
  social: [
    { key: 'instagram', label: 'Instagram', href: '#' },
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
  companyName: 'Hallmark of Excellence',
  gstNote: 'Prices are inclusive of applicable GST.',
  thanks: 'Thank you for your order.',
}

// --------------------------------------------------------------------------
// NAVIGATION — header nav (desktop + mobile drawer) and footer "Company".
// `end: true` keeps the Home link highlighted only on the exact "/" route.
// --------------------------------------------------------------------------
export const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/categories', label: 'Categories' },
  { to: '/brand/arees', label: 'Arees' },
  { to: '/brand/dahab', label: 'Dahab' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
  { to: '/track-order', label: 'Track Order' },
]

// --------------------------------------------------------------------------
// HERO — homepage hero section
// --------------------------------------------------------------------------
export const HERO = {
  title: ['The Art of', 'Significance', 'Attars'],
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
}

// --------------------------------------------------------------------------
// COLLECTIONS — homepage Arees / Dahab banners (image lives in assets.js)
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
}

// --------------------------------------------------------------------------
// WHY_CHOOSE_US — homepage trust section (icons resolved by `key` in the
// component, mirroring the assets.js icon-key pattern)
// --------------------------------------------------------------------------
export const WHY_CHOOSE_US = {
  title: 'Why Choose Us',
  items: [
    { key: 'natural', title: 'Natural Ingredients', subtitle: 'Sustainably Sourced' },
    { key: 'authenticity', title: 'Authenticity Guaranteed', subtitle: 'Official Retailer' },
    { key: 'delivery', title: 'Free Delivery', subtitle: 'On Orders Over ₹999' },
    { key: 'craft', title: 'Master Crafted', subtitle: 'Award-Winning' },
  ],
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
  eyebrow: 'Get in Touch',
  title: 'Contact Us',
  info: {
    title: 'Visit or Reach Us',
    // phone / email / address come from BUSINESS
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
      links: [
        { label: 'All Attars', to: '/shop' },
        { label: 'Categories', to: '/categories' },
        { label: 'Arees', to: '/brand/arees' },
        { label: 'Dahab', to: '/brand/dahab' },
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
