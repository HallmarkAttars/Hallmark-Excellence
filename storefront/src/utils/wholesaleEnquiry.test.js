import { describe, it, expect, vi } from 'vitest'
import {
  buildWholesaleMessage,
  buildWholesalePayload,
  buildWholesaleWhatsAppUrl,
  isWholesaleFormValid,
  normalizeWholesalePhone,
  submitWholesaleEnquiry,
  validateWholesaleForm,
} from './wholesaleEnquiry'
import { FORMSPREE_ENDPOINT, FORMSPREE_ERROR_MESSAGE } from './contactForm'

const valid = {
  name: 'Asha Rao',
  company: 'Rao Retail',
  email: 'asha@example.com',
  phone: '+91 98407 50467',
  buyerType: 'Retailer',
  gstin: '33ABCDE1234F1Z5',
  products: 'Arees 8ml roll-ons, 500 pieces',
  destination: 'Chennai',
  message: 'Please share bulk rates.',
}

describe('wholesale enquiry helpers', () => {
  it('normalizes Indian phone prefixes', () => {
    expect(normalizeWholesalePhone('+91 98407 50467')).toBe('9840750467')
    expect(normalizeWholesalePhone('09840750467')).toBe('9840750467')
    expect(normalizeWholesalePhone('+44 7700 900123')).toBe('447700900123')
  })

  it('builds a whitelisted Formspree payload with a useful subject', () => {
    const payload = buildWholesalePayload({ ...valid, extra: 'must not leak' })
    expect(payload).toMatchObject({
      formType: 'wholesale',
      name: 'Asha Rao',
      company: 'Rao Retail',
      email: 'asha@example.com',
      phone: '9840750467',
      buyerType: 'Retailer',
      gstin: '33ABCDE1234F1Z5',
      products: 'Arees 8ml roll-ons, 500 pieces',
      destination: 'Chennai',
      message: 'Please share bulk rates.',
      _subject: 'Wholesale enquiry - Rao Retail',
    })
    expect(payload).not.toHaveProperty('extra')
    expect(payload).not.toHaveProperty('_gotcha')
  })

  it('validates required fields, email, phone and optional GSTIN', () => {
    expect(isWholesaleFormValid(valid)).toBe(true)

    const errors = validateWholesaleForm({
      ...valid,
      email: 'not-an-email',
      phone: '12',
      gstin: 'bad',
      products: '',
    })
    expect(errors.email).toBeTruthy()
    expect(errors.phone).toBeTruthy()
    expect(errors.gstin).toBeTruthy()
    expect(errors.products).toBeTruthy()
  })

  it('builds a readable WhatsApp message with only useful fields', () => {
    const message = buildWholesaleMessage(valid)
    expect(message).toContain('Hello Hikma Exports')
    expect(message).toContain('Company: Rao Retail')
    expect(message).toContain('Products: Arees 8ml roll-ons, 500 pieces')
    expect(message).toContain('Destination: Chennai')
    expect(message).not.toContain('Email:')
    expect(buildWholesaleWhatsAppUrl(valid)).toContain(`https://wa.me/919840750467?text=`)
  })

  it('posts to Formspree and reports non-OK responses', async () => {
    const fetchOk = vi.fn().mockResolvedValue({ ok: true })
    await expect(submitWholesaleEnquiry(valid, fetchOk)).resolves.toEqual({ ok: true })
    expect(fetchOk).toHaveBeenCalledWith(
      FORMSPREE_ENDPOINT,
      expect.objectContaining({ method: 'POST' })
    )

    const fetchFail = vi.fn().mockResolvedValue({ ok: false })
    await expect(submitWholesaleEnquiry(valid, fetchFail)).rejects.toThrow(
      FORMSPREE_ERROR_MESSAGE
    )

    const fetchThrow = vi.fn().mockRejectedValue(new Error('offline'))
    await expect(submitWholesaleEnquiry(valid, fetchThrow)).rejects.toThrow(
      FORMSPREE_ERROR_MESSAGE
    )
  })

  it('rejects invalid input before calling fetch', async () => {
    const fetchImpl = vi.fn()
    await expect(
      submitWholesaleEnquiry({ ...valid, name: '' }, fetchImpl)
    ).rejects.toThrow('Please enter your name.')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
