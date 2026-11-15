import { FORMSPREE_ENDPOINT, FORMSPREE_ERROR_MESSAGE } from './contactForm'
import { getEmailError } from './email'
import { buildWholesaleWhatsAppUrl as buildWholesaleChatUrl } from './whatsapp'

export const BUYER_TYPES = [
  'Retailer',
  'Perfumer',
  'Distributor',
  'Export buyer',
  'Private label / brand',
  'Event / function order',
]

export const EMPTY_WHOLESALE_FORM = {
  name: '',
  company: '',
  email: '',
  phone: '',
  buyerType: '',
  gstin: '',
  products: '',
  destination: '',
  message: '',
  _gotcha: '',
}

export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

const PHONE_PATTERN = /^[0-9]{7,15}$/
const clean = (value) => String(value ?? '').trim()

export function normalizeWholesalePhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

export function buildWholesalePayload(input) {
  const {
    name,
    company,
    email,
    phone,
    buyerType,
    gstin,
    products,
    destination,
    message,
    _gotcha,
  } = input || {}

  const payload = {
    formType: 'wholesale',
    name: clean(name),
    company: clean(company),
    email: clean(email),
    phone: normalizeWholesalePhone(phone),
    buyerType: clean(buyerType),
    gstin: clean(gstin).toUpperCase(),
    products: clean(products),
    destination: clean(destination),
    message: clean(message),
  }

  const companyName = payload.company
  if (companyName) payload._subject = `Wholesale enquiry - ${companyName}`
  if (clean(_gotcha)) payload._gotcha = clean(_gotcha)

  return payload
}

export function validateWholesaleForm(values) {
  const errors = {}
  const input = values || {}

  if (!clean(input.name)) errors.name = 'Please enter your name.'

  const emailError = getEmailError(input.email, 'Please enter your email address.')
  if (emailError) errors.email = emailError

  const phone = normalizeWholesalePhone(input.phone)
  if (!phone) errors.phone = 'Please enter your phone number.'
  else if (!PHONE_PATTERN.test(phone)) errors.phone = 'Enter a valid phone number (7-15 digits).'

  if (!clean(input.products)) errors.products = 'Tell us what you are looking for.'

  if (!clean(input.destination)) {
    errors.destination = 'Please add your city or destination country.'
  }

  const gstin = clean(input.gstin).toUpperCase()
  if (gstin && !GSTIN_PATTERN.test(gstin)) {
    errors.gstin = 'Enter a valid 15-character GSTIN or leave it blank.'
  }

  return errors
}

export function isWholesaleFormValid(values) {
  return Object.keys(validateWholesaleForm(values)).length === 0
}

export function buildWholesaleMessage(values) {
  const payload = buildWholesalePayload(values)
  return [
    'Hello Hikma Exports, I would like a wholesale quotation.',
    payload.company && `Company: ${payload.company}`,
    payload.name && `Name: ${payload.name}`,
    payload.buyerType && `Buyer type: ${payload.buyerType}`,
    payload.products && `Products: ${payload.products}`,
    payload.destination && `Destination: ${payload.destination}`,
    payload.gstin && `GSTIN: ${payload.gstin}`,
    payload.phone && `Phone: ${payload.phone}`,
    payload.message && `Notes: ${payload.message}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildWholesaleWhatsAppUrl(values) {
  return buildWholesaleChatUrl(buildWholesaleMessage(values))
}

export async function submitWholesaleEnquiry(
  values,
  fetchImpl = typeof globalThis !== 'undefined' ? globalThis.fetch : undefined
) {
  const errors = validateWholesaleForm(values)
  const firstError = Object.values(errors)[0]
  if (firstError) throw new Error(firstError)

  if (typeof fetchImpl !== 'function') {
    throw new Error(FORMSPREE_ERROR_MESSAGE)
  }

  let res
  try {
    res = await fetchImpl(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(buildWholesalePayload(values)),
    })
  } catch {
    throw new Error(FORMSPREE_ERROR_MESSAGE)
  }

  if (!res || !res.ok) {
    throw new Error(FORMSPREE_ERROR_MESSAGE)
  }

  return { ok: true }
}
