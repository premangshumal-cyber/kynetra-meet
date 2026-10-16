import { isConfigured, send } from './_lib/core.js';

export default function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed.' });
  return send(res, 200, {
    service: 'kynetra',
    status: 'ok',
    conferencing: isConfigured() ? 'livekit-configured' : 'demo-jitsi-only',
    persistence: process.env.SUPABASE_URL && (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) ? 'configured' : 'not-configured',
    authentication: process.env.SUPABASE_URL && (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY) ? 'configured' : 'not-configured',
    productionReady: Boolean(isConfigured() && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY)),
    timestamp: new Date().toISOString()
  });
}
