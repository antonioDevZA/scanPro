// api/checkout.js — creates a payment session for upgrading to Pro.
//
// This is a STUB you wire to your payment provider. Two common options:
//   • Stripe   (global cards)        → https://stripe.com
//   • Paystack (great for ZA/Africa) → https://paystack.com
//
// The flow:
//   1. User clicks "Upgrade" → frontend opens /api/checkout?email=...
//   2. You create a checkout session with the provider and redirect there
//   3. Provider calls your /api/webhook on success → you mark the user 'pro'
//      and issue them a token (stored via auth.js storeSet token:<token>)

export default async function handler(req, res) {
  const email = (req.query.email || '').toString();
  if (!email) return res.status(400).send('Email required');

  // ─── STRIPE EXAMPLE (uncomment + npm i stripe) ───────────────
  // import Stripe from 'stripe';
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  // const session = await stripe.checkout.sessions.create({
  //   mode: 'subscription',
  //   payment_method_types: ['card'],
  //   customer_email: email,
  //   line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
  //   success_url: `${process.env.SITE_URL}/?upgraded=1`,
  //   cancel_url: `${process.env.SITE_URL}/`,
  // });
  // return res.redirect(303, session.url);

  // ─── PAYSTACK EXAMPLE (uncomment) ────────────────────────────
  // const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
  //   method: 'POST',
  //   headers: {
  //     Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     email,
  //     amount: 4900 * 100,            // e.g. R49.00 in kobo/cents
  //     callback_url: `${process.env.SITE_URL}/?upgraded=1`,
  //   }),
  // });
  // const data = await initRes.json();
  // return res.redirect(303, data.data.authorization_url);

  // Placeholder page until you wire a provider:
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(`
    <html><body style="font-family:sans-serif;max-width:520px;margin:60px auto;padding:0 20px;color:#222">
      <h2>Upgrade to ScanPro Pro</h2>
      <p>Hi <b>${email}</b> — payment isn't wired up yet.</p>
      <p>To enable this, add Stripe or Paystack keys in your hosting environment
      and uncomment the relevant block in <code>api/checkout.js</code>.</p>
      <p>See the README for step-by-step setup.</p>
      <a href="/" style="color:#00a58e">← Back to ScanPro</a>
    </body></html>
  `);
}
