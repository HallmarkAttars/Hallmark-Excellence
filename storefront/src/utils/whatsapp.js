import { trackEvent } from './analytics'

// Single source of truth for the storefront's WhatsApp click-to-chat link:
// the same number + pre-filled text is used by the navbar, footer, footer
// social icon (resolved there when href is '#', see BUSINESS.social) and the
// sticky floating button. Update the message here, once.
//
// The pre-filled message carries the buying intent up front so the wholesale
// desk can answer with price lists and MOQ in the first reply. ASCII-safe
// (hyphen, "I am") so it survives wa.me URL handling on all platforms.
export const WHATSAPP_NUMBER = '919840750467'

export const DEFAULT_WHATSAPP_MESSAGE =
  'Hello Arees Perfumes - I am interested in wholesale/bulk attar supply via Hikma Exports. Please share the price list and MOQ.'

export function buildWhatsAppUrl(message = DEFAULT_WHATSAPP_MESSAGE) {
  const text = String(message ?? '').trim() || DEFAULT_WHATSAPP_MESSAGE
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`
}

export const WHATSAPP_URL = buildWhatsAppUrl()

// GA4 generate_lead — opening a WhatsApp chat is the storefront's primary
// wholesale/enquiry CTA (header, footer and product pages all route here).
export function trackWhatsAppLead(source) {
  trackEvent('generate_lead', { channel: 'whatsapp', source })
}
