import { SHOP, WHOLESALE_CONTACT } from '../data/content'
import { trackEvent } from './analytics'

// Two WhatsApp destinations, kept separate so retail shoppers reach the shop
// and trade buyers reach the Hikma Exports wholesale desk.
export const WHATSAPP_NUMBER = SHOP.phoneTel.replace(/\D/g, '')
export const WHOLESALE_WHATSAPP_NUMBER = WHOLESALE_CONTACT.phoneTel.replace(/\D/g, '')

export const DEFAULT_WHATSAPP_MESSAGE =
  'Hello Arees Perfumes - I would like to ask about attars, oud and perfume oils. Please help me with availability and delivery.'

export const DEFAULT_WHOLESALE_WHATSAPP_MESSAGE =
  'Hello Hikma Exports - I am interested in wholesale/bulk attar supply. Please share the price list and MOQ.'

export function buildWhatsAppUrl(
  message = DEFAULT_WHATSAPP_MESSAGE,
  number = WHATSAPP_NUMBER
) {
  const text = String(message ?? '').trim() || DEFAULT_WHATSAPP_MESSAGE
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

export function buildWholesaleWhatsAppUrl(
  message = DEFAULT_WHOLESALE_WHATSAPP_MESSAGE
) {
  return buildWhatsAppUrl(message, WHOLESALE_WHATSAPP_NUMBER)
}

export const WHATSAPP_URL = buildWhatsAppUrl()
export const WHOLESALE_WHATSAPP_URL = buildWholesaleWhatsAppUrl()

// GA4 generate_lead — opening a WhatsApp chat is a primary enquiry CTA
// (header, footer, product pages, and the wholesale desk).
export function trackWhatsAppLead(source) {
  trackEvent('generate_lead', { channel: 'whatsapp', source })
}
