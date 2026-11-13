# Arees Perfumes — SEO Performance Report

**Prepared:** 13 November 2026
**Data window:** 28-day and 90-day periods ending 12 November 2026
**Search Console property:** `https://www.areesperfumes.in/`
**GA4 property:** `559874541`

> **Status:** P0 fixes are implemented in the working tree and verified by tests/build. They are not deployed yet. Production verification is pending.

---

## 1. Executive summary

- The site is **indexed and receiving impressions**, but clicks are still very low: **72 clicks / 1,486 impressions / 4.85% CTR** over 28 days.
- **90-day totals are almost identical to 28-day totals** (74 clicks / 1,507 impressions / 4.91% CTR). Visible Search Console history is effectively only about four weeks, so avoid treating this as a long-term trend.
- **Demand is rising faster than clicks.** Daily impressions grew from roughly 18–35 in mid-October to 91–147 in early November, while daily clicks stayed at 0–8.
- **Brand queries carry the account.** Returned query rows show 33 clicks / 592 impressions (5.57%) for brand terms versus 1 click / 277 impressions (0.36%) for non-brand terms.
- **Categories and brands are not earning visibility.** Of 29 page URLs with any impressions, 19 were products and 5 were guides; **0 categories and 0 brands** appeared. This is consistent with the discovered indexing gaps and the product-link issue below.
- **A technical defect is sending crawlers through UUID product URLs.** Category/brand product APIs omit `slug`, so those pages link UUID product paths that then 301 to canonical slug URLs. This adds unnecessary hops and weakens crawl efficiency.
- **P0 fixes implemented locally:** API slug payloads, homepage metadata encoding, broken LinkedIn schema, retail title/schema brand alignment, and `/about` + `/contact` retail metadata.

---

## 2. Google Search Console performance

### 2.1 Headline totals

| Period | Clicks | Impressions | CTR | Avg. position |
|---|---:|---:|---:|---:|
| 28 days | 72 | 1,486 | 4.85% | 8.1 |
| 90 days | 74 | 1,507 | 4.91% | 8.1 |

### 2.2 Daily pattern

- Impressions rose from roughly **18–35/day** in mid-October to **91–147/day** in early November.
- Clicks remained between **0 and 8/day**.
- The widening impression-to-click gap means the site is appearing for more queries but not winning the click. The main levers are title/snippet relevance, result position, and page intent match.

### 2.3 Brand vs non-brand

| Segment | Clicks | Impressions | CTR |
|---|---:|---:|---:|
| Brand rows | 33 | 592 | 5.57% |
| Non-brand rows | 1 | 277 | 0.36% |

Brand queries returned:

| Query | Clicks | Impressions | Avg. position |
|---|---:|---:|---:|
| `arees attar` | 12 | 88 | 2.4 |
| `arees perfume` | 8 | 116 | 2.5 |
| `arees attars & perfumes` | 5 | 30 | 2.3 |
| `hikma exports` | 4 | 27 | 3.4 |
| `arees` | 3 | 177 | 4.2 |

Non-brand queries with impressions but no clicks:

| Query | Impressions | Avg. position |
|---|---:|---:|
| `bakhoor perfume` | 82 | 12.5 |
| `bakhoor attar` | 66 | 16.7 |
| `bakhoor fragrance` | 58 | 10.6 |
| `bakhoor` | 20 | 15.8 |
| `musk tahara` | 20 | 10.9 |
| `oud fragrance` | 8 | 24.8 |
| `attar wholesale in chennai` | 7 | 12.1 |

**Interpretation:** the site has emerging non-brand demand around bakhoor, musk tahara, oud, and Chennai wholesale. Those queries are mostly on page 2 or worse, so the immediate opportunity is stronger category/guide targeting and internal linking, not broad new content.

### 2.4 Top pages

| Page | Clicks | Impressions | CTR | Avg. position |
|---|---:|---:|---:|---:|
| `/` | 61 | 716 | 8.5% | 3.7 |
| `/guides/bakhoor-guide` | 0 | 350 | 0% | 13.7 |
| `/wholesale` | 6 | 169 | 3.6% | 8.9 |
| `/attar-perfume-shop-south-india` | 3 | 153 | 2.0% | 12.9 |
| `/guides/roll-on-attar-guide` | 0 | 77 | 0% | 5.9 |
| `/hikma-exports` | 2 | 61 | 6.0% | — |
| `/guides/oud-perfume-guide` | 0 | 53 | 0% | 11.2 |

- Homepage is the only page with meaningful clicks.
- The bakhoor guide has the largest non-brand opportunity (350 impressions, 0 clicks, avg. position 13.7).
- Wholesale and South India pages have impressions but weak CTR.

---

## 3. Indexation and crawl coverage

### 3.1 Sitemap

- **432 URLs** in the sitemap:
  - 397 products
  - 14 guides
  - 8 static pages
  - 8 categories
  - 5 brands
- Search Console reports **0 errors and 0 warnings**.
- Sitemap submitted **3 November 2026**; last downloaded **12 November 2026**.
- `robots.txt` allows crawling of public product, category, shop, and brand paths.

