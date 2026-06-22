// api/webhook.js — payment provider calls this after a successful payment.
// On success: create a Pro token and store it so the user gets unlimited scans.
import { randomBytes } from 'crypto';

// We import the same store used by auth.js
let kv = null;
try { const m = await import('@vercel/kv'); kv = m.kv; } catch (_) { kv = null; }
const memStore = new Map();
async function storeSet(key, value) {
  if (kv) return await kv.set(key, value);
  memStore.set(key, value);
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // ─── Verify the webhook signature (provider-specific) ──────
    // STRIPE:   verify with stripe.webhooks.constructEvent(rawBody, sig, secret)
    // PAYSTACK: verify x-paystack-signature HMAC-SHA512 of the raw body

    // After verifying, extract the customer email from the event payload:
    const event = req.body || {};
    const email =
      event?.data?.object?.customer_email ||  // Stripe
      event?.data?.customer?.email ||         // Paystack
      event?.email;

    if (!email) return res.status(400).json({ error: 'No email in event' });

    // Issue a Pro token for this user
    const token = randomBytes(24).toString('hex');
    const userId = `user:${email.toLowerCase()}`;

    await storeSet(`token:${token}`, { userId, plan: 'pro', email });
    await storeSet(`email:${email.toLowerCase()}`, { token, plan: 'pro' });

    // In a real app, email this token (or a magic login link) to the user.
    // They paste/store it so the frontend sends it as Bearer token.
    console.log(`[webhook] Upgraded ${email} → Pro. Token: ${token}`);

    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(500).json({ error: 'Webhook error' });
  }
}

// Note: Stripe/Paystack webhooks need the RAW body for signature checks.
// On Vercel add:  export const config = { api: { bodyParser: false } }
// and read the raw stream — see README for the exact snippet.
