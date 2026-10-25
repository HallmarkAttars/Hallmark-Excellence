# Arees Perfumes SEO audit and next steps

**Audit date:** 2026-10-22
**Remediation update:** 2026-10-26
**Site checked:** `https://www.areesperfumes.in/` and selected public URLs
**Evidence:** live browser rendering, fetched homepage/robots/sitemap/product/wholesale/about pages, and repository source. This is a focused audit, not a full crawl or Search Console/analytics review.

## Remediation status (2026-10-26)

- **Done:** dynamic product/category/brand/page routes now get server-rendered `<title>`, description, canonical, robots and JSON-LD from `storefront/api/meta.js`; the React head keeps matching values after hydration.
- **Done:** homepage shell now contains raw Organization, WebSite and LocalBusiness JSON-LD plus canonical/robots, so non-JS crawlers see the core entity markup before React loads.
- **Done:** product schema now uses the selected variant when supplied and an `AggregateOffer` plus `hasVariant` entries for multi-variant products without a selected variant. The Sumaiya sample now reports ₹240–₹7776 across 10 variants instead of a single misleading ₹7776 offer.
- **Done:** sitemap filtering now removes category/brand URLs with no live products when the live product payload exposes category/brand relations. Live sitemap count dropped from 402 to 392; empty categories/brands are excluded.
- **Done:** empty category and brand pages now return `noindex,follow` in server-rendered metadata when the product-count fetch succeeds, and the React pages apply the same noindex state after loading.
- **Done:** wholesale page metadata, Service/FAQ/Breadcrumb schema, buyer guidance, buyer checklist, FAQs, and internal links were expanded. B2B links on roll-on/fragrance-oil categories and product pages now point to `/wholesale`.
- **Done:** `/wholesale` and `/hikma-exports` now include a crawlable, no-JS fallback body (headings, copy, FAQs and contact details) in the server-rendered HTML. React replaces it on mount; the fallback is hidden when JavaScript is available.
- **Done:** canonicals, sitemap, robots and JSON-LD now use the live `https://www.areesperfumes.in` host. The apex 308 redirect remains at the Vercel domain layer, but it now points to the canonical host instead of conflicting with it.
- **Done:** B2B copy now explains that MOQ, lead time, shipping terms, payment terms and documentation are confirmed in writing per quotation. This avoids invented numbers while giving buyers a clear next step; replace it with exact facts when the business supplies them.
- **Still open:** raw HTML body content for product/category pages remains client-rendered. Google can render JavaScript, but a full prerender/SSR path is still needed for bots that do not execute JavaScript.
- **Verification:** `npm test` passing; `npm run build` passing; live API checks confirm sitemap filtering, empty-page noindex, and aggregate product offers.

## What is already working

- The live site serves a public `robots.txt` that allows general crawling, disallows transaction/private paths, and references the sitemap.
- `https://www.areesperfumes.in/sitemap.xml` responds with an XML sitemap containing key landing pages and dynamic product/category/brand paths. The source includes an API fallback catalog.
- Browser-rendered pages use the live `https://www.areesperfumes.in/...` canonical, and the homepage renders Organization, WebSite, and LocalBusiness JSON-LD.
- The product page sample renders Product and BreadcrumbList JSON-LD, a visible price/stock, product links, and Chennai contact identity. It includes direct brand/category links and related products.
- Retail, wholesale, brand, category, about, and location-oriented pages exist; the wholesale page has substantial relevant copy and a direct enquiry path.
- The site displays a physical contact address, telephone, email, WhatsApp and social links. This gives useful business trust context, subject to keeping facts accurate.

## Highest-priority findings

### 1. Head metadata is now server-rendered; body content is still client-rendered (High; verify crawler outcomes)

`storefront/index.html` serves a root app shell. Dynamic routes are rewritten to `storefront/api/meta.js`, which injects page-specific title, description, canonical, robots and JSON-LD into the returned HTML; React then keeps the same values after hydration. `/wholesale` and `/hikma-exports` also get a crawlable fallback body; product/category pages still return the empty app shell body. Google can render JavaScript, but a full prerender/SSR path is more dependable for crawlers and share previews, and not all AI/search bots execute JavaScript.

**Next:** run Google Search Console URL Inspection on homepage, one product, one category and wholesale URL, reviewing both fetched and rendered HTML. Compare with Rich Results Test. If Google misses or delays dynamic data, evaluate Vite-compatible prerender/SSR for indexable routes. Preserve the existing React SEO helpers and ensure canonical/title/description/schema match between initial HTML and rendered HTML. Test status codes for invalid product IDs; Vercel currently rewrites unmatched paths to the SPA, which can produce soft-404 behavior.

### 2. Product offers now use variant/aggregate schema; validate live data (High; data validation)

The product sample visibly supports variants and tiered bulk pricing. `buildProductSchema` in `storefront/src/utils/seo.js` now uses the selected variant when supplied, an `AggregateOffer` plus `hasVariant` entries for multi-variant products without a selected variant, and a single `Offer` otherwise. The schema must still correspond to the actual item/variant and purchase price visible for that landing URL; it should not advertise a made-up zero or inappropriate bulk-only rate.