### 3.2 Pages with impressions

Only **29 page URLs** had any impressions in the 90-day export:

- 19 products
- 5 guides
- 0 categories
- 0 brands

**23 pages had zero clicks / 628 impressions.** This is normal for new/low-authority pages, but the absence of category and brand URLs is a structural problem because those are the pages best aligned with non-brand discovery.

### 3.3 URL Inspection sample

Indexed:

- `/`
- `/wholesale`
- `/hikma-exports`
- `/guides`
- `/attar-perfume-shop-south-india`
- `/guides/bakhoor-guide`
- `/guides/roll-on-attar-guide`
- `/guides/oud-perfume-guide`
- `/product/dpg`
- `/product/dubai-oudh`
- `/product/musk-tahara-liquid`
- `/product/golden-dust`

Pending / discovered:

- `/shop`
- `/categories`
- `/about`
- `/contact`
- `/brands`
- `/brand/arees`
- `/brand/dahab`
- `/categories/roll-on-attars`

Unknown / pending:

- `/categories/bakhoor`
- `/brand/arees-luxury`
- `/brand/bakhoor`
- `/guides/wholesale-attar-sourcing-guide-2027`

The API does not expose aggregate “Pages” coverage. Use the GSC UI for the full report; URL Inspection only provides a sample.

---

## 4. Technical findings

### 4.1 Category/brand APIs omit `slug` (P0 — fixed locally)

The category and brand product endpoints return products without `slug`. The frontend then falls back to UUID product URLs, which redirect to canonical slug URLs.

Evidence:

- `/api/brands/arees/products`: 43 products, **0/43 with slug**
- `/api/categories/1/products`: 82 products, **0/82 with slug**
- `/api/products`: 397 products, all with slug
- `/product/95a844d0-7dd8-406e-b83c-37cb5654348e` → **301** → `/product/sumaiya`
- Raw `/brand/arees` contains 24 UUID product links
- Raw `/categories/roll-on-attars` contains 24 UUID product links
- Raw `/categories/bakhoor` contains 6 UUID product links
- Raw `/brand/arees-luxury` contains 4 UUID product links

Root cause:

- `server/src/controllers/brands.controller.js:95-100`
- `server/src/controllers/categories.controller.js:88-92`
- Frontend fallback: `storefront/src/utils/seo.js:49-52`

Fix applied:

- Added `slug` to both product selects.
- Added a regression test for canonical product paths.

### 4.2 Homepage metadata and schema

Findings:

- Homepage static meta description contained mojibake: `â€”` instead of `—`.
- Organization schema contained a broken LinkedIn URL:
  `https://www.linkedin.com/in/hallmark-undefined-73471044a/`
- Organization/LocalBusiness schema described Arees as a brand of Hikma Exports and included Hikma/Dahab in `alternateName` and `parentOrganization`.

Fix applied:

- Corrected the em dash in homepage meta, Open Graph, Twitter, and comments.
- Removed the broken LinkedIn URL from Organization/LocalBusiness `sameAs` and from shared social data.
- Aligned retail Organization/WebSite/LocalBusiness schema to **Arees Perfumes + Hallmark of Excellence**.
- Removed Hikma/Dahab from retail schema fields.
- Kept Hikma Exports schema and copy on wholesale/B2B pages.

### 4.3 Retail static-page metadata

Findings:

- `/about` title/description still referenced Hikma Perfumes and Arees & Dahab.
- `/contact` title/description still referenced Hikma Perfumes.
- Homepage prerender and FAQ copy referenced Hikma Exports and Dahab in retail-facing content.

Fix applied:

- Updated `/about` to “About Arees Perfumes | Chennai Fragrance House”.
- Updated `/contact` to “Contact Arees Perfumes | Chennai”.
- Updated retail descriptions to use Arees Perfumes + Hallmark of Excellence.
- Updated homepage prerender/FAQ wholesale copy to refer to the Chennai wholesale/export desk rather than Hikma Exports.
- Updated About and Contact page-level descriptions and the About CTA.

### 4.4 Local entity inconsistency

- Site phone: `+91 98407 50467`
- Google Business Profile phone: `+91 98400 78909`
- This mismatch can weaken local entity confidence and call tracking. Correct GBP manually; do not change the site to the old number without confirming which number is operational.

---

## 5. GA4 behaviour

### 5.1 Channel performance (28 days)

| Channel | Sessions | Leads | Purchases | Revenue |
|---|---:|---:|---:|---:|
| Organic Search | 121 | 8 | 8 | ₹1,550 |
| Direct | 358 | 8 | — | ₹2,990 |
| AI Assistant | 59 | — | 10 | ₹21,120 |
| Referral | 34 | — | — | ₹11,500 |

Notes:

- AI Assistant traffic is attributed to `chatgpt.com / ai-assistant`.
- AI Assistant landing pages:
  - `/wholesale`: 38 sessions, 8 leads, ₹1,720
  - Homepage: 11 sessions, ₹1,400
