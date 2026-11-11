// Meta webhook verification + forwarding to the storefront WhatsApp bot.
//
// GET  /webhook  → hub.challenge handshake (WHATSAPP_VERIFY_TOKEN)
// POST /webhook  → forward the raw payload to the storefront /api/wa-webhook
//                  so the existing bot keeps handling inbound messages.
//
// The storefront verifies X-Hub-Signature-256 itself, so the original raw body
// and signature header must be forwarded unchanged (app.js captures rawBody).

const express = require('express')

const router = express.Router()

const DEFAULT_VERIFY_TOKEN = 'arees_perfumes_2026'
const DEFAULT_FORWARD_URL = 'https://www.areesperfumes.in/api/wa-webhook'

function verifyToken() {
  return process.env.WHATSAPP_VERIFY_TOKEN || DEFAULT_VERIFY_TOKEN
}

router.get('/', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === verifyToken()) {
    return res.status(200).send(challenge || '')
  }
  return res.sendStatus(403)
})

router.post('/', async (req, res) => {
  const target = process.env.WA_WEBHOOK_FORWARD_URL || DEFAULT_FORWARD_URL
  const signature = req.get('x-hub-signature-256')

  try {
    const headers = { 'content-type': 'application/json' }
    if (signature) headers['x-hub-signature-256'] = signature

    const body =
      req.rawBody && req.rawBody.length ? req.rawBody : JSON.stringify(req.body || {})

    await fetch(target, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    })
  } catch (err) {
    console.error('[webhook] forward failed:', err && err.message)
  }

  // Always 200: Meta retries non-200 deliveries and the storefront dedupes by
  // message id, so a failed forward must not wedge the queue.
  return res.status(200).json({ received: true })
})

module.exports = router
