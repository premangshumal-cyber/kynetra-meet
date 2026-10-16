import { WebhookReceiver } from 'livekit-server-sdk';
import { createClient } from '@supabase/supabase-js';
import { isConfigured, isRoom, send } from '../_lib/core.js';

// LiveKit sends application/webhook+json signed with an Authorization JWT.
// Vercel must preserve the exact raw request payload for signature verification.
export const config = { api: { bodyParser: false } };

async function bodyText(req) {
  const parts = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 65536) throw new Error('body-too-large');
    parts.push(chunk);
  }
  return Buffer.concat(parts).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
  if (!isConfigured()) return send(res, 503, { error: 'Conferencing webhook not configured.' });
  const contentType = String(req.headers['content-type'] || '').split(';')[0];
  if (contentType !== 'application/webhook+json') return send(res, 415, { error: 'Invalid webhook content type.' });
  try {
    const raw = await bodyText(req);
    const receiver = new WebhookReceiver(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
    const event = await receiver.receive(raw, req.headers.authorization);
    const room = event.room?.name;
    if (!isRoom(room)) return send(res, 200, { ok: true, ignored: true });
    if (!['room_started', 'room_finished'].includes(event.event)) return send(res, 200, { ok: true });

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return send(res, 200, { ok: true, persistence: 'not-configured' });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const status = event.event === 'room_started' ? 'active' : 'completed';
    const query = supabase.from('meetings').update({ status }).eq('room_code', room);
    if (status === 'active') query.eq('status', 'scheduled');
    else query.in('status', ['scheduled', 'active']);
    const { error } = await query;
    if (error) { console.error('[Kynetra webhook] database update failed', error.message); return send(res, 500, { error: 'Unable to record meeting status.' }); }
    return send(res, 200, { ok: true });
  } catch (error) {
    console.error('[Kynetra webhook] reject:', error.message);
    return send(res, error.message === 'body-too-large' ? 413 : 401, { error: 'Webhook signature or payload rejected.' });
  }
}
