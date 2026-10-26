const supabase = require('../config/supabase')
const {
  stripModeMarkers,
  hasExactMarker,
  hasPackMarker,
  withExactPiecesMode,
} = require('./exactPieces')

const DESCRIPTIONS = [
  {
    id: '4b212cb3-6309-409b-a185-9ead1665d181',
    placeholder: 'arees luxury',
    description:
      'An Arees Luxury 12ml perfume with a fresh, confident character, Hawas opens with crisp citrus and aromatic spice before settling into a clean woody-musk base. The compact bottle is easy to carry for daily wear, travel and gifting, while the concentrated finish leaves a close, lasting trail. Available in 2, 6, 12 and 24-piece packs, with exact loose-piece quantities and wholesale support from Arees Perfumes.',
  },
  {
    id: '46b82f0a-6867-4dd9-a620-0e9115772cf4',
    placeholder: 'arees luxury',
    description:
      'A warm, woody Arees Luxury 12ml perfume centred on oud, Oudh Luxury blends rich agarwood with soft spice and a smooth amber-musk finish. Its deep, resinous trail suits evening wear, festive occasions and layering with rose or saffron accords. The compact bottle is ideal for travel and gifting. Available in 2, 6, 12 and 24-piece packs, with exact loose-piece quantities and wholesale support.',
  },
  {
    id: '6f4d2b29-99f6-4301-9970-721cb7f390de',
    placeholder: 'arees luxury',
    description:
      'A bold floral-oriental Arees Luxury 12ml perfume, Top Fort Black Orchid blends dark orchid and blackcurrant with warm spice and a velvety woody base. Rich and statement-making, it works well for evening wear and special occasions. The pocket-friendly bottle is ready for travel, gifting or retail display. Available in 2, 6, 12 and 24-piece packs, with exact loose-piece quantities and wholesale support.',
  },
  {
    id: 'c5206bd1-bb4a-49b9-b0c8-522f7e82f23d',
    placeholder: 'arees luxury',
    description:
      'A fresh floral-aquatic Arees Luxury 12ml perfume, White Orchid Aqua combines white orchid and watery green notes with a clean musk finish. Light, bright and easy to wear, it suits daytime use, humid weather and everyday gifting. The compact bottle travels easily for touch-ups through the day. Available in 2, 6, 12 and 24-piece packs, with exact loose-piece quantities and wholesale support.',
  },
  {
    id: 'be1f0d17-3619-4c79-bb9f-90d12b2eacc2',
    placeholder: 'roll-on bottle',
    description:
      'An 8ml glass roll-on bottle set for filling perfume oils, attars and fragrance blends. Each bottle has a leak-resistant roller fitting and a metallic cap, with black, gold and silver finishes for retail-ready presentation. The slim, BPA-free design is ideal for samples, travel sets, gifting and refillable use. Available in 60 to 600-piece quantities, with exact loose-piece selection and wholesale support from Arees Perfumes.',
  },
  {
    id: '538d30a8-1341-4ac0-b6e8-03bb9b3009d4',
    placeholder: 'roll-on bottle',
    description:
      'A 6ml glass roll-on bottle for perfume oils, attars and sample-size fragrance blends. Its compact body, smooth roller and secure cap make it practical for travel, gifting, trial packs and retail shelves, while the clear glass shows off the colour of the fragrance. Suitable for filling and resale. Available in 60 to 600-piece quantities, with exact loose-piece selection and wholesale support.',
  },
  {
    id: '0b7bd953-bce5-4bd0-8323-bf60b6ce57c4',
    placeholder: 'bakhoor',
    description:
      'A 50g pack of Arees Bait Al Oud bakhoor, a rich oud-forward incense with warm woody, resinous and softly smoky notes. Designed for homes, majlis gatherings, festive occasions and retail gifting, it releases a deep, welcoming fragrance when burned on a suitable burner. Available in 3, 6, 12, 24 and 36-piece packs, with exact loose-piece quantities and wholesale support.',
  },
  {
    id: 'a15a69d4-5f70-4c57-82ea-b726dffd4095',
    placeholder: 'bakhoor',
    description:
      'A 50g pack of Arees Bait Alzawaj bakhoor, a celebratory incense blend with warm amber, sweet resin and soft woody notes. Its inviting, festive character suits weddings, family gatherings, majlis settings and thoughtful gifting. Burn a small piece on a heat-safe bakhoor burner and enjoy the lingering aroma. Available in 3, 6, 12, 24 and 36-piece packs, with exact loose-piece quantities and wholesale support.',
  },
  {
    id: '66261ee2-aaa7-43de-9fa9-c97d43c23ab2',
    placeholder: 'bakhoor',
    description:
      'A 50g pack of Arees Ad Dawli bakhoor, a balanced oriental incense with warm spice, amber and smooth woody notes. Its rounded, long-lingering fragrance creates a welcoming atmosphere for everyday home use, gatherings, festive occasions and gifting. Best enjoyed on a traditional heat-safe bakhoor burner. Available in 3, 6, 12, 24 and 36-piece packs, with exact loose-piece quantities and wholesale support.',
  },
  {
    id: 'cc4c045b-432d-4c90-8d3e-bac711fd7c95',
    placeholder: 'bakhoor',
    description:
      'A 50g pack of Arees Jannathul Firdous bakhoor, a lush floral-fruity incense with sweet blossom, soft fruit and a warm musky base. Its rich, uplifting fragrance brings a celebratory feel to homes, weddings, gifting and festive gatherings. Burn a small piece on a heat-safe bakhoor burner for a lingering trail. Available in 3, 6, 12, 24 and 36-piece packs, with exact loose-piece quantities and wholesale support.',
  },
  {
    id: '45afdd06-aaf3-4a33-a538-f3be61001176',
    placeholder: 'bakhoor',
    description:
      'A 50g pack of Arees Noora bakhoor, a smooth floral-musky incense with powdery blossom, soft amber and a clean, comforting finish. Elegant and easy to wear in the home, it suits daily burning, evening gatherings, gifting and festive occasions. Place a small piece on a heat-safe bakhoor burner and let the aroma unfold. Available in 3, 6, 12, 24 and 36-piece packs, with exact loose-piece quantities and wholesale support.',
  },
  {
    id: '728b2580-bc34-4c14-95f7-1c4790f5bdc1',
    placeholder: 'bakhoor',
    description:
      'A 50g pack of Arees Ameer Al Oudh bakhoor, a regal oud-forward incense with deep agarwood, warm spice and amber-rich woods. Its bold, luxurious trail is made for evening gatherings, majlis settings, festive occasions and premium gifting. Burn a small piece on a heat-safe bakhoor burner for a long-lasting aroma. Available in 3, 6, 12, 24 and 36-piece packs, with exact loose-piece quantities and wholesale support.',
  },
  {
    id: 'da1513b3-b8bb-4b17-aada-db2309466068',
    placeholder: 'face wash',
    description:
      'A 100g Arees Rice Water & Hyaluronic Face Wash that gently cleanses while helping the skin feel hydrated and fresh. The rice-water and hyaluronic formula lifts daily dirt and excess oil without a tight finish, making it suitable for all skin types and regular morning or evening use. Paraben-free, sulphate-free and dermatologically tested. Available in 3 to 72-piece packs, with exact loose-piece quantities and wholesale support.',
  },
  {
    id: '64b33f4e-b352-417c-a75d-06adb231b929',
    placeholder: 'face wash',
    description:
      'A 100g Arees Papaya & Niacinamide Face Wash that gently cleanses while helping the skin look bright and clear. Papaya extract and niacinamide support everyday cleansing, lifting dirt and excess oil without leaving the skin feeling tight. Suitable for all skin types and regular morning or evening use. Paraben-free, sulphate-free and dermatologically tested. Available in 3 to 72-piece packs, with exact loose-piece quantities and wholesale support.',
  },
]

async function runProductDescriptionBackfill() {
  const ids = DESCRIPTIONS.map((item) => item.id)
  const { data: products, error } = await supabase
    .from('products')
    .select('id, description')
    .in('id', ids)
  if (error) throw error

  const byId = new Map((products || []).map((product) => [product.id, product]))
  let updated = 0

  for (const item of DESCRIPTIONS) {
    const product = byId.get(item.id)
    if (!product) continue

    const current = stripModeMarkers(product.description)
    if (String(current || '').trim().toLowerCase() !== item.placeholder) continue

    const hadPack = hasPackMarker(product.description)
    const hadExact = hasExactMarker(product.description)
    const description = withExactPiecesMode(
      item.description,
      hadExact && !hadPack,
      hadPack || (hadExact && !hadPack)
    )

    const { error: updateError } = await supabase
      .from('products')
      .update({ description })
      .eq('id', item.id)
    if (updateError) {
      console.error(`[description-backfill] update failed for ${item.id}:`, updateError.message)
      continue
    }
    updated += 1
  }

  if (updated > 0) {
    console.log(`[description-backfill] updated ${updated} newly added products`)
  }
  return { updated, total: DESCRIPTIONS.length }
}

module.exports = { runProductDescriptionBackfill }