**Next:** select representative products with variants and discounts, compare displayed active price, selected variant, stock, API data, and JSON-LD. Decide whether to provide distinct crawlable URLs for variant-specific prices or mark only a valid base offer. Add tests covering sale/bulk/variant/out-of-stock cases. Never add rating/review schema unless the rating and count are genuine, visible, and accurately represented.

### 3. Sitemap filtering and canonical host are aligned (Medium; inspect live sitemap fully)

The sitemap is dynamic and filters category/brand URLs with no live products when the live product payload exposes those relations. Canonicals, sitemap, robots and JSON-LD now use the live `https://www.areesperfumes.in` host, matching the apex 308 redirect. It still needs a full live validation: confirm all listed URLs resolve to 200, canonicalize to themselves, are indexable, and contain current active records. Also compare sitemap inclusion with actual route aliases and ensure no stale/duplicate alias or dead product URLs are listed. Accurate `lastmod` should reflect meaningful content/schema/link changes, not merely old product creation dates.

**Next:** submit `https://www.areesperfumes.in/sitemap.xml` in Search Console; check the Sitemaps report and URL Inspection for representative static and dynamic URLs. Keep a stable URL list export for periodic comparison.

### 4. Local profile and brand entity facts (Medium; account access required)

The website and LocalBusiness schema show a Chennai address, phone, hours and Instagram identity. I did not verify Google Business Profile ownership, categories, photos, hours, duplicates, reviews, or map-pack performance.

**Next:** owner verifies the public customer-facing address/hours and confirms whether customers visit the listed site. Align the Google Business Profile and website on exact name/address/phone/hours, use the correct primary category, add representative photos/products, and request only honest reviews without incentives or rating instructions. Do not create pages implying branches that do not exist.

### 5. Content opportunity: useful, original buying information (Medium)

The current site already has useful commercial landing copy, and the wholesale page now includes buyer guidance, an enquiry checklist, wholesale/export FAQs, Service/FAQ schema, and links from priority category/product pages. Build on first-hand product knowledge rather than generic AI-generated articles. Good candidates, pending customer research, include attar vs. perfume oil, selecting a scent family, proper storage/application, verified Arees vs. Dahab collection differences, and a transparent wholesale ordering guide.

**Next:** review Search Console query data and customer enquiries, choose a small set of unanswered high-intent questions, add useful evidence/photos from the team, link each article to the exact products/categories it supports, and review after 8–12 weeks. Do not mass-create thin location or product pages. Replace the current wholesale copy's cautious generalities with verified MOQ, lead-time, shipping, payment and private-label facts once supplied.

## 30/60/90-day plan

### Days 1–30: verify technical visibility

- Verify the `https://www.areesperfumes.in` site property in Google Search Console and Bing Webmaster Tools; inspect sitemap processing and index coverage.
- Inspect raw and rendered HTML for homepage, product, category, brand and wholesale URLs.
- Test representative product and local/business schema with Rich Results Test; correct only factually supported mismatches.
- Compare live sitemap entries against HTTP status, canonicals, robots meta, and API activity; remove stale/inactive URLs.
- Check PageSpeed Insights/CrUX for mobile and desktop field data; if no field data is available, label Lighthouse/PageSpeed lab numbers as lab-only.

### Days 31–60: improve commerce pages

- Validate product variant price/availability against offer schema and Merchant Center feed (if used).
- Improve unique, factual product descriptions and image alt text for priority products; avoid generic repeated text.
- Improve category/brand introductions where they help customers choose; add relevant crawlable internal links.
- Complete Google Business Profile facts and conversion paths after owner verification.

### Days 61–90: expand evidence-led content and measure

- Publish or refresh a small set of evidence-backed customer guides based on actual query/enquiry data.
- Build useful links from the guides to matching products, categories, retail/wholesale routes.
- Review Search Console queries/pages, organic conversions, Merchant Center issues, and local profile performance; compare against the initial baseline.
- Check AI assistant visibility only as a separate, repeatable observation. Do not treat `llms.txt`, crawler permissions, or one-off AI citations as guaranteed ranking levers.

## Data needed to prioritize accurately

1. Google Search Console property access or exports: queries/pages, clicks, impressions, CTR, average position, indexing and enhancement reports.
2. GA4 access/report: organic landing pages and purchases/enquiries. The `G-VX0WPP40T6` tag was added locally in `storefront/index.html`; confirm the deployed tag and data stream are receiving data, and configure consent/privacy appropriately.
3. Merchant Center status/feed (if used), diagnostics, product IDs, shipping/returns settings.
4. Google Business Profile access/status and verified customer-facing location details.
5. Current top-selling products and accurate notes, stock, variant/retail/bulk pricing rules, plus common customer questions.

## References

- [Google: AI features optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) — Google says foundational SEO and useful content remain the basis; it does not require `llms.txt` or special AI markup.
- [Google: JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google: Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product)
- [Google: Merchant listings](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing)
- [Google: Local Business structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Google: Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- Skills used as inspiration: MIT-licensed [claude-seo](https://github.com/AgriciDaniel/claude-seo), [geo-seo-claude](https://github.com/zubair-trabzada/geo-seo-claude), [marketingskills](https://github.com/coreyhaines31/marketingskills), and [claude-blog](https://github.com/AgriciDaniel/claude-blog). The added skills are tailored guidance, not copied installers or full vendored plugin code.
