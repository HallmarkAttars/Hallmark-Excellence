// Meta WhatsApp Cloud API webhook for the Hikma Exports bot.
//
// GET  /api/wa-webhook  → hub.challenge handshake (verify token)
// POST /api/wa-webhook  → message events → deterministic bot (_bot.js)
//
// Env vars (set in Vercel → Settings → Environment Variables):
//   WHATSAPP_TOKEN           permanent Cloud API access token
//   WHATSAPP_PHONE_NUMBER_ID phone number id from the Meta dashboard
//   WHATSAPP_VERIFY_TOKEN    the random string you type into the Meta webhook
//                            setup screen (GET handshake) — required for verify
//   WHATSAPP_APP_SECRET      App secret — verifies X-Hub-Signature-256 (recommended)
//   WHATSAPP_QR_URL          hosted UPI QR image; falls back to text UPI ID
//   KV_REST_API_URL / KV_REST_API_TOKEN  Vercel KV (optional; memory fallback without)
//
// Always answers Meta 200 quickly — failing/dangling webhooks get disabled.

import { createHmac } from 'node:crypto'
import { handleWithStatusSweep, sessionIdFrom, defaultSession } from './wa/_bot.js'
import * as store from './wa/_store.js'
import { makeSender, textMessage, listMessage, buttonsMessage, imageMessage } from './wa/_graph.js'
import { productionIo, qrImageUrl } from './wa/_io.js'

const send = makeSender()

function sessionIdOf(from) {
  return `bot:${sessionIdFrom(from)}`
}

// Map a WhatsApp message onto the bot's input shape.
function parseInput(message) {
  const type = message.type
  if (type === 'interactive') {
    const part = message.interactive || {}
    const id = part.button_reply?.id || part.list_reply?.id || ''
    return { kind: 'interactive', customId: id, from: message.from }
  }
  if (type === 'text') {
    return { kind: 'text', text: message.text?.body || '', from: message.from }
  }
  // Media and other unsupported types → treat as plain text (menu fallback).
  return { kind: 'text', text: '', from: message.from }
}

// Render the bot's descriptor list into Graph messages.
export async function renderActions(to, actions, sendFn = send) {
  const doSend = sendFn || send
  for (const action of actions || []) {
    if (!action) continue
    if (action.type === 'text') await doSend(textMessage(to, action.text, { previewUrl: action.previewUrl }))
    else if (action.type === 'list') {
      await doSend(listMessage(to, { header: action.header, body: action.body, button: action.footer, rows: action.rows }))
    } else if (action.type === 'buttons') {
      await doSend(buttonsMessage(to, { body: action.body, buttons: action.buttons }))
    } else if (action.type === 'image') {
      try {
        await doSend(imageMessage(to, action.url))
      } catch (err) {
        console.error('[wa:webhook] image send failed:', err && err.message)
      }
    }
  }
}

// Processes one parsed webhook body (exported for the offline test suite).
export async function processPayload(body, { io = productionIo(), sendFn = send } = {}) {
  for (const e of body?.entry || []) {
    for (const change of e.changes || []) {
      const value = change.value || {}
      for (const message of value.messages || []) {
        // Dedupe Meta's at-least-once delivery
        if (!(await store.checkAndRememberValue(message.id || ''))) continue

        const from = message.from || ''
        const input = parseInput(message)
        const session = (await store.getSession(sessionIdOf(from))) || defaultSession()

        try {
          const { actions, session: nextSession, note } = await handleWithStatusSweep(input, session, { io })
          await renderActions(from, actions, sendFn)
          if (nextSession) await store.saveSession(sessionIdOf(from), nextSession)
          // A session that ever placed an order joins the daily cron registry.
          if (nextSession && note === 'order-placed') await store.registryAdd(sessionIdOf(from))
        } catch (err) {
          console.error('[wa:webhook] conversation error:', err && err.message)
          try {
            await sendFn(textMessage(from, 'Sorry, something went wrong. Reply *menu* to start again.'))
          } catch {}
        }
      }
    }
  }
}

function verifySignature(raw, header) {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret) return true // unsigned mode (local/preview)
  const expected = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`
  if (typeof header !== 'string' || header.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= header.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

// Vercel Node function — ESM named/multi export: default handler.
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Webhook handshake + a lightweight health probe.
      if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === (process.env.WHATSAPP_VERIFY_TOKEN || '')) {
        return res.status(200).send(req.query['hub.challenge'] || '')
      }
      return res.status(200).json({ ok: true, bot: 'hikma-exports-whatsapp', codCount: 0 })
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

    const chunks = []
    let size = 0
    for await (const c of req) {
      chunks.push(c)
      size += c.length
      if (size > 1e6) return res.status(413).json({ error: 'payload too large' })
    }
    const raw = Buffer.concat(chunks).toString('utf8') || '{}'

    if (!verifySignature(raw, req.headers['x-hub-signature-256'])) {
      return res.status(401).json({ error: 'invalid signature' })
    }

    // Process BEFORE answering: Vercel serverless functions are frozen once
    // the response is sent, so background (`setImmediate`) work never runs.
    // The full conversation (≤4 sends) stays well inside Meta's webhook
    // timeout, and Meta's retry + our message-id dedupe covers any overrun.
    try {
      await processPayload(JSON.parse(raw))
    } catch (err) {
      // Meta retries non-200 webhooks only; a malformed body must not wedge
      // the queue — log and acknowledge anyway.
      console.error('[wa:webhook] processing failed:', err && err.message)
      return res.status(200).json({ received: true, error: 'processing failed' })
    }
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[wa:webhook] handler error:', err && err.message)
    // Meta retries failed deliveries for 200-only webhooks; a malformed body
    // should not wedge the queue — log and acknowledge.
    return null
  }
}
