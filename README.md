# ScanPro — Web Document Scanner with AI Enhancement

A CamScanner-style document scanner that runs in the browser. It detects document
edges, corrects perspective (de-skews), applies scan filters, and exports a PDF.
A backend keeps your Gemini API key safe and enforces free vs. paid limits.

**Free tier:** limited AI scans per day. **Pro tier:** unlimited.

---

## What's in the box

```
scanpro/
├── public/
│   └── index.html         ← the whole frontend (scanner UI, all in one file)
├── api/
│   ├── enhance.js         ← AI enhancement (calls Gemini, enforces quota)
│   ├── usage.js           ← returns plan + scans remaining
│   ├── checkout.js        ← payment session (Stripe/Paystack stub)
│   ├── webhook.js         ← marks users Pro after payment
│   └── _lib/
│       └── auth.js        ← user identity + daily quota logic
├── package.json
├── vercel.json
├── .env.example
└── README.md
```

The scanner pipeline follows the [LearnOpenCV document scanner](https://learnopencv.com/automatic-document-scanner-using-opencv/):
morphological close → border mask → Canny edges → contour `approxPolyDP` →
4-corner homography warp → scan filters.

---

## Quick start (local)

1. **Install Node 18+** and the Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. **Get a free Gemini key** at https://aistudio.google.com → *Get API key*.

3. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # edit .env.local and paste your GEMINI_API_KEY
   ```

4. **Run it:**
   ```bash
   vercel dev
   ```
   Open http://localhost:3000

---

## Deploy to the internet (free)

### Option A — Vercel (recommended)

1. Push this folder to a GitHub repo.
2. Go to https://vercel.com → *Add New Project* → import your repo.
3. In **Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` = your key
   - `FREE_DAILY_LIMIT` = `5`
   - `ALLOWED_ORIGIN` = your future URL (e.g. `https://scanpro.vercel.app`)
   - `SITE_URL` = same URL
4. Click **Deploy**. You get a live `https://<name>.vercel.app` URL.

Your Gemini key lives only on the server — users never see it.

### Persistent quotas (important for production)

By default, the free-scan counter lives in server memory and resets when the
serverless function goes cold. To make limits stick:

1. In your Vercel project → **Storage → Create Database → KV** (free tier).
2. Connect it to the project. Vercel auto-injects `KV_*` env vars.
3. `npm i @vercel/kv` (already an optional dependency).

Now quotas persist per user per day.

---

## Turning on payments (to sell Pro)

The app ships with a checkout **stub**. Wire a provider:

### Paystack (best for South Africa 🇿🇦)
1. Create an account at https://paystack.com, get your secret key.
2. Add `PAYSTACK_SECRET_KEY` to env vars.
3. Uncomment the Paystack block in `api/checkout.js` and set your price.
4. Add your webhook URL `https://<your-app>/api/webhook` in the Paystack dashboard.

### Stripe (global cards)
1. Create an account at https://stripe.com.
2. Create a recurring Price, copy its `price_...` ID.
3. Add `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`.
4. Uncomment the Stripe block in `api/checkout.js`.
5. Register the webhook `https://<your-app>/api/webhook`.

When payment succeeds, `api/webhook.js` issues the user a **Pro token**. Email it
to them (or build a magic-link login). The frontend stores it in
`localStorage.scanpro_token` and sends it as `Authorization: Bearer <token>` —
which unlocks unlimited scans.

---

## How the free/paid gate works

- Every AI enhance call goes to `POST /api/enhance`.
- The server identifies the user (Pro token, or anonymous by IP/device).
- Free users: counter increments per day, capped at `FREE_DAILY_LIMIT`.
  When exceeded the server returns **HTTP 429** and the UI shows "Upgrade".
- Pro users: always allowed.

The **scanning, perspective correction, filters and PDF export all run
client-side and are always free** — only the Gemini AI analysis is metered,
because that's what costs you money.

---

## Customising

- **Change free limit:** set `FREE_DAILY_LIMIT`.
- **Change the AI prompt:** edit the `prompt` string in `api/enhance.js`.
- **Branding/colours:** edit the CSS variables at the top of `public/index.html`.
- **What Pro unlocks:** currently unlimited AI scans. You could also gate
  higher-resolution export, batch scanning, or watermark removal.

---

## Notes & limits

- Gemini free tier allows ~15 requests/minute — plenty for personal/small use.
  Monitor usage in Google AI Studio.
- The OpenCV-style detector works best when the document contrasts with the
  background and all four corners are visible (same limitation as the original
  LearnOpenCV approach).
- This is classical CV, not a deep-learning corner model. It's fast and free.
  For tougher cases you could later swap in a model — see the LearnOpenCV
  DeepLabV3 follow-up.

MIT licensed — sell it, modify it, ship it.
