import { trackEvent } from './analytics'

// Single source of truth for the storefront's WhatsApp click-to-chat link:
// the same number + pre-filled text is used by the navbar, footer, footer
// social icon (resolved there when href is '#', see BUSINESS.social) and the
// sticky floating button. Update the message here, once.
//
// The pre-filled message carries the buying intent up front so the wholesale
// desk can answer with price lists and MOQ in the first reply. ASCII-safe
// (hyphen, "I am") so it survives wa.me URL handling on all platforms.
export const WHATSAPP_URL =
  'https://wa.me/919840750467?text=Hello%20Arees%20Perfumes%20-%20I%20am%20interested%20in%20wholesale%2Fbulk%20attar%20supply%20via%20Hikma%20Exports.%20Please%20share%20the%20price%20list%20and%20MOQ.'

// GA4 generate_lead — opening a WhatsApp chat is the storefront's primary
// wholesale/enquiry CTA (header, footer and product pages all route here).
export function trackWhatsAppLead(source) {
  trackEvent('generate_lead', { channel: 'whatsapp', source })
}
