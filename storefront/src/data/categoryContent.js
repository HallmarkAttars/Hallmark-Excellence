// Editorial copy for every live catalogue category, keyed by the category
// NAME the public API returns (trimmed/lowercased at lookup time).
//
// Why code,keyed copy: the database descriptions on the live categories are
// scrambled or empty - e.g. "Roll on Bottles" says "Traditional scented wood
// chips and resins", "Canter Bottle" says "Everyday deodorant body sprays",
// and "Bakhoor" has no description at all. Those strings flow straight into
// meta descriptions and on-page intros, so they are overridden here with
// verified copy instead of editing the DB. Slugs are unreliable as keys
// ("Bakhoor " carries a trailing space; "Roll on" is the Fancy Bottle
// category while "1" is Roll on Attars), so the name is the key.
//
// Rules enforced by categoryContent.test.js:
//   - metaDescription stays short enough for the auto-appended
//     "Prices from ..." suffix to keep the final description under 160 chars
//   - every entry has an intro and at least two sections
//   - every related link starts with '/'
//
// Lookup is additive and defensive: unmatched names return null and the
// caller keeps its current behaviour.

const CTA_LINE =
  'Share your requirements by phone or WhatsApp on +91 98407 50467, or visit the shop at 83 & 84, Moore St, Mannadi, George Town, Chennai 600001.'

