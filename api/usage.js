// api/usage.js — returns the caller's plan and remaining free scans.
import { getUserFromRequest, readQuota } from './_lib/auth.js';

const FREE_DAILY_LIMIT = parseInt(process.env.FREE_DAILY_LIMIT || '5', 10);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const user = await getUserFromRequest(req);
    const q = await readQuota(user, FREE_DAILY_LIMIT);
    return res.status(200).json({
      plan: q.plan,
      scansRemaining: q.scansRemaining === Infinity ? -1 : q.scansRemaining,
      freeLimit: FREE_DAILY_LIMIT,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal error' });
  }
}
