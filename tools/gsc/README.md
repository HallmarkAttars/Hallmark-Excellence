# GSC tools (areesperfumes.in)

Zero-dependency Node CLI for Google Search Console. Run top-level with
`node tools/gsc/<script>.js`, or from this folder with the npm scripts.

| Command | What it does |
|---|---|
| `node status.js` | List properties + sitemap health (submitted/downloaded, errors) |
| `node submit-sitemap.js` | Re-submit `https://www.areesperfumes.in/sitemap.xml` |
| `node report.js` | 28-day Search Analytics → CSV in `reports/` (gitignored) |
| `node report.js --days 90` | Custom range; `--dimension page` / `query,page` etc. |
| `node inspect.js` | URL Inspection for the default long list (`inspect.js` constant) |
| `node inspect.js <url> ...` | Inspect specific URLs |

## One-time setup (already done for `hikma-exports@hikma-exports.iam.gserviceaccount.com`)

1. Google Cloud project `hikma-exports` → enable **Google Search Console API**.
2. Service account `hikma-exports@...` → **Keys → Add key → JSON**.
3. GSC → Settings → **Users and permissions** → Add user (the service-account
   email) → permission **Full** (needed for sitemap submission). Already granted
   for `https://www.areesperfumes.in/` as `siteFullUser`.
4. Put the JSON key at one of the paths `auth.js` searches (first hit wins):
   - `GSC_KEY_PATH` environment variable
   - `tools/gsc/key.json` (gitignored — never commit)
   - `C:/Users/acer/Desktop/gsc-key.json`
   - `C:/Users/acer/gsc-key.json`
   - `C:/Users/acer/Downloads/gsc-key.json`

## Security

- The key file is a credential: **never commit it, never paste it into chat.**
- `.gitignore` excludes `tools/gsc/key.json` and `tools/gsc/reports/`.
- If a key leaks, revoke it in Cloud Console (Keys → delete) and create a new
  one; the service account itself keeps its GSC access.
- What this API can/can't do: it can read analytics, inspect URLs and
  submit/delete sitemaps; it cannot change GSC settings, users, verification,
  or request indexing ("Request indexing" is UI-only).

## Quotas

- Search Analytics: generous, no practical worry.
- URL Inspection: 2,000/day per property — the default `inspect.js` list is ~40.