export const CATEGORY_CONTENT = {
  bakhoor: {
    title: 'Bakhoor Perfume, Attar & Fragrance Online | Arees Perfumes',
    metaDescription:
      'Shop bakhoor perfume, bakhoor attar and scented wood chips from Arees Perfumes. Alcohol-free, delivered across India.',
    intro:
      'Shop bakhoor perfume, bakhoor attar, scented wood chips and oriental incense from Arees Perfumes, Chennai. Each bakhoor blend uses the same alcohol-free oils as our attars and scents a room, wardrobe or gathering in minutes.',
    sections: [
      {
        heading: 'What Bakhoor Is',
        paragraphs: [
          'Bakhoor (also spelled bukhoor) is fragrant wood chips or a dense blended brick soaked in scented oils and resins. A small piece is placed on a burner or charcoal, the smoke carries the fragrance through the room, and a single session can scent fabrics, curtains and clothing for days.',
          'It sits alongside oud, amber and musk in the classic Arabic fragrance tradition, and pairs naturally with an oud or amber attar worn on the skin.',
        ],
      },
      {
        heading: 'How to Use Bakhoor at Home',
        paragraphs: [
          'Use an electric bakhoor burner or a mabkhara (traditional burner) with charcoal. Let the smoke drift through hallways, wardrobes and majlis seating rather than holding spaces closed. Wave a smoke-filled censer gently over clothes before an occasion for a light, even scent.',
          'Keep burners on a heat-safe surface, ventilate the room, and keep pieces out of reach of children. A few chips go a long way - you do not need much for a whole home.',
        ],
      },
      {
        heading: 'Buying Bakhoor from Arees Perfumes',
        paragraphs: [
          'Our bakhoor is blended in-house with the same concentrated oils we bottle as attars, so what you burn matches what you wear. Pieces are sold ready to use, with guidance on burner type and quantity on request.',
          CTA_LINE,
        ],
      },
    ],
    relatedGuides: [
      { label: 'Read the full bakhoor guide', to: '/guides/bakhoor-guide' },
      { label: 'Oud, amber and musk families explained', to: '/guides/oud-perfume-guide' },
    ],
  },

  'roll on attars': {
    intro:
      'Ready-to-retail roll-on attars in 6ml and 8ml glass vials from the Arees and Dahab collections - alcohol-free concentrated oils packed for shelves, gifting and daily carry.',
    sections: [
      {
        heading: 'Retail Roll-Ons That Sell Themselves',
        paragraphs: [
          'Roll-on attars are the fastest-moving item on most attar counters: a compact vial, a clear scent story and an easy trial on the wrist. Arees and Dahab roll-ons are filled with concentrated, alcohol-free oils, so a small bottle delivers weeks of daily wear.',
          'Sizes run 6ml and 8ml with steel-ball applicators and airtight caps, packed to travel well in a handbag or pocket.',
        ],
      },
      {
        heading: 'Wholesale for Shops and Distributors',
        paragraphs: [
          'Roll-on attars are supplied wholesale by Hikma Exports from Mannadi, Chennai. Branded packs start from 60 pieces with mixed scents available, and loose attar oil for refilling your own vials starts at 100 g. Share your counter mix and quantities for a formal quotation.',
        ],
      },
    ],
    relatedGuides: [
      { label: 'Roll-on attars: sizes, longevity and buying tips', to: '/guides/roll-on-attar-guide' },
      { label: 'Wholesale attar buying guide', to: '/guides/wholesale-attar-buying-guide' },
    ],
  },

  'fragrance oil': {
    intro:
      'The heart of the house: concentrated fragrance oils for perfume making, attar counters and plants alike, supplied retail and wholesale from Chennai.',
    sections: [
      {
        heading: 'What This Range Is',
        paragraphs: [
          'Fragrance oils here are alcohol-free concentrates - the liquids we fill into roll-ons and retail bottles, sold exactly as blended. Scents run the full spread: florals such as rose and jasmine, dry sandalwood-type woods, ambers, resins, musks, gourmand and fresh lines.',
          'Because they are concentrates, a little goes a long way on skin, and the same oil can be diluted for soaps, candles, incense sticks and cosmetics by makers.',
        ],
      },
      {
        heading: 'Buying for Retail or Business Use',
        paragraphs: [
          'Individual scents can be bought at retail sizes for personal use. Perfumers, soap and candle makers, and attar shops buying larger volumes are supplied by Hikma Exports: loose oil starts at 100 g, with larger packs and scent sourcing (share a reference or a scent brief) available on request.',
          CTA_LINE,
        ],
      },
    ],
    relatedGuides: [
      { label: 'How to spot a quality attar', to: '/guides/how-to-spot-quality-attar' },
      { label: 'Wholesale attar buying guide', to: '/guides/wholesale-attar-buying-guide' },
    ],
  },

  'roll on bottles':
    {
      title: 'Roll-On Bottles & Glass Vials for Attar Oils | Arees Perfumes',
      metaDescription:
        'Buy empty roll-on bottles and glass vials for attars and perfume oils from Arees Perfumes, Chennai. Retail and wholesale across India.',
      intro:
        'Empty roll-on bottles and vials - the same presentation our own attars ship in - for refillers, private-label makers and gift packers.',
      sections: [
        {
          heading: 'Roll-On Bottles for Attar Brands and Refillers',
          paragraphs: [
            'These are the classic slim roll-on vials used for attars, perfume oils and herbal blends: glass body, roll-on ball for a clean thin line of oil, and a snug cap for travel. They suit shops that refill from bulk oils as well as small brands launching their own line.',
            'Bottles are empty and shipped ready to fill. For sizing and pack quantities, share your vial size requirement with our Chennai desk.',
          ],
        },
        {
          heading: 'Bulk Supply and Pairing',
          paragraphs: [
            'Caps for these vials are stocked separately - see the caps category - so replacement caps or a different cap finish can be ordered without changing bottles. Wholesale quantities are handled by Hikma Exports.',
            CTA_LINE,
          ],
        },
      ],
      relatedGuides: [
        { label: 'Roll-on attars: sizes, longevity and buying tips', to: '/guides/roll-on-attar-guide' },
      ],
    },

  'fancy bottle': {
    title: 'Fancy Attar Bottles & Decorative Vials | Arees Perfumes',
    metaDescription:
      'Browse fancy attar bottles and decorative perfume vials from Arees Perfumes - display packs for counters, gifting and presentation.',
    intro:
      'Decorative and display-grade bottles for attar counters, premium gifting and presentation sets - the bottles that make an oil look like a gift.',
    sections: [
      {
        heading: 'Presentation That Sells the Oil',
        paragraphs: [
          'Fancy bottles change how an attar reads on the shelf: a carved or shaped flacon with an applicator reads premium and gifting-ready, which is why shops keep a dedicated presentation bottle for best sellers and personalise it with a ribbon or label.',
          'They are popular for wedding trousseaux, Diwali hampers and corporate gift sets where the bottle itself is part of the gift.',
        ],
      },
      {
        heading: 'Counter Displays and Bulk Orders',
        paragraphs: [
          'For shop counters and gift packers, mixed display bottles are available in wholesale quantities via Hikma Exports, Chennai. Tell us the look you want - classic, modern or ornate display pieces - and we will confirm current sizes in stock.',
          CTA_LINE,
        ],
      },
    ],
    relatedGuides: [
      { label: 'Attar gifting guide', to: '/guides/attar-gifting-guide' },
    ],
  },

  'caps for roll on bottles': {
    title: 'Roll-On Bottle Caps & Closures | Arees Perfumes',
    metaDescription:
      'Replacement caps and closures for roll-on attar bottles from Arees Perfumes, Chennai. Supplied individually and in bulk for shops and packers.',
    intro:
      'Spare and bulk caps that fit our roll-on vial range - for refills, reworks and brands that need a consistent closure on every unit.',
    sections: [
      {
        heading: 'Caps That Fit Our Roll-On Bottles',
        paragraphs: [
          'Roll-on bottles live and die by their caps: the closure must stay tight in a pocket and keep the ball sealed between uses. These caps are stocked to match the vials in our roll-on bottle category, so bottles and caps can be ordered together or separately.',
          'They are handy for gift packers and attar shops that decant oils for customers and need spare closures on hand.',
        ],
      },
      {
        heading: 'Ordering Caps in Bulk',
        paragraphs: [
          'Bulk quantities for workshops and packing units are supplied by Hikma Exports, Chennai. Confirm the vial size and cap type when ordering so the fit is right the first time.',
          CTA_LINE,
        ],
      },
    ],
    relatedGuides: [
      { label: 'Roll-on attars: sizes, longevity and buying tips', to: '/guides/roll-on-attar-guide' },
    ],
  },

  'spray bottles': {
    title: 'Attar Spray Bottles & Fine-Mist Sprayers | Arees Perfumes',
    metaDescription:
      'Buy attar and perfume spray bottles from Arees Perfumes, Chennai. Fine-mist packaging for fragrance makers, attar shops and gift packers.',
    intro:
      'Spray bottles for repacking attars and fragrance oils as fine-mist sprays - the format many customers prefer for body and fabric use.',
    sections: [
      {
        heading: 'Spray Bottles for Attars and Perfume Oils',
        paragraphs: [
          'Many buyers prefer an alcohol-free attar as a spray: a fine mist covers clothing and rooms evenly and makes a concentrated oil feel lighter on skin. These bottles come in multiple sizes suited to personal bottles, counter sprays and gift sets.',
          'They suit perfume makers, attar shops and gift packers who fill their own blends.',
        ],
      },
      {
        heading: 'Matching Pumps, Caps and Bulk Supply',
        paragraphs: [
          'Pump and cap components for these sprayers are stocked separately - see the pump category - so a complete spray presentation can be assembled from the catalogue. Larger quantities are handled by Hikma Exports, Chennai.',
          CTA_LINE,
        ],
      },
    ],
    relatedGuides: [
      { label: 'Wholesale attar buying guide', to: '/guides/wholesale-attar-buying-guide' },
    ],
  },

  'pump & cap for spray bottles': {
    title: 'Spray Bottle Pumps & Caps for Attars | Arees Perfumes',
    metaDescription:
      'Spare pumps and caps for attar spray bottles from Arees Perfumes, Chennai. Replacement sprayer components supplied retail and in bulk.',
    intro:
      'Spare pumps and cap components that turn a wrapped bottle into a working fine-mist sprayer - replacements and assembly stock in one place.',
    sections: [
      {
        heading: 'Pumps and Caps That Match Our Sprayers',
        paragraphs: [
          'A spray presentation is only as good as its pump: it must mist finely and hold pressure through repeated use. These pumps and caps are stocked to match the spray bottles in the catalogue, so components can be reordered without changing bottles.',
          'Workshops that fill and cap sprayers in batches usually keep spare pumps on hand for reworks.',
        ],
      },
      {
        heading: 'Bulk Components for Filling Workshops',
        paragraphs: [
          'Pumps and caps in bulk quantities are supplied by Hikma Exports, Chennai. Confirm bottle size and pump type when ordering so components match on arrival.',
          CTA_LINE,
        ],
      },
    ],
    relatedGuides: [
      { label: 'Wholesale attar buying guide', to: '/guides/wholesale-attar-buying-guide' },
    ],
  },

  'canter bottle': {
    title: 'Canter Bottles for Attars | Counter Decanters | Arees Perfumes',
    metaDescription:
      'Canter bottles for attar shops and fragrance counters from Arees Perfumes, Chennai. Classic shelf bottles for decanting and display.',
    intro:
      'Canter bottles - the classic counter decanter seen in attar shops - for pouring from bulk stock into sales vials with minimal spillage.',
    sections: [
      {
        heading: 'Canter Bottles on the Attar Counter',
        paragraphs: [
          'A canter bottle is the wide-bodied counter decanter that holds bulk attar stock for dispensing. The shape lets a shopkeeper pour cleanly into 6ml and 8ml vials without drips, and the glass shows the oil colour - part of the showcase of a well-kept attar shop.',
          'They are used by attar shops, resellers and manufacturers who decant from drums into sales stock.',
        ],
      },
      {
        heading: 'Display Bottles and Bulk Supply',
        paragraphs: [
          'Canter bottles pair with our display-bottle range for a complete counter set. Bulk quantities for shops and packing units are supplied by Hikma Exports, Chennai.',
          CTA_LINE,
        ],
      },
    ],
    relatedGuides: [
      { label: 'Wholesale attar buying guide', to: '/guides/wholesale-attar-buying-guide' },
    ],
  },

  'arees face wash': {
    title: 'Arees Face Wash | Skincare from Arees Perfumes',
    metaDescription:
      'Arees face wash from Arees Perfumes, Chennai - everyday skincare from the fragrance house, delivered across India with our attars.',
    intro:
      'The skincare line from the Arees house: face wash formulated for everyday use, from a team that has deep experience with skin-friendly botanical oils.',
    sections: [
      {
        heading: 'Skincare from a Fragrance House',
        paragraphs: [
          'Arees face wash extends the same approach we take to attars: gentle daily-use products, cleanly packed, with no loud claims. Fragrance and skincare sit together naturally - a clean face makes any attar sit better on the skin.',
          'It is a natural companion purchase to any attar or fragrance oil, and shops can stock it beside roll-ons as an easy cross-sell.',
        ],
      },
      {
        heading: 'Availability',
        paragraphs: [
          'Face wash is stocked at the Mannadi shop and ships across India with the rest of the catalogue. For counter stocking, enquire about pack sizes and quantities.',
          CTA_LINE,
        ],
      },
    ],
    relatedGuides: [
      { label: 'How to choose an attar', to: '/guides/how-to-choose-attar' },
    ],
  },
}

// Name-keyed lookup. Trimmed and case-insensitive so "Bakhoor " from the DB
// resolves to 'bakhoor'. Unknown names return null - callers keep their
// existing behaviour.
export function getCategoryContent(category) {
  const key = String(category?.name ?? '').trim().toLowerCase()
  return CATEGORY_CONTENT[key] || null
}

// Exposed for tests/shops that want the contact line without duplicating it.
export { CTA_LINE }
