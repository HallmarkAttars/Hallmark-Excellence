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
  phoneTel: '+919840750467', // digits only �?" used for tel: links
  email: 'hikmaexports@gmail.com',
  wholesaleHours: '9:00 AM – 9:30 PM',
  address: '83 & 84, Moore St, Mannadi, George Town, Chennai, Greater Chennai, Tamil Nadu 600001',
  addressParts: {
    streetAddress: '83 & 84, Moore St, Mannadi, George Town',
    addressLocality: 'Chennai',
    addressRegion: 'Tamil Nadu',
    postalCode: '600001',
    addressCountry: 'IN',
  },
  mapEmbedUrl:
    'https://www.google.com/maps?q=Arees%20Attars%20%26%20Perfumes%2C%2083%20Moore%20Street%2C%20Mannady%2C%20Chennai%2C%20Tamil%20Nadu%20600001&z=17&output=embed',
  mapDirectionsUrl:
    'https://www.google.com/maps/dir/?api=1&destination=Arees%20Attars%20%26%20Perfumes%2C%2083%20Moore%20Street%2C%20Mannady%2C%20Chennai',
  social: [
    { key: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/aree___s?igsh=a2sxMHk4NzN2bDdo' },
    { key: 'facebook', label: 'Facebook', href: '#' },
    { key: 'whatsapp', label: 'WhatsApp', href: 'https://wa.me/919840750467?text=Can%20I%20get%20more%20info%20about%20wholesale%20and%20private%20label%3F' },
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
  { to: '/wholesale', label: 'Wholesale' },
  { to: '/guides', label: 'Guides' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
  { to: '/track-order', label: 'Track Order' },
]

// --------------------------------------------------------------------------
// HERO — homepage hero section
// --------------------------------------------------------------------------
export const HERO = {
  title: ['Buy Authentic', 'Non-Alcoholic Attars', '& Fragrance Oils Online'],
  subtitle:
    'Arees Perfumes offers alcohol-free attars, oud and fragrance oils for retail and wholesale, with delivery across India.',
  primaryCta: { label: 'Shop the Collection', to: '/shop' },
  secondaryCta: { label: 'Explore Attars', to: '/categories' },
}

// --------------------------------------------------------------------------
// HOMEPAGE — section headings for the shared category / featured grids
// --------------------------------------------------------------------------
export const HOME_CATEGORIES = {
  eyebrow: 'EXPLORE OUR COLLECTION',
  title: 'Shop by Category',
  subtitle: 'Discover your signature scent from our exclusive range',
  viewAll: { label: 'VIEW ALL', to: '/categories' },
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
  'dahab 6ml': '/Dahab-hero.webp',
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
  title: 'Arees Perfumes by Hallmark of Excellence',
  story: {
    heading: 'A Craft, Not a Category',
    paragraphs: [
      'Arees Perfumes is a Chennai fragrance brand under Hikma Exports, the parent company of Arees & Dahab, operating under Hallmark of Excellence. Hikma Exports also trades as Hikma Perfumes. With 30 years of experience in the perfumery industry, we offer attars, oud oils, fine fragrances, and packaging solutions for perfumers, retailers, wholesalers, and fragrance businesses from Mannadi, George Town.',
      'Our goal is simple: to bring all your perfumery needs together in one place.',
    ],
  },
  hikma: {
    heading: 'Hikma Perfumes, Hikma Exports & Arees Perfumes',
    paragraphs: [
      'Hikma Exports is the parent company of Arees & Dahab. Its fragrance identity, Hikma Perfumes, is the name behind our wholesale perfume supply and the Arees Perfumes and Dahab retail collections.',
      'From 83 & 84, Moore Street, Mannadi, George Town, Chennai, we supply alcohol-free attars, oud oils, fragrance oils, bakhoor, roll-on perfumes, and perfume packaging to customers and trade partners across India.',
    ],
  },
  faqs: [
    {
      question: 'Is Hikma Perfumes the same as Arees Perfumes?',
      answer:
        'Hikma Perfumes is the fragrance identity of Hikma Exports, the parent company of Arees & Dahab. Arees Perfumes is a retail brand within the group, alongside Dahab.',
    },
    {
      question: 'Where is Hikma Perfumes located?',
      answer:
        'Hikma Perfumes operates from 83 & 84, Moore Street, Mannadi, George Town, Chennai, Tamil Nadu 600001, the same location as Arees Perfumes and Hikma Exports.',
    },
    {
      question: 'What products does Hikma Exports supply?',
      answer:
        'Hikma Exports supplies alcohol-free attars, oud and fragrance oils, roll-on perfumes, bakhoor, and perfume packaging including bottles, caps, and pumps. Products are available for retail and wholesale.',
    },
    {
      question: 'Does Hikma Perfumes offer wholesale supply?',
      answer:
        'Yes. Hikma Exports supplies retailers, perfumers, gift shops, and fragrance brands across India through its Chennai wholesale division, with bulk pricing and packaging support.',
    },
  ],
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
// HIKMA EXPORTS — parent company / wholesale and export entity page
// --------------------------------------------------------------------------
export const HIKMA_EXPORTS = {
  eyebrow: 'Hikma Exports',
  title: 'Hikma Exports: Perfume Wholesaler & Exporter in Chennai',
  intro:
    'Hikma Exports is the Chennai-based parent company of Arees & Dahab and the fragrance house behind Hikma Perfumes. From Mannadi, George Town, we supply alcohol-free attars, oud oils, fragrance oils, bakhoor, roll-on perfumes and perfume packaging to retailers, perfumers, distributors and export buyers in India and international markets.',
  quickFacts: [
    { label: 'Loose attar / fragrance oil MOQ', value: '100 g' },
    { label: 'Arees & Dahab branded packs', value: '60 pieces across a combined branded order' },
    { label: 'Wholesale desk hours', value: '9:00 AM – 9:30 PM' },
    { label: 'Export', value: 'India and international markets' },
    { label: 'Private label', value: 'Own-brand, event and function orders' },
    { label: 'Business documents', value: 'GST-registered business with IEC' },
  ],
  exportMarkets: ['Singapore', 'Malaysia', 'UAE', 'Sri Lanka', 'Maldives'],
  introParagraphs: [
    'Hikma Exports operates from 83 & 84, Moore Street, Mannadi, George Town, Chennai. The company combines three decades of perfumery experience with wholesale distribution and international export support.',
    'Hikma Perfumes is the fragrance identity used by Hikma Exports. Arees Perfumes and Dahab are the group\'s retail brands, giving trade buyers and individual customers access to the same fragrance standards.',
    'Current buyer markets include Singapore, Malaysia, the UAE, Sri Lanka and the Maldives, alongside customers across India. GST and IEC documentation are available for trade and export orders; registration numbers are shared directly with buyers when required.',
  ],
  sections: [
    {
      heading: 'Hikma Perfumes: The Fragrance Identity of Hikma Exports',
      paragraphs: [
        'Hikma Perfumes is the name behind Hikma Exports\' wholesale fragrance supply. It covers traditional attars, concentrated oud and fragrance oils, ready-to-retail roll-ons, bakhoor and the packaging components needed to bring a fragrance line to market.',
        'The identity connects our trade division with the Arees Perfumes and Dahab collections, so retail customers and wholesale buyers can source from a familiar Chennai fragrance house.',
      ],
    },
    {
      heading: 'Wholesale Supply & International Export from Chennai',
      paragraphs: [
        'Hikma Exports supplies retailers, perfumers, distributors, gift shops and fragrance brands across India. We also handle international export orders for buyers who need Chennai-made fragrance oils, attars and packaging.',
        'Current buyer markets include Singapore, Malaysia, the UAE, Sri Lanka and the Maldives. Share your destination, product list and quantities so the team can confirm availability, pricing and dispatch options from Mannadi.',
      ],
    },
    {
      heading: 'MOQ, Wholesale Desk Hours & Order Terms',
      paragraphs: [
        'Loose attar and fragrance oil orders start at 100 g. Arees and Dahab branded packs start at 60 pieces across a combined branded order, so buyers can mix the two brands within the same requirement.',
        'The wholesale desk is available from 9:00 AM to 9:30 PM. Production and dispatch lead time is confirmed in the quotation because it depends on the product mix, pack sizes and destination.',
        'GST invoicing is available for domestic orders. For export orders, IEC and destination-specific documentation are confirmed with the quotation.',
      ],
    },
    {
      heading: 'Private Label, Events & Function Orders',
      paragraphs: [
        'Hikma Exports supports private-label and own-brand orders for retailers, fragrance brands, events and functions. Buyers can discuss labels, bottles, caps, pumps and pack sizes around their requirement.',
        'Private-label feasibility, minimum quantities and lead time are reviewed per order. Share your artwork, target quantity, event date or launch timeline so the team can confirm the right components and schedule.',
      ],
    },
    {
      heading: 'What Export Buyers Should Share',
      paragraphs: [
        'Send your destination country, product list, required pack sizes, quantities, labelling requirements and preferred shipping terms. The Chennai team will confirm availability, pricing, documentation and dispatch options for your order.',
        'For buyers planning a private-label or custom packaging range, share your artwork, bottle and cap preferences, and target order volume so the team can assess the right components.',
      ],
    },
    {
      heading: 'What an Export Quotation Confirms',
      paragraphs: [
        'Each export quotation confirms the minimum order quantity, unit price, lead time, packing and labelling details, shipping terms, payment terms and documentation required for the destination.',
        'Because these terms depend on the product mix, quantities and destination, they are confirmed in writing for each enquiry rather than presented as a single published rate.',
      ],
    },
    {
      heading: 'Arees Perfumes, Dahab & the Hikma Exports Group',
      paragraphs: [
        'Hikma Exports is the parent company of Arees & Dahab. Arees Perfumes and Dahab are the group\'s retail fragrance brands, while Hikma Perfumes supports wholesale and trade supply.',
        'This structure keeps retail collections and bulk supply under one quality standard, with a single Chennai team handling fragrance development, packing and order coordination.',
      ],
    },
  ],
  offerings: [
    {
      title: 'Alcohol-Free Attars',
      description:
        'Traditional attars and concentrated perfume oils without alcohol, suited to retail shelves and private-label ranges.',
    },
    {
      title: 'Oud & Fragrance Oils',
      description:
        'Oud oils, amber, musk, floral and oriental fragrance oils in bulk for blending, decanting and finished perfume production.',
    },
    {
      title: 'Roll-On Perfumes',
      description:
        'Ready-to-retail 6ml and 8ml roll-on perfumes under the Arees and Dahab collections, with optional custom labelling.',
    },
    {
      title: 'Bakhoor & Incense',
      description:
        'Arabian bakhoor chips, aromatic resins and traditional incense for specialty stores, gifting and export orders.',
    },
    {
      title: 'Perfume Packaging',
      description:
        'Glass roll-on bottles, spray bottles, caps, pumps and display bottles for brands assembling their own fragrance lines.',
    },
    {
      title: 'Private Label & Event Orders',
      description:
        'Own-brand labels, bottles, caps and packs for retailers, fragrance brands, events and functions, reviewed per order.',
    },
    {
      title: 'Wholesale & Export Support',
      description:
        'Bulk pricing, pack-size planning, GST invoicing, IEC documentation and order coordination for trade buyers.',
    },
  ],
  faqs: [
    {
      question: 'What is Hikma Exports?',
      answer:
        'Hikma Exports is a Chennai-based perfume wholesaler and exporter, and the parent company of Arees & Dahab. It trades as Hikma Perfumes and supplies attars, oud oils, fragrance oils, bakhoor and packaging from Mannadi, George Town.',
    },
    {
      question: 'Is Hikma Perfumes the same company as Hikma Exports?',
      answer:
        'Hikma Perfumes is the fragrance identity used by Hikma Exports. Arees Perfumes and Dahab are the group\'s retail brands, while Hikma Perfumes supports wholesale and trade supply.',
    },
    {
      question: 'Where is Hikma Exports located?',
      answer:
        'Hikma Exports operates from 83 & 84, Moore Street, Mannadi, George Town, Chennai, Tamil Nadu 600001, the same location as Arees Perfumes and Dahab.',
    },
    {
      question: 'What is the minimum order quantity?',
      answer:
        'Loose attar and fragrance oil orders start at 100 g. Arees and Dahab branded packs start at 60 pieces across a combined branded order, so the two brands can be mixed within the same requirement.',
    },
    {
      question: 'What are the wholesale desk hours and lead time?',
      answer:
        'The wholesale desk is available from 9:00 AM to 9:30 PM. Production and dispatch lead time is confirmed in the written quotation because it depends on the product mix, quantities and destination.',
    },
    {
      question: 'Does Hikma Exports handle international export orders?',
      answer:
        'Yes. Hikma Exports supplies buyers across India and international markets including Singapore, Malaysia, the UAE, Sri Lanka and the Maldives. Share your destination, product list and quantities so the team can confirm pricing and logistics.',
    },
    {
      question: 'What products can I buy wholesale from Hikma Exports?',
      answer:
        'Hikma Exports supplies alcohol-free attars, oud and fragrance oils, roll-on perfumes, bakhoor, and perfume packaging including bottles, caps and pumps.',
    },
    {
      question: 'How do I place a wholesale or export enquiry?',
      answer:
        'Use the wholesale enquiry form, call +91 98407 50467, email hikmaexports@gmail.com, or visit the Moore Street office in Mannadi, Chennai.',
    },
    {
      question: 'What information should export buyers send?',
      answer:
        'Include your destination country, product list, quantities, required pack sizes, labelling requirements and preferred shipping terms so the team can confirm availability, pricing and dispatch options.',
    },
    {
      question: 'Do you support private label, events and functions?',
      answer:
        'Yes. Hikma Exports supports private-label and own-brand orders for retailers, fragrance brands, events and functions. Share your artwork, target quantity, event date or launch timeline so the team can confirm feasibility, minimum quantities and lead time.',
    },
    {
      question: 'Do you have GST and IEC for trade and export orders?',
      answer:
        'Yes. Hikma Exports is a GST-registered business with an Import Export Code (IEC). Registration numbers and destination-specific documents are shared with buyers as part of the quotation.',
    },
  ],
  sameAs: [BUSINESS.socialByKey('instagram').href],
}

// --------------------------------------------------------------------------
// WHOLESALE — B2B landing page copy and buyer FAQs
// --------------------------------------------------------------------------
export const WHOLESALE = {
  eyebrow: 'B2B & Commercial Supply',
  title: 'Perfume & Attar Wholesale in Chennai',
  intro:
    'Hikma Exports supplies alcohol-free attars, concentrated fragrance oils, roll-on perfumes and perfume packaging to retailers, perfumers, distributors and export buyers from Mannadi, George Town, Chennai.',
  overviewHeading: 'Wholesale Perfume Supply from Chennai',
  overviewParagraphs: [
    'Arees Perfumes supplies wholesale attars and bulk perfume oils to perfumers, retailers, gift shops, event buyers and boutique fragrance brands. Based in Mannadi, George Town, Chennai, and operating under Hallmark of Excellence and Hikma Exports, we combine traditional Arabian perfumery with commercial order support.',
    'Loose attar and fragrance oil orders start at 100 g. Arees and Dahab branded packs start at 60 pieces across a combined branded order, so the two brands can be mixed within the same requirement. Export orders are handled for buyers in India and international markets.',
  ],
  quickFacts: [
    { label: 'Loose attar / fragrance oil MOQ', value: '100 g' },
    { label: 'Arees & Dahab branded packs', value: '60 pieces combined' },
    { label: 'Wholesale desk hours', value: '9:00 AM – 9:30 PM' },
    { label: 'Export', value: 'India + Singapore, Malaysia, UAE, Sri Lanka, Maldives' },
    { label: 'Private label', value: 'Own-brand, event and function orders' },
    { label: 'Business documents', value: 'GST-registered business with IEC' },
  ],
  productRange: [
    {
      title: 'Wholesale Roll-on Attars',
      description:
        'Ready-to-retail 6ml and 8ml roll-on attar bottles under the Arees and Dahab collections. Branded packs start at 60 pieces across a combined order.',
      links: [
        { label: 'View Roll-On Attars', to: '/categories/1' },
        { label: 'Explore Arees Wholesale', to: '/brand/arees' },
      ],
    },
    {
      title: 'Bulk Concentrated Fragrance Oils',
      description:
        'Pure attar bases and undiluted perfume oils in commercial quantities for blending, decanting and custom perfume creation. Loose oils start at 100 g.',
      links: [{ label: 'View Fragrance Oils', to: '/categories/10' }],
    },
    {
      title: 'Bottles, Caps & Packaging Solutions',
      description:
        'Glass roll-on bottles, spray bottles, aluminium and gold caps, spray pumps and display bottles for brands assembling their own fragrance lines.',
      links: [{ label: 'Request Packaging Details', to: '/contact' }],
    },
    {
      title: 'Bakhoor & Traditional Incense',
      description:
        'Arabian bakhoor chips and aromatic resins for specialty stores, religious occasions, gifting and export orders.',
      links: [{ label: 'Explore Hikma Exports', to: '/hikma-exports' }],
    },
    {
      title: 'Private Label & Event Orders',
      description:
        'Own-brand labels, bottles, caps and packs for retailers, fragrance brands, events and functions. Minimum quantities and lead time are reviewed per order.',
      links: [{ label: 'Discuss Private Label', to: '/contact' }],
    },
    {
      title: 'Export & Domestic Supply',
      description:
        'Wholesale supply across India and export orders to buyers in Singapore, Malaysia, the UAE, Sri Lanka, the Maldives and other confirmed destinations.',
      links: [{ label: 'Export Enquiry', to: '/hikma-exports' }],
    },
  ],
  tiers: [
    {
      badge: 'Starter Tier',
      heading: '60 – 120 Pieces',
      description: 'Ideal for independent perfume retailers, boutiques, and initial store stock.',
    },
    {
      badge: 'Commercial Tier',
      heading: '180 Pieces',
      description: 'Optimised rates for growing perfume shops and regional distributors.',
    },
    {
      badge: 'Master Wholesale',
      heading: '216+ Pieces',
      description: 'Our lowest per-piece wholesale price for volume distributors and bulk trading partners.',
    },
  ],
  tiersNote:
    'Branded Arees/Dahab packs start at 60 pieces combined. Loose attar and fragrance oil orders start at 100 g. Volume pricing and dispatch lead time are confirmed in the quotation.',
  process: [
    {
      title: 'Browse Real Catalogue',
      description: 'Explore all 370+ active products with live pricing and variant configurations.',
    },
    {
      title: 'Assemble Order Request',
      description: 'Add required quantities to your list or reach our desk directly via WhatsApp with your SKU list.',
    },
    {
      title: 'Receive Formal Invoice',
      description: 'Get a computer-generated GST-compliant invoice specifying exact item rates, quantities, and transport.',
    },
    {
      title: 'Secure Dispatch',
      description: 'Orders are carefully packed and dispatched through reliable courier and transport networks from Chennai.',
    },
  ],
  sections: [
    {
      heading: 'Wholesale Fragrance Supply for Trade Buyers',
      paragraphs: [
        'Our wholesale range covers ready-to-retail 6ml and 8ml roll-on attars, concentrated fragrance oils and attar bases, bakhoor, and glass packaging components. Retailers, perfume brands, gift shops and distributors can source multiple lines from one Chennai supplier.',
        'The catalogue combines the Arees and Dahab collections with bulk fragrance oils for blending, decanting and finished perfume production. Share the scents, pack sizes and quantities you need so the team can confirm availability and wholesale pricing.',
      ],
    },
    {
      heading: 'MOQ, Wholesale Desk Hours & Order Terms',
      paragraphs: [
        'Loose attar and fragrance oil orders start at 100 g. Arees and Dahab branded packs start at 60 pieces across a combined branded order.',
        'The wholesale desk is available from 9:00 AM to 9:30 PM. Production and dispatch lead time is confirmed in the quotation because it depends on the product mix, quantities and destination.',
        'GST invoicing is available for domestic orders. For export orders, IEC and destination-specific documentation are confirmed with the quotation.',
      ],
    },
    {
      heading: 'Private Label, Events & Function Orders',
      paragraphs: [
        'Arees Perfumes and Hikma Exports support private-label and own-brand orders for retailers, fragrance brands, events and functions. Buyers can discuss labels, bottles, caps, pumps and pack sizes around their requirement.',
        'Private-label feasibility, minimum quantities and lead time are reviewed per order. Share your artwork, target quantity, event date or launch timeline so the team can confirm the right components and schedule.',
      ],
    },
    {
      heading: 'How to Request Wholesale Pricing',
      paragraphs: [
        'Send your product list, required quantities, preferred pack sizes and delivery destination by phone, email or the wholesale enquiry form. If you are comparing several scents, include the product names or catalogue references so the quotation is accurate.',
        'For export enquiries, include the destination country, labelling requirements and preferred shipping terms. The Chennai team will confirm the commercial details and dispatch options for your order.',
      ],
    },
    {
      heading: 'What Your Quotation Confirms',
      paragraphs: [
        'Every wholesale or export quotation confirms the minimum order quantity, unit price, lead time, packing and labelling details, shipping terms, payment terms and documentation for your destination.',
        'These details depend on the products, quantities and destination, so they are confirmed in writing for your enquiry rather than published as a single rate. Share your requirement and the Chennai team will send the applicable terms.',
      ],
    },
    {
      heading: 'Packaging, Labelling and Order Support',
      paragraphs: [
        'Wholesale buyers can ask about roll-on bottles, spray bottles, caps, pumps and display bottles alongside fragrance oils and finished roll-ons. Custom labelling and packaging requirements are reviewed per order.',
        'Orders are coordinated from the Moore Street office in Mannadi, with support for pack-size planning, invoice documentation and dispatch through Chennai courier and transport networks.',
      ],
    },
  ],
  buyerChecklist: [
    'Product names or scent families you want to stock',
    'Estimated quantities and preferred pack sizes',
    'Retail, distribution or export destination',
    'Destination city or port for export enquiries',
    'Label, bottle, cap or pump requirements',
    'Preferred delivery timeline and shipping terms',
    'Preferred payment terms',
    'GST details for invoicing, if required',
    'IEC and destination country for export orders',
  ],
  faqs: [
    {
      question: 'What products can I buy wholesale from Hikma Exports?',
      answer:
        'Hikma Exports supplies alcohol-free attars, oud and fragrance oils, roll-on perfumes, bakhoor, and perfume packaging including bottles, caps and pumps.',
    },
    {
      question: 'What is the wholesale minimum order quantity?',
      answer:
        'Loose attar and fragrance oil orders start at 100 g. Arees and Dahab branded packs start at 60 pieces across a combined branded order, so the two brands can be mixed within the same requirement.',
    },
    {
      question: 'What are the wholesale desk hours and lead time?',
      answer:
        'The wholesale desk is available from 9:00 AM to 9:30 PM. Production and dispatch lead time is confirmed in the written quotation because it depends on the product mix, quantities and destination.',
    },
    {
      question: 'Can I order both roll-on attars and fragrance oils in bulk?',
      answer:
        'Yes. The wholesale range includes ready-to-retail 6ml and 8ml roll-on attars as well as concentrated fragrance oils and attar bases for blending and decanting.',
    },
    {
      question: 'Do you handle export enquiries?',
      answer:
        'Yes. Hikma Exports supplies buyers across India and international markets including Singapore, Malaysia, the UAE, Sri Lanka and the Maldives. Include the destination country, product list, quantities, labelling requirements and preferred shipping terms in your enquiry.',
    },
    {
      question: 'Do you support private label, events and functions?',
      answer:
        'Yes. We support private-label and own-brand orders for retailers, fragrance brands, events and functions. Share your artwork, target quantity, event date or launch timeline so the team can confirm feasibility, minimum quantities and lead time.',
    },
    {
      question: 'Do you have GST and IEC for trade and export orders?',
      answer:
        'Yes. Hikma Exports is a GST-registered business with an Import Export Code (IEC). Registration numbers and destination-specific documents are shared with buyers as part of the quotation.',
    },
    {
      question: 'Can I request custom labelling or packaging?',
      answer:
        'Share your label, bottle, cap or pump requirements with the team. Custom labelling and packaging options are reviewed against your order quantity and destination.',
    },
    {
      question: 'Where is the wholesale office?',
      answer:
        'The wholesale desk operates from 83 & 84, Moore Street, Mannadi, George Town, Chennai, Tamil Nadu 600001, and is available from 9:00 AM to 9:30 PM.',
    },
  ],
}

// --------------------------------------------------------------------------
// SOUTH INDIA �?" regional boutique and local supply landing page
// --------------------------------------------------------------------------
export const SOUTH_INDIA = {
  eyebrow: 'Regional Boutique & Supply Hub',
  title: 'Attar Shop in Chennai & South India',
  intro:
    'Three decades of authentic fragrance craftsmanship rooted in Mannadi, Chennai - serving perfume lovers and businesses across South India.',
  heritage: {
    heading: 'Trusted Attar and Perfume Tradition in Chennai & South India',
    paragraphs: [
      "Located in Chennai's renowned trading enclave at Moore Street, Mannadi, Arees Perfumes has spent over 30 years supplying high-grade concentrated perfume oils, authentic attars, and bespoke packaging to fragrance enthusiasts across Tamil Nadu, Kerala, Karnataka, Andhra Pradesh, and Telangana.",
      'South India has a deep, cherished heritage of natural scent appreciation - from traditional Marikolundu and Sandalwood to precious Arabian Oudh, Amber, and floral absolutes. We honour this rich history by formulating alcohol-free perfume oils using pure distillation techniques and small-batch artisan blending.',
    ],
  },
  reasons: [
    {
      title: 'Authentic, 100% Alcohol-Free Oils',
      description:
        'Every attar in our boutique is free from synthetic dilution, industrial alcohol, and harsh fixatives. Gentle on skin, non-staining on fabrics, and suitable for religious occasions.',
    },
    {
      title: 'Both Retail & Wholesale Under One Roof',
      description:
        'Whether you need a single 6ml roll-on for personal daily wear or hundreds of wholesale bottles for a perfume store in Bengaluru, Hyderabad, Kochi, or Madurai, we provide direct pricing without intermediary margins.',
    },
    {
      title: 'Fast, Secure South India Delivery',
      description:
        'Strategically positioned in central Chennai with daily dispatches through premier logistics partners, supporting prompt transit across South Indian districts and metropolitan centres.',
    },
    {
      title: 'Extensive 370+ Fragrance Collection',
      description:
        'From classic Arabian Oudh and Black Musk to traditional Indian florals, fresh aquatic notes, and luxury bakhoor resins - explore one of South India\'s most comprehensive attar selections.',
    },
    {
      title: 'Wholesale MOQ & Export Support',
      description:
        'Loose attar and fragrance oil orders start at 100 g. Arees and Dahab branded packs start at 60 pieces across a combined branded order. Export orders are handled for buyers in India and markets including Singapore, Malaysia, the UAE, Sri Lanka and the Maldives.',
    },
    {
      title: 'Private Label for Events & Functions',
      description:
        'We support private-label and own-brand orders for retailers, fragrance brands, events and functions. Share your artwork, target quantity and event date so the team can confirm feasibility and lead time.',
    },
  ],
  store: {
    heading: 'Visit Our Chennai Boutique',
    addressLabel: 'Boutique Address',
    landmark: 'Landmark: Opposite Kalaiyam School, Mannadi, George Town',
    directionsLabel: 'Get Directions on Google Maps',
    hoursHeading: 'Visiting Hours',
    hours: [
      'Monday - Saturday: 10:00 AM - 9:00 PM',
      'Sunday: Closed / Prior appointment',
    ],
    contactHeading: 'Phone & WhatsApp',
    wholesaleHours: 'Wholesale desk: 9:00 AM - 9:30 PM',
  },
  coverage: {
    heading: 'South India Delivery & Service Coverage',
    intro:
      'We deliver carefully packaged retail orders and bulk wholesale consignments to major South Indian regions:',
    regions: [
      {
        title: 'Tamil Nadu',
        description: 'Chennai, Coimbatore, Madurai, Tiruchirappalli, Salem, Tirunelveli, Vellore, and all districts.',
      },
      {
        title: 'Kerala',
        description: 'Kochi, Thiruvananthapuram, Kozhikode, Thrissur, Malappuram, Kannur, and statewide express delivery.',
      },
      {
        title: 'Karnataka',
        description: 'Bengaluru, Mysuru, Mangaluru, Hubballi, Belagavi, and regional commercial centres.',
      },
      {
        title: 'Andhra Pradesh & Telangana',
        description: 'Hyderabad, Visakhapatnam, Vijayawada, Guntur, Warangal, Tirupati, and Rayalaseema districts.',
      },
    ],
  },
  cta: {
    heading: 'Explore Our South India Collections Online',
    intro: 'Order directly for home delivery or coordinate bulk supply with our Chennai desk.',
  },
}

// --------------------------------------------------------------------------
// CONTACT �?" Contact page / checkout page headings + side info block
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
        { label: 'Retail Attars', to: '/retail' },
      ],
    },
    {
      heading: 'Wholesale & Stores',
      links: [
        { label: 'Wholesale Attars', to: '/wholesale' },
        { label: 'Hikma Exports', to: '/hikma-exports' },
        { label: 'Attars South India', to: '/attar-perfume-shop-south-india' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'About Us', to: '/about' },
        { label: 'Guides', to: '/guides' },
        { label: 'Contact', to: '/contact' },
        { label: 'Track Order', to: '/track-order' },
      ],
    },
  ],
  copyright: `© ${new Date().getFullYear()} Hikma Exports (Arees & Dahab). All rights reserved.`,
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
