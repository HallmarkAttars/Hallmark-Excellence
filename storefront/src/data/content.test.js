import { describe, expect, it } from 'vitest'
import { ABOUT, HIKMA_EXPORTS, INVOICE, WHOLESALE_CONTACT } from './content'

describe('entity hierarchy content', () => {
  it('positions Hikma Exports as the parent company', () => {
    expect(ABOUT.title).toBe('Arees Perfumes by Hikma Exports')
    expect(ABOUT.title).not.toContain('Hallmark')
    expect(ABOUT.story.paragraphs.join(' ')).toContain(
      'Hikma Exports is the parent company'
    )
    expect(ABOUT.story.paragraphs.join(' ')).toContain(
      'Hallmark of Excellence is the trade name shown on our logo'
    )
  })

  it('publishes the canonical Hikma Exports hours and map profile', () => {
    expect(WHOLESALE_CONTACT.hours).toContain('Monday - Saturday')
    expect(WHOLESALE_CONTACT.closed).toBe('Sunday: Closed')
    expect(WHOLESALE_CONTACT.hoursSpecification[0]).toMatchObject({
      opens: '09:00',
      closes: '21:30',
    })
    expect(HIKMA_EXPORTS.sameAs).toContain(WHOLESALE_CONTACT.googleMapsUrl)
  })

  it('clarifies the Hallmark trade name without presenting it as a parent', () => {
    expect(JSON.stringify(ABOUT.faqs)).toContain(
      'Hikma Exports is the parent company'
    )
    expect(JSON.stringify(HIKMA_EXPORTS.faqs)).toContain(
      'It is not a separate parent company'
    )
  })

  it('prints Hikma Exports as the invoice company name', () => {
    expect(INVOICE.companyName).toBe('Hikma Exports')
  })
})
