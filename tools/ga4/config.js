// GA4 property configuration for the read-only reporting CLI.
module.exports = {
  PROPERTY_ID: '559874541',
  // Funnel + lead events wired in the storefront (src/utils/analytics.js).
  FUNNEL_EVENTS: ['view_item', 'add_to_cart', 'begin_checkout', 'purchase', 'generate_lead'],
  // GA4 enhanced-measurement events, for the status table's context rows.
  STANDARD_EVENTS: ['page_view', 'session_start', 'first_visit', 'scroll', 'click', 'user_engagement', 'form_start'],
}
