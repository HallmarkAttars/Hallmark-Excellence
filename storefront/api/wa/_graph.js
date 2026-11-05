// Thin Graph-API sender for the WhatsApp Cloud API. One function per message
// shape the bot uses, all using WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID.
// Network-injected via `sendImpl` so the offline test suite can replace it.

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0'

function configured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
}

export const isConfigured = configured

function endpoint() {
  const version = GRAPH_VERSION.replace(/^v/, 'v')
  return `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
}

export function makeSender({ sendImpl } = {}) {
  const send = async (payload) => {
    const doSend =
      sendImpl ||
      (configured()
        ? globalThis.fetch
        : null)
    if (!doSend) {
      // Not configured (local dev / preview without credentials): log and
      // pretend success so the conversation logic stays testable.
      console.log('[wa:send] not configured, would send:', JSON.stringify(payload).slice(0, 400))
      return { ok: true, skipped: true }
    }
    const res = await doSend(endpoint(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: payload.to, ...payload.body }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const message = data?.error?.message || `Graph error ${res.status}`
      if (res.status >= 500 || res.status === 429) throw new Error(message)
      console.error('[wa:send] rejected:', res.status, message, JSON.stringify(payload.body).slice(0, 300))
      // Do not retry transient user-side rejects (already-answered buttons,
      // stale contexts, etc.) — swallow and continue the conversation.
      return { ok: false, status: res.status, message }
    }
    return { ok: true, data }
  }
  return send
}

export function textMessage(to, body, { previewUrl = false } = {}) {
  return { to, body: { type: 'text', text: { body, preview_url: previewUrl } } }
}

// Interactive list — ≤10 rows, all in ONE section (WhatsApp constraint).
export function listMessage(to, { header, body, button, rows }) {
  return {
    to,
    body: {
      type: 'interactive',
      interactive: {
        type: 'list',
        ...(header ? { header: { type: 'text', text: header } } : {}),
        body: { text: body },
        ...(button ? { footer: { text: button } } : {}),
        action: {
          button: 'Choose',
          sections: [{ title: 'Options', rows: rows.map((r) => ({ id: r.id, title: r.title, description: r.description })) }],
        },
      },
    },
  }
}

// Interactive reply buttons — ≤3, titles ≤20 chars.
export function buttonsMessage(to, { body, buttons }) {
  return {
    to,
    body: {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })),
        },
      },
    },
  }
}

export function imageMessage(to, link) {
  return { to, body: { type: 'image', image: { link } } }
}
