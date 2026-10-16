import { isConfigured, send } from './_lib/core.js';

export default function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed.' });
  return send(res, 200, {
    service: 'kynetra',
    status: 'ok',
    conferencing: isConfigured() ? 'livekit-configured' : 'demo-jitsi-only',
    persistence: process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'not-configured',
    timestamp: new Date().toISOString()
  });
}
