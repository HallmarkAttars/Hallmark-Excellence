# GA4 CLI (read-only)

Zero-dependency Google Analytics 4 reporting for property `559874541`
(areesperfumes.in). Reports run locally from a service-account key — the same
access model as `tools/gsc`.

## Setup (once, already done)

- GA4 property: `559874541`  (measurement id `G-VX0WPP40T6`)
- Service account `hikma-exports@hikma-exports.iam.gserviceaccount.com` has
  **Viewer** access via GA4 Admin > Property access management.
- Key search order (first existing + working wins, auto-fallback on 403):
  1. `GA4_KEY_PATH` env var
  2. `tools/ga4/key.json` (gitignored)
  3. `C:/Users/acer/Desktop/ga4-key.json`
  4. `C:/Users/acer/Desktop/gsc-key.json` ← the one with working access

Keys are NEVER printed or committed (`.gitignore` covers `tools/ga4/key.json`).

## Commands

```bash
node tools/ga4/status.js
# 7-day snapshot + storefront funnel events (view_item, add_to_cart,
# begin_checkout, purchase, generate_lead) vs standard events.

node tools/ga4/report.js --funnel
# Funnel event counts for the last 28 days.

node tools/ga4/report.js --events --days 7
# All GA4 events (custom + enhanced measurement).

node tools/ga4/report.js --days 28 --dimension pagePath --metric screenPageViews,totalUsers --limit 15
# Ad-hoc table: any dimension (pagePath, sessionDefaultChannelGroup,
# sessionSourceMedium, deviceCategory, date...) and any Data API metric.
```

## OAuth scope

`https://www.googleapis.com/auth/analytics.readonly` — strictly read-only.
Key events (purchase / generate_lead) are marked in the GA4 UI, NOT from here
(that would require the Admin API + Editor access, deliberately not enabled).

## Notes

- GA4 standard reporting lags a few hours; the trace-level "did my event
  work?" check belongs in GA4 Realtime or DebugView.
- No private data is written anywhere; reports print to stdout only.
