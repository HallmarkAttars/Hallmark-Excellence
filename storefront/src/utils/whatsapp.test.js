// Guards the two WhatsApp contact links: retail shoppers use the shop number,
// while wholesale buyers use the Hikma Exports trade desk. Both messages are
// ASCII-safe so no client mangles the pre-filled text.
import { describe, it, expect } from 'vitest'
import { WHATSAPP_URL, WHOLESALE_WHATSAPP_URL } from './whatsapp'

describe('WHATSAPP_URL', () => {
  it('targets the shop WhatsApp number with an encoded message', () => {
    expect(WHATSAPP_URL).toContain('wa.me/919840078909?text=')
    const text = decodeURIComponent(new URL(WHATSAPP_URL).searchParams.get('text'))
    expect(text).toContain('Arees Perfumes')
    expect(text).not.toContain('Hikma Exports')
    expect(text.length).toBeGreaterThan(10)
  })

  it('is ASCII-safe so no client mangles the pre-filled text', () => {
    const text = decodeURIComponent(new URL(WHATSAPP_URL).searchParams.get('text'))
    expect(/^[\x20-\x7E]+$/.test(text)).toBe(true)
  })
})

describe('WHOLESALE_WHATSAPP_URL', () => {
  it('targets the Hikma Exports wholesale desk with buying intent', () => {
    expect(WHOLESALE_WHATSAPP_URL).toContain('wa.me/919840750467?text=')
    const text = decodeURIComponent(
      new URL(WHOLESALE_WHATSAPP_URL).searchParams.get('text')
    )
    expect(text).toContain('wholesale')
    expect(text).toContain('Hikma Exports')
    expect(text).toContain('price list')
    expect(text).toContain('MOQ')
  })

  it('is ASCII-safe so no client mangles the pre-filled text', () => {
    const text = decodeURIComponent(
      new URL(WHOLESALE_WHATSAPP_URL).searchParams.get('text')
    )
    expect(/^[\x20-\x7E]+$/.test(text)).toBe(true)
  })
})
