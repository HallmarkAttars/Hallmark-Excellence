import { trackEvent } from './analytics'

export const WHATSAPP_URL =
  'https://wa.me/919840750467?text=Can%20I%20get%20more%20info%20about%20your%20products%3F'

// GA4 generate_lead — opening a WhatsApp chat is the storefront's primary
// wholesale/enquiry CTA (header, footer and product pages all route here).
export function trackWhatsAppLead(source) {
  trackEvent('generate_lead', { channel: 'whatsapp', source })
}
