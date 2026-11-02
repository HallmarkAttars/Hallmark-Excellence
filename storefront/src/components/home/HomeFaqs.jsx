import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HOME_FAQS } from '../../data/content'
import { priceFromProducts } from '../../utils/seo'
import './HomeFaqs.css'

// Homepage FAQ + wholesale block (Batch 1 SEO work).
//   * Real answers buyers ask (location, delivery, alcohol-free, MOQ, export)
//   * Wholesale CTA driving B2B traffic to /wholesale and /hikma-exports
//   * An honest "from ₹" price anchor computed from the products the homepage
//     already fetched (never a hardcoded number).
//   * Accordion-style FAQs grouped into Store & Orders and Wholesale & Export
//     so retail and B2B customers can scan quickly. All answers stay factual
//     and unchanged — only presentation is restructured.
// The same facts ship in the server-rendered home body and FAQPage schema.
export default function HomeFaqs({ products }) {
  const priceFrom = useMemo(() => priceFromProducts(products), [products])
  const [openFaq, setOpenFaq] = useState(null)

  const faqGroups = useMemo(
    () => {
      const groups = new Map()
      for (const faq of HOME_FAQS) {
        const key = faq.group || 'general'
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(faq)
      }
      return Array.from(groups.entries())
    },
    [HOME_FAQS]
  )

  const groupLabels = {
    'store-orders': 'Store & Orders',
    'wholesale-export': 'Wholesale & Export',
  }

  const toggleFaq = (question) => {
    setOpenFaq((current) => (current === question ? null : question))
  }

  return (
    <section className="section home-faqs-section" aria-labelledby="home-faqs-title">
      <div className="section-head">
        <p className="section-eyebrow">GOOD TO KNOW</p>
        <h2 id="home-faqs-title" className="section-title">Frequently Asked Questions</h2>
        {priceFrom ? (
          <p className="home-faqs-price-anchor">
            Attars, bakhoor, oud and fragrance oils <strong>from ₹{priceFrom}</strong> — delivered
            across India, wholesale and quotation-based export supply handled by Hikma Exports.
          </p>
        ) : null}
      </div>

      {faqGroups.map(([groupKey, faqs]) => (
        <div key={groupKey} className="home-faq-group">
          <h3 className="home-faq-group-title">{groupLabels[groupKey] || groupKey}</h3>
          <dl className="home-faqs-list">
            {faqs.map((faq) => {
              const isOpen = openFaq === faq.question
              return (
                <div className="home-faq" key={faq.question}>
                  <dt
                    className={`home-faq-q${isOpen ? ' is-open' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    aria-controls={`home-faq-a-${faq.question.replace(/\s+/g, '-')}`}
                    onClick={() => toggleFaq(faq.question)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleFaq(faq.question)
                      }
                    }}
                  >
                    {faq.question}
                    <span className="home-faq-q-arrow" aria-hidden="true">
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </dt>
                  {isOpen ? (
                    <dd
                      className="home-faq-a is-open"
                      id={`home-faq-a-${faq.question.replace(/\s+/g, '-')}`}
                    >
                      {faq.answer}
                    </dd>
                  ) : null}
                </div>
              )
            })}
          </dl>
        </div>
      ))}

      <div className="home-faqs-wholesale">
        <h3>Wholesale &amp; Bulk Supply</h3>
        <p>
          Retailers, perfumers and gift shops: loose attar and fragrance oils from 100 g, branded
          Arees and Dahab packs from 60 pieces — supplied by Hikma Exports, Chennai.
        </p>
        <div className="home-faqs-wholesale-links">
          <Link className="home-faqs-wholesale-btn" to="/wholesale">Wholesale enquiry</Link>
          <Link className="home-faqs-wholesale-btn home-faqs-wholesale-btn--ghost" to="/hikma-exports">
            Hikma Exports
          </Link>
        </div>
      </div>
    </section>
  )
}