- Organic Search by device:
  - Mobile: 68 sessions, 1 purchase
  - Desktop: 53 sessions, 8 leads

**Caveat:** purchase/revenue attribution is inconsistent between channels and sessions. Validate GA4 ecommerce events and attribution windows before making budget decisions from these numbers.

---

## 6. P0 changes implemented

| Area | Change | Files |
|---|---|---|
| Crawl efficiency | Added `slug` to brand/category product selects | `server/src/controllers/brands.controller.js`, `server/src/controllers/categories.controller.js` |
| Canonical URLs | Regression test for slug-based product paths | `storefront/src/utils/seo.test.js` |
| Homepage metadata | Fixed mojibake in meta/OG/Twitter and comments | `storefront/index.html` |
| Homepage schema | Removed broken LinkedIn URL; retail schema uses Arees + Hallmark | `storefront/index.html`, `storefront/src/utils/seo.js` |
| Social data | Removed broken LinkedIn entry; Hikma schema uses Instagram only | `storefront/src/data/content.js` |
| Retail copy | Removed Hikma/Dahab from retail homepage/About/FAQ copy | `storefront/src/data/content.js`, `storefront/api/meta.js`, `storefront/index.html`, `storefront/src/components/home/HomeFaqs.jsx` |
| Static pages | Updated `/about` and `/contact` titles/descriptions | `storefront/src/utils/seo.js`, `storefront/src/pages/About.jsx`, `storefront/src/pages/Contact.jsx` |
| Internal linking | About CTA and category wholesale link now avoid Hikma retail branding | `storefront/src/pages/About.jsx`, `storefront/src/pages/CategoryProducts.jsx` |

### Verification

- Storefront: **632 tests passed**.
- Storefront production build: **passed**.
- Server: **190 tests passed**; `src/app.cors.test.js` did not run because local `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` are missing. This is an environment issue, not a regression.
- Build output checked: no broken LinkedIn URL, no mojibake, retail schema uses Hallmark of Excellence.

---

## 7. Recommended next actions

### P0 — deploy and validate

1. Deploy the API slug change and the metadata/schema changes.
2. Verify live responses:
   - `/api/brands/arees/products` includes `slug`.
   - `/api/categories/1/products` includes `slug`.
   - Raw `/brand/arees` and `/categories/roll-on-attars` contain slug product links, not UUID links.
3. Validate homepage, About, Contact, and category/brand structured data.
4. Request indexing for the key category and brand URLs once the deployment is live.

### P1 — improve non-brand capture

1. **Bakhoor cluster:** make `/categories/bakhoor` the commercial landing page and link it prominently from `/guides/bakhoor-guide`. Target `bakhoor perfume`, `bakhoor attar`, and `bakhoor fragrance` in the title, H1, intro, and FAQ.
2. **Musk/oud cluster:** strengthen category/guide internal links for `musk tahara` and `oud fragrance`; add comparison/selection content rather than thin product-only pages.
3. **Chennai wholesale:** improve `/wholesale` title/snippet for `attar wholesale in chennai`; add proof points, MOQ, delivery, and enquiry CTA above the fold.
4. **Category/brand indexation:** add unique introductory copy, FAQs, and links to top products on category and brand pages. Submit them in GSC and monitor impressions.
5. **CTR tests:** rewrite titles/metas for pages with high impressions and low CTR, starting with the bakhoor guide, South India page, and wholesale page.
6. **Local SEO:** correct the GBP phone number and keep name, address, and phone consistent across the site and GBP.

### P2 — measurement and entity cleanup

1. Measure Core Web Vitals after the PageSpeed API quota resets; currently unavailable due HTTP 429.
2. Validate GA4 purchase/revenue attribution for AI Assistant, Organic, and Direct.
3. Create a real LinkedIn company page or remove LinkedIn from all public schema/social surfaces. Do not use the broken personal URL.
4. Move to a domain email address when available; keep the current Gmail only as a transitional contact.
5. Recover the restricted Reddit account before reposting.

---

## 8. Measurement plan

Track weekly for 14–28 days after deployment:

- Non-brand impressions and clicks for bakhoor, musk tahara, oud, and Chennai wholesale queries.
- Category and brand page impressions in GSC.
- CTR on the bakhoor guide, `/wholesale`, and `/attar-perfume-shop-south-india`.
- Indexed URL count from the GSC Pages report (UI).
- Organic sessions, leads, and purchases in GA4, with attribution caveats noted.

Do not judge success by brand clicks alone. The leading indicator is **non-brand impressions converting into category/guide clicks**, followed by enquiry events.

---

## 9. Limitations

- Search Console 90-day totals are effectively four weeks of visible data.
- Query rows are anonymized/limited; brand vs non-brand totals are based on returned rows, not the full query universe.
- Aggregate index coverage is not available through the API; the URL Inspection results are a sample.
- Core Web Vitals were not measured because the PageSpeed API returned HTTP 429 (quota exceeded).
- GA4 purchase and revenue attribution appears inconsistent and needs validation.
- All P0 changes are local; production behaviour is unchanged until deployment.
