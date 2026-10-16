import crypto from 'node:crypto';

const requestCounts = new Map();
export const ROOM_PATTERN = /^kyn-[a-f0-9]{16,32}$/;

export function isRoom(value) { return typeof value === 'string' && ROOM_PATTERN.test(value); }
export function cleanName(name) { return typeof name === 'string' ? name.trim().replace(/[<>\x00-\x1F]/g, '').trim().slice(0, 60) : ''; }
export function newRoomId() { return 'kyn-' + crypto.randomBytes(16).toString('hex'); }
export function isConfigured() { return Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && process.env.KYNETRA_HOST_SECRET); }
export function send(res, status, value) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(value);
}
export function permit(req, res, methods = ['POST']) {
  if (!methods.includes(req.method)) {
    res.setHeader('Allow', methods.join(', '));
    send(res, 405, { error: 'Method not allowed.' });
    return false;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const origin = req.headers.origin;
    const forwardedHost = req.headers['x-forwarded-host'];
    const host = forwardedHost || req.headers.host;
    if (origin) {
      let url;
      try { url = new URL(origin); } catch { send(res, 403, { error: 'Invalid request origin.' }); return false; }
      if (url.host !== host || !['http:', 'https:'].includes(url.protocol)) {
        send(res, 403, { error: 'Cross-origin requests are not allowed.' });
        return false;
      }
    }
    if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
      send(res, 415, { error: 'Content type must be application/json.' });
      return false;
    }
  }
  return true;
}
export function rateLimit(req, res, kind, max, windowMs = 60000) {
  // Best-effort per-instance protection. Production requires distributed rate limiting/WAF.
  const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim().slice(0, 90);
  const key = kind + ':' + ip;
  const now = Date.now();
  let entry = requestCounts.get(key);
  if (!entry || entry.expiresAt < now) entry = { hits: 0, expiresAt: now + windowMs };
  entry.hits++;
  requestCounts.set(key, entry);
  if (requestCounts.size > 5000) {
    for (const [id, value] of requestCounts) if (value.expiresAt < now) requestCounts.delete(id);
  }
  if (entry.hits > max) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((entry.expiresAt - now) / 1000))));
    send(res, 429, { error: 'Too many requests. Try again shortly.' });
    return false;
  }
  return true;
}
export function required(req, res, methods = ['POST']) {
  if (!permit(req, res, methods)) return false;
  if (!isConfigured()) {
    send(res, 503, { error: 'Dedicated conferencing is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET and KYNETRA_HOST_SECRET on the server.' });
    return false;
  }
  return true;
}
export function hostKey(room) {
  return crypto.createHmac('sha256', process.env.KYNETRA_HOST_SECRET).update('kynetra-host-v1:' + room).digest('base64url');
}
export function checkHost(room, value) {
  if (!isRoom(room) || typeof value !== 'string' || value.length > 100) return false;
  const expected = Buffer.from(hostKey(room));
  const actual = Buffer.from(value);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
export function safeError(error) {
  console.error('[Kynetra API]', error?.message || error);
  return { error: 'Unable to complete the request. Please try again.' };
}
