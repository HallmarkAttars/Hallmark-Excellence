// ============================================================================
// Contact form → Formspree submission helper
//
// The public Formspree form endpoint (https://formspree.io/f/mjybybdy) receives
// exactly the four contact fields — name, email, phone, message — and nothing
// else ever leaves the browser. No secrets, no backend, no database.
//
// Extracted from Contact.jsx into a pure helper so the payload shape, the
// response.ok gating and the failure behavior can be unit-tested in isolation
// (fetch is injectable; tests never hit the network).
// ============================================================================

export const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mjybybdy'

export const FORMSPREE_ERROR_MESSAGE = 'Unable to send your message. Please try again.'

// Build the exact submission payload — trimmed, four fields only.
// A caller-provided object with extra keys must NOT leak into the request.
// A missing or null argument is treated as an empty form (defensive).
export function buildContactPayload(input) {
  const { name, email, phone, message } = input || {}
  return {
    name: String(name ?? '').trim(),
    email: String(email ?? '').trim(),
    phone: String(phone ?? '').trim(),
    message: String(message ?? '').trim(),
  }
}

// POST the contact form to Formspree.
//   - Resolves on a genuine 2xx (res.ok).
//   - Throws FORMSPREE_ERROR_MESSAGE on any non-OK response OR network failure,
//     so the caller can keep the user's input and let them retry.
// `fetchImpl` is injectable for tests; it defaults to the global fetch.
export async function submitContactForm(
  values,
  fetchImpl = typeof globalThis !== 'undefined' ? globalThis.fetch : undefined
) {
  if (typeof fetchImpl !== 'function') {
    throw new Error(FORMSPREE_ERROR_MESSAGE)
  }
  let res
  try {
    res = await fetchImpl(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(buildContactPayload(values)),
    })
  } catch {
    // Network failure (offline, CORS blocked, DNS…) — never a success.
    throw new Error(FORMSPREE_ERROR_MESSAGE)
  }
  // Guard the response shape too — a broken/empty resolution (undefined or a
  // non-Response) must surface the friendly message, never a raw TypeError.
  if (!res || !res.ok) {
    throw new Error(FORMSPREE_ERROR_MESSAGE)
  }
  return { ok: true }
}
