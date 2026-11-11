// Order-status WhatsApp notifier — offline tests (no Graph calls).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  sendOrderStatusWhatsApp,
  buildStatusText,
  __test__,
} from './whatsappStatusService'

const ORDER = {
  order_number: '5001',
  phone: '9840750467',
  total: 250,
  notes: JSON.stringify({}),
}

const ENV_KEYS = [
  'WHATSAPP_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_GRAPH_VERSION',
  'WHATSAPP_STATUS_TEMPLATE_NAME',
  'WHATSAPP_STATUS_TEMPLATE_LANG',
  'STOREFRONT_URL',
  'FRONTEND_URL',
]

let saved

beforeEach(() => {
  saved = {}
  for (const k of ENV_KEYS) saved[k] = process.env[k]
})

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
  vi.unstubAllGlobals()
})

describe('buildStatusText', () => {
  it('includes the order number, status and tracking link', () => {
    const text = buildStatusText({
      orderNumber: '5001',
      status: 'Shipped',
      total: 250,
      trackUrl: 'https://www.areesperfumes.in/track-order',
    })
    expect(text).toContain('5001')
    expect(text).toContain('Shipped')
    expect(text).toContain('₹250')
    expect(text).toContain('https://www.areesperfumes.in/track-order')
  })
})

describe('normalizePhone', () => {
  it('prefixes 91 for 10-digit Indian numbers', () => {
    expect(__test__.normalizePhone('9840750467')).toBe('919840750467')
    expect(__test__.normalizePhone('+91 98407 50467')).toBe('919840750467')
    expect(__test__.normalizePhone('')).toBe('')
  })
})

describe('sendOrderStatusWhatsApp', () => {
  it('skips when the Graph credentials are not configured', async () => {
    delete process.env.WHATSAPP_TOKEN
    delete process.env.WHATSAPP_PHONE_NUMBER_ID
    const r = await sendOrderStatusWhatsApp({ order: ORDER, oldStatus: 'Pending', newStatus: 'Shipped' })
    expect(r).toMatchObject({ ok: false, skipped: true, reason: 'not configured' })
  })

  it('skips when the status did not change', async () => {
    process.env.WHATSAPP_TOKEN = 't'
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123'
    const r = await sendOrderStatusWhatsApp({ order: ORDER, oldStatus: 'Shipped', newStatus: 'shipped' })
    expect(r).toMatchObject({ ok: false, skipped: true, reason: 'unchanged' })
  })

  it('skips when the order has no usable phone', async () => {
    process.env.WHATSAPP_TOKEN = 't'
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123'
    const r = await sendOrderStatusWhatsApp({
      order: { ...ORDER, phone: '' },
      oldStatus: 'Pending',
      newStatus: 'Shipped',
    })
    expect(r).toMatchObject({ ok: false, skipped: true, reason: 'no phone' })
  })

  it('sends a free-form text message to the normalized number', async () => {
    process.env.WHATSAPP_TOKEN = 't'
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123'
    process.env.STOREFRONT_URL = 'https://www.areesperfumes.in'
    delete process.env.WHATSAPP_STATUS_TEMPLATE_NAME

    const calls = []
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      calls.push({ url, opts })
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 })
    }))

    const r = await sendOrderStatusWhatsApp({ order: ORDER, oldStatus: 'Pending', newStatus: 'Shipped' })

    expect(r.ok).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://graph.facebook.com/v23.0/123/messages')
    const body = JSON.parse(calls[0].opts.body)
    expect(body.to).toBe('919840750467')
    expect(body.type).toBe('text')
    expect(body.text.body).toContain('5001')
    expect(body.text.body).toContain('Shipped')
    expect(calls[0].opts.headers.Authorization).toBe('Bearer t')
  })

  it('uses the approved template when configured', async () => {
    process.env.WHATSAPP_TOKEN = 't'
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123'
    process.env.WHATSAPP_STATUS_TEMPLATE_NAME = 'order_update'
    process.env.WHATSAPP_STATUS_TEMPLATE_LANG = 'en'

    const calls = []
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      calls.push({ url, opts })
      return new Response('{}', { status: 200 })
    }))

    const r = await sendOrderStatusWhatsApp({ order: ORDER, oldStatus: 'Pending', newStatus: 'Delivered' })

    expect(r.ok).toBe(true)
    const body = JSON.parse(calls[0].opts.body)
    expect(body.type).toBe('template')
    expect(body.template.name).toBe('order_update')
    expect(body.template.components[0].parameters.map((p) => p.text)).toEqual([
      '5001',
      'Delivered',
      'https://www.areesperfumes.in/track-order',
    ])
  })

  it('returns ok:false on a Graph rejection instead of throwing', async () => {
    process.env.WHATSAPP_TOKEN = 't'
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123'
    delete process.env.WHATSAPP_STATUS_TEMPLATE_NAME

    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: { message: 'Re-engagement required' } }),
      { status: 400 }
    )))

    const r = await sendOrderStatusWhatsApp({ order: ORDER, oldStatus: 'Pending', newStatus: 'Shipped' })
    expect(r).toMatchObject({ ok: false, status: 400, message: 'Re-engagement required' })
  })
})
