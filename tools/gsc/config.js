// Shared configuration for the Google Search Console CLI tools.
// Zero-dependency: plain CommonJS, run with any Node >= 18.

const SITE = 'https://www.areesperfumes.in/'
const SITE_ENCODED = encodeURIComponent(SITE)
const SITEMAP = `${SITE}sitemap.xml`

const DEFAULT_DAYS = 28
const DEFAULT_LIMIT = 500

// OAuth scope: webmasters = read analytics + manage sitemaps.
const SCOPE = 'https://www.googleapis.com/auth/webmasters'

const ENDPOINTS = {
  token: 'https://oauth2.googleapis.com/token',
  sites: 'https://www.googleapis.com/webmasters/v3/sites',
  searchAnalytics: (site) =>
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
  sitemaps: (site) =>
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/sitemaps`,
  sitemap: (site, feedpath) =>
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/sitemaps/${encodeURIComponent(feedpath)}`,
  inspect: 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
}

module.exports = { SITE, SITE_ENCODED, SITEMAP, DEFAULT_DAYS, DEFAULT_LIMIT, SCOPE, ENDPOINTS }
