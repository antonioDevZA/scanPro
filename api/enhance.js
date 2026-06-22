// api/enhance.js — Serverless function (Vercel/Netlify compatible)
// Holds the Gemini API key server-side and enforces free/paid scan limits.

import { getUserFromRequest, checkAndConsumeQuota } from './_lib/auth.js';

const GEMINI_KEY = process.env.GEMINI_API_KEY;          // set in hosting dashboard
const FREE_DAILY_LIMIT = parseInt(process.env.FREE_DAILY_LIMIT || '5', 10);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'Server not configured (missing GEMINI_API_KEY)' });
  }

  try {
    const { image } = req.body || {};
    if (!image) return res.status(400).json({ error: 'Missing image' });

    // Identify user (token) and enforce quota
    const user = await getUserFromRequest(req);
    const quota = await checkAndConsumeQuota(user, FREE_DAILY_LIMIT);

    if (!quota.allowed) {
      return res.status(429).json({
        error: 'Free daily limit reached',
        plan: user.plan,
        scansRemaining: 0,
      });
    }

    // Call Gemini Vision
    const prompt =
      'You are a document-scanning quality expert. Analyse this scanned document image. ' +
      'In under 60 words tell the user: 1) Is it straight/aligned? 2) Is the text readable? ' +
      '3) A quality score from 1-10. 4) One concrete tip to improve it.';

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: 'image/jpeg', data: image } },
              { text: prompt },
            ],
          }],
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(502).json({ error: 'Gemini error', detail: errText.slice(0, 200) });
    }

    const data = await geminiRes.json();
    const analysis =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis returned';

    return res.status(200).json({
      analysis,
      plan: user.plan,
      scansRemaining: quota.remaining,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal error', detail: String(err).slice(0, 200) });
  }
}
