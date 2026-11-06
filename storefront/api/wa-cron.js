// Daily status-update sweep for silent WhatsApp threads (Vercel Cron).
//
// GET /api/wa-cron — runs once per day via vercel.json crons:
//   • loads the registry of sessions that placed an order (KV-backed)
//   • for each: fetches the sender's recent orders, diffs against the
//     session snapshot, and proactively notifies the customer about
//     payment / order-status changes (same logic as the lazy sweep in the
//     webhook, requested by the owner).
//   • prunes registry entries whose session is gone or longer hosts a phone.
//
// Optional guard: set WA_CRON_SECRET in Vercel and pass ?auth=… (or header)
// from anywhere outside Vercel's own scheduler.
//
// KV requirement: cron needs KV_REST_API_URL/KV_REST_API_TOKEN (Vercel KV,
// free tier) because in-memory sessions die with each instance. Without KV
// the endpoint answers { enabled: false } and the bot stays lazy-sweep-only.

import { statusSweep } from './wa/_bot.js'
import * as store from './wa/_store.js'
import { makeSender, textMessage } from './wa/_graph.js'
import { productionIo } from './wa/_io.js'

const send = makeSender()

function authorized(req) {
  const secret = process.env.WA_CRON_SECRET
  if (!secret) return true
  const given = req.query?.auth || req.headers['x-wa-cron-auth'] || ''
  return given === secret
}

// One registry entry → sweep + (maybe) notify. Exported for tests.
export async function sweepSession(sessionId, { io, sendFn = send } = {}) {
  const session = (await store.getSession(sessionId)) || null
  if (!session || !session.phone) return { pruned: true, notified: false }

  let result
  try {
    result = await statusSweep(session, io, { notify: true })
  } catch (err) {
    console.error('[wa:cron] sweep failed for', sessionId, err?.message)
    return { pruned: false, notified: false }
  }

  await store.saveSession(sessionId, result.session)
  if (result.actions?.length) {
    const to = String(session.phone).replace(/[^0-9]/g, '')
    try {
      for (const action of result.actions) {
        await sendFn(textMessage(to, action.text))
      }
    } catch (err) {
      console.error('[wa:cron] send failed for', sessionId, err?.message)
      return { pruned: false, notified: false }
    }
    return { pruned: false, notified: true }
  }
  return { pruned: false, notified: false }
}

// Full sweep across the registry. Exported for tests.
export async function sweepAll({ io } = {}) {
  if (!store.kvConfigured()) {
    return { enabled: false, reason: 'KV not configured — enabling Vercel KV is required for daily sweeps', swept: 0, notified: 0 }
  }
  const ids = await store.registryList()
  let swept = 0
  let notified = 0
  const keep = []
  for (const sid of ids) {
    const out = await sweepSession(sid, { io: io || productionIo() })
    if (!out.pruned) keep.push(sid)
    swept += 1
    if (out.notified) notified += 1
  }
  await store.registrySave(keep)
  return { enabled: true, swept, notified }
}

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' })
  try {
    const result = await sweepAll()
    return res.status(200).json({ ok: true, ...result })
  } catch (err) {
    console.error('[wa:cron] failed:', err?.message)
    return res.status(200).json({ ok: false, error: err?.message || 'sweep failed' })
  }
}
