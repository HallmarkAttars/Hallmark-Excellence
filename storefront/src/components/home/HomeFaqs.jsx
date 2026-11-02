import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HOME_FAQS } from '../../data/content'
import { priceFromProducts } from '../../utils/seo'
import './HomeFaqs.css'

// Homepage FAQ + wholesale block (Batch 1 SEO work).
//   * Real answers buyers ask (location, delivery, alcohol-free, MOQ, export)
//   * Wholesale CTA driving B2B traffic to /wholesale and /hikma-exports
//   * An honest "from ₹" price anchor computed from the products the homepage
//     already fetched (never a hardcoded number).
// The same facts ship in the server-rendered home body and FAQPage schema.
export default function HomeFaqs({ products }) {
  const priceFrom = useMemo(() => priceFromProducts(products), [products])

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

      <dl className="home-faqs-list">
        {HOME_FAQS.map((faq) => (
          <div className="home-faq" key={faq.question}>
            <dt className="home-faq-q">{faq.question}</dt>
            <dd className="home-faq-a">{faq.answer}</dd>
          </div>
        ))}
      </dl>

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
