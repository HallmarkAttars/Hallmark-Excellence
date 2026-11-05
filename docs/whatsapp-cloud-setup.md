# WhatsApp Cloud API — setup guide (owner steps)

Time: ~30–60 min. Cost: **₹0** — messages are free (inbound + replies inside the
24-hour service window). No LLM, no Redis bill, no CodeWords.

The bot code is already live in this repo (`storefront/api/wa-webhook.js` + `storefront/api/wa/`).
After you finish these steps, the bot answers automatically on WhatsApp.

---

## 1. Create the Meta app (10 min)

Go to <https://developers.facebook.com> and sign in with your Facebook account.

1. **My Apps → Create App**.
2. Use case / product: **Business** → name it "Hikma Exports Bot".
3. After creation, on the dashboard **Add product → WhatsApp** (Set up).

You will be taken to the WhatsApp quickstart. It auto-creates a **test number**
("Meta test number") first — you can test the bot end to end with that number
and a handful of phone numbers you add there, before switching to your real
shop number.

## 2. Grab the credentials (2 min)

Still in the WhatsApp quickstart on Meta's dashboard:

Copy and store privately (never commit these):

| Credential | Where on the dashboard |
|---|---|
| `WHATSAPP_TOKEN` | "Temporary access token" (24h) — later make a permanent one (step 5) |
| `WHATSAPP_PHONE_NUMBER_ID` | "From" / Phone number ID under the test number |
| `WHATSAPP_VERIFY_TOKEN` | anything random YOU choose (e.g. `hikma-wa-2026-<random>`) |
| `WHATSAPP_APP_SECRET` | App Settings → Basic → App secret |

## 3. Point Meta's webhook at your site (5 min)

1. Add an env variable to your **Vercel project** (the site hosting):
   - `WHATSAPP_VERIFY_TOKEN` = the random string from step 2.
2. Deploy happens automatically (already done). The webhook endpoint is:
   `https://www.areesperfumes.in/api/wa-webhook`
3. Meta dashboard → **WhatsApp → Configuration → Webhook**:
   - Callback URL: `https://www.areesperfumes.in/api/wa-webhook`
   - Verify token: paste your `WHATSAPP_VERIFY_TOKEN`
   - Click **Verify and save** (Meta calls our GET and expects the challenge back — done).
4. In the **Webhook fields** section, subscribe to: **messages**.

## 4. Send the token to the site (2 min)

In Vercel → Settings → Environment Variables, add (then redeploy):

- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_APP_SECRET` (recommended — the site then verifies Meta's signature)
- `WHATSAPP_QR_URL` = `https://www.areesperfumes.in/upi-qr.jpeg` — only after
  step 6 put the QR file in place. Until then the bot sends the UPI ID as text.

## 5. Permanent access token (10 min)

Quickstart tokens expire in 24h. Make a permanent one:

1. <https://developers.facebook.com> → Business settings → **System users**
   — create a system user "Hikma Bot" (admin).
2. Add your WhatsApp account + app assets to it.
3. **System user → Generate token** → scope `whatsapp_business_messaging`,
   `whatsapp_business_management`.
4. Paste this into `WHATSAPP_TOKEN` in Vercel and redeploy.

## 6. The UPI QR image (2 min)

Save the "SCAN & PAY — HIKMA EXPORTS" QR image (South Indian Bank,
UPI ID `qr.hikmaex@sib`) to the repo as:

```
storefront/public/upi-qr.jpeg
```

and push a commit. The bot will then send the image (recorded from the site)
when the customer reaches the payment step. Until then it sends only the
UPI ID text — which alone is enough to pay.

## 7. Test (5 min)

1. On the Meta dashboard quickstart, add your personal WhatsApp number
   under "To" recipients (verify with the code it sends you).
2. From that phone, message the TEST number shown on the dashboard (or click
   "Open in WhatsApp" on the dashboard).
3. You should receive the menu:
   `1. Order products / 2. Track my order / 3. Shop info / 4. Talk to a person`.
4. Try: Order → a product → Confirm order → enter name/address/pincode/city →
   reply `skip` for email → "Send UPI & confirm" → you get the UPI ID + image
   → "Yes, confirm" → order number + track link. Check the order appears in
   your shop admin.

## 8. Move to the real shop number (+91 98407 50467) (10 min)

Meta now allows the Cloud API and the WhatsApp Business **app** on the same
number (app "coexistence"), so the shop phone keeps the Business app for
human replies (menu option 4 hands off to your staff chat window).

1. WhatsApp quickstart → Phone numbers → **Add phone number** (+91 98407 50467).
2. Complete the display name + category = **Retail**.
3. Replace `WHATSAPP_PHONE_NUMBER_ID` in Vercel with the NEW id shown next to
   that number, and redeploy.
4. Send one test message from your phone; from then onwards customers can
   just message the business line.

## Notes & limits (free tier)

- 1000 service conversations/month free; within a 24-hour conversation, all
  replies are free. No marketing template is used — we stay inside the window.
- Greeting template / business profile: set the business description and
  address (Mannadi, George Town, Chennai) in WhatsApp Manager → Profile.
- Conversations started by a customer are always free to answer.
- If the site is unreachable at webhook time, Meta queues and retries the
  message once for ~1 minute; our message-id dedupe prevents double answers.
- Rules already applied to the bot: advance payment via UPI only (no COD),
  "skip" email fallback records the order under `orders@areesperfumes.in`
  (configurable with `WHATSAPP_FALLBACK_EMAIL`), UPI ID override
  `WHATSAPP_UPI_ID` (default `qr.hikmaex@sib`).
