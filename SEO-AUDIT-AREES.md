# Arees Perfumes SEO audit and next steps

**Audit date:** 2026-10-22
**Site checked:** `https://www.areesperfumes.in/` and selected public URLs
**Evidence:** live browser rendering, fetched homepage/robots/sitemap/product/wholesale/about pages, and repository source. This is a focused audit, not a full crawl or Search Console/analytics review.

## What is already working

- The live site serves a public `robots.txt` that allows general crawling, disallows transaction/private paths, and references the sitemap.
- `https://www.areesperfumes.in/sitemap.xml` responds with an XML sitemap containing key landing pages and dynamic product/category/brand paths. The source includes an API fallback catalog.
- Browser-rendered pages use the apex canonical `https://areesperfumes.in/...`, and the homepage renders Organization, WebSite, and LocalBusiness JSON-LD.
- The product page sample renders Product and BreadcrumbList JSON-LD, a visible price/stock, product links, and Chennai contact identity. It includes direct brand/category links and related products.
- Retail, wholesale, brand, category, about, and location-oriented pages exist; the wholesale page has substantial relevant copy and a direct enquiry path.
- The site displays a physical contact address, telephone, email, WhatsApp and social links. This gives useful business trust context, subject to keeping facts accurate.

## Highest-priority findings

### 1. Product and route metadata are client-rendered (High; verify crawler outcomes)

`storefront/index.html` serves a root app shell; page-specific title, description, canonical, robots and JSON-LD are set by React after load in `storefront/src/components/seo/SEO.jsx`. A raw HTTP probe of a representative product URL returned the generic homepage title and no product JSON-LD/product text; the rendered browser view has the correct product content and schema. Google can render JavaScript, but server/prerendered metadata is more dependable for crawlers and share previews, and not all AI/search bots execute JavaScript.

**Next:** run Google Search Console URL Inspection on homepage, one product, one category and wholesale URL, reviewing both fetched and rendered HTML. Compare with Rich Results Test. If Google misses or delays dynamic data, evaluate Vite-compatible prerender/SSR for indexable routes. Preserve the existing React SEO helpers and ensure canonical/title/description/schema match between initial HTML and rendered HTML. Test status codes for invalid product IDs; Vercel currently rewrites unmatched paths to the SPA, which can produce soft-404 behavior.

### 2. Product offers need exact variant/price agreement (High; data validation)

The product sample visibly supports variants and tiered bulk pricing. `buildProductSchema` in `storefront/src/utils/seo.js` currently sets the offer from `product.price` and stock, while the user can select variants and quantity-dependent bulk prices. The schema must correspond to the actual item/variant and purchase price visible for that landing URL; it should not advertise a made-up zero or inappropriate bulk-only rate.

**Next:** select representative products with variants and discounts, compare displayed active price, selected variant, stock, API data, and JSON-LD. Decide whether to provide distinct crawlable URLs for variant-specific prices or mark only a valid base offer. Add tests covering sale/bulk/variant/out-of-stock cases. Never add rating/review schema unless the rating and count are genuine, visible, and accurately represented.

### 3. Sitemap and canonical URL coverage (Medium; inspect live sitemap fully)

The sitemap is dynamic and the source provides a fallback, which is good. Confirm all listed URLs resolve to 200, canonicalize to themselves on the apex, are indexable, and contain current active records. Also compare sitemap inclusion with actual route aliases and ensure no stale/duplicate alias or dead product URLs are listed. Accurate `lastmod` should reflect meaningful content/schema/link changes, not merely old product creation dates.

**Next:** submit `https://areesperfumes.in/sitemap.xml` in Search Console; check the Sitemaps report and URL Inspection for representative static and dynamic URLs. Keep a stable URL list export for periodic comparison.

### 4. Local profile and brand entity facts (Medium; account access required)

The website and LocalBusiness schema show a Chennai address, phone, hours and Instagram identity. I did not verify Google Business Profile ownership, categories, photos, hours, duplicates, reviews, or map-pack performance.

**Next:** owner verifies the public customer-facing address/hours and confirms whether customers visit the listed site. Align the Google Business Profile and website on exact name/address/phone/hours, use the correct primary category, add representative photos/products, and request only honest reviews without incentives or rating instructions. Do not create pages implying branches that do not exist.

### 5. Content opportunity: useful, original buying information (Medium)

The current site already has useful commercial landing copy, especially wholesale. Build on first-hand product knowledge rather than generic AI-generated articles. Good candidates, pending customer research, include attar vs. perfume oil, selecting a scent family, proper storage/application, verified Arees vs. Dahab collection differences, and a transparent wholesale ordering guide.

**Next:** review Search Console query data and customer enquiries, choose a small set of unanswered high-intent questions, add useful evidence/photos from the team, link each article to the exact products/categories it supports, and review after 8–12 weeks. Do not mass-create thin location or product pages.

## 30/60/90-day plan

### Days 1–30: verify technical visibility

- Verify the apex site property in Google Search Console and Bing Webmaster Tools; inspect sitemap processing and index coverage.
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
