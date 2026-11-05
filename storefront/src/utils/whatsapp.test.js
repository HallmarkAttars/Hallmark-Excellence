// Guards the single-source WhatsApp contact link: number correctness, the
// pre-filled buying-intent text (wholesale price list + MOQ), and ASCII-safe
// encoding that survives wa.me deep-link handling on all platforms.
import { describe, it, expect } from 'vitest'
import { WHATSAPP_URL } from './whatsapp'

describe('WHATSAPP_URL', () => {
  it('targets the shop WhatsApp number with an encoded message', () => {
    expect(WHATSAPP_URL).toContain('wa.me/919840750467?text=')
    const text = decodeURIComponent(new URL(WHATSAPP_URL).searchParams.get('text'))
    expect(text).toBeTruthy()
    expect(text.length).toBeGreaterThan(10)
  })

  it('pre-qualifies the lead with the wholesale intent', () => {
    const text = decodeURIComponent(new URL(WHATSAPP_URL).searchParams.get('text'))
    expect(text).toContain('wholesale')
    expect(text).toContain('Hikma Exports')
    expect(text).toContain('price list')
    expect(text).toContain('MOQ')
  })

  it('is ASCII-safe so no client mangles the pre-filled text', () => {
    const text = decodeURIComponent(new URL(WHATSAPP_URL).searchParams.get('text'))
    expect(/^[\x20-\x7E]+$/.test(text)).toBe(true)
  })
})
