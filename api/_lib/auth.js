// api/_lib/auth.js
// Lightweight user identity + daily quota tracking.
//
// STORAGE: This reference uses Vercel KV (Redis) if configured, otherwise
// falls back to an in-memory map (fine for testing, resets on cold start).
// For production, set up Vercel KV (free tier) or Upstash Redis — see README.

let kv = null;
try {
  // Optional: @vercel/kv if installed and configured
  const mod = await import('@vercel/kv');
  kv = mod.kv;
} catch (_) {
  kv = null;
}

// In-memory fallback store (per-instance, non-persistent)
const memStore = new Map();

async function storeGet(key) {
  if (kv) return await kv.get(key);
  return memStore.get(key) ?? null;
}
async function storeSet(key, value, ttlSeconds) {
  if (kv) {
    if (ttlSeconds) return await kv.set(key, value, { ex: ttlSeconds });
    return await kv.set(key, value);
  }
  memStore.set(key, value);
  return true;
}

// Identify the user from the Authorization header.
// Free (anonymous) users are tracked by a device token or IP.
// Pro users present a token that maps to plan='pro'.
export async function getUserFromRequest(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (token) {
    // Look up the token → user record
    const rec = await storeGet(`token:${token}`);
    if (rec) {
      return { id: rec.userId, plan: rec.plan || 'free', token };
    }
  }

  // Anonymous: derive a stable id from IP (+ optional device header)
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const device = req.headers['x-device-id'] || '';
  const anonId = `anon:${ip}:${device}`;
  return { id: anonId, plan: 'free', token: '' };
}

// Returns { allowed, remaining }.
// Pro users are always allowed. Free users get FREE_DAILY_LIMIT per UTC day.
export async function checkAndConsumeQuota(user, freeLimit) {
  if (user.plan === 'pro') {
    return { allowed: true, remaining: Infinity };
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const key = `usage:${user.id}:${today}`;
  const used = (await storeGet(key)) || 0;

  if (used >= freeLimit) {
    return { allowed: false, remaining: 0 };
  }

  // Consume one, expire at end of day (~24h TTL is fine)
  await storeSet(key, used + 1, 60 * 60 * 26);
  return { allowed: true, remaining: Math.max(0, freeLimit - (used + 1)) };
}

// Read-only usage check (no consume) — for the /api/usage endpoint
export async function readQuota(user, freeLimit) {
  if (user.plan === 'pro') {
    return { plan: 'pro', scansRemaining: Infinity };
  }
  const today = new Date().toISOString().slice(0, 10);
  const key = `usage:${user.id}:${today}`;
  const used = (await storeGet(key)) || 0;
  return { plan: 'free', scansRemaining: Math.max(0, freeLimit - used) };
}
