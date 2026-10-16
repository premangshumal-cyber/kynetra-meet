import { createClient } from '@supabase/supabase-js';
import { ensureRoom, guestToken } from './_lib/livekit.js';
import { cleanName, isRoom, rateLimit, required, safeError, send } from './_lib/core.js';

export default async function handler(req, res) {
  if (!required(req, res)) return;
  if (!rateLimit(req, res, 'token', 40)) return;
  const room = req.body?.room;
  const name = cleanName(req.body?.name);
  if (!isRoom(room) || name.length < 1) return send(res, 400, { error: 'Enter a valid meeting code and display name.' });

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return send(res, 503, { error: 'Meeting authorization is not configured.' });
    }
    {
      const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      const result = await db.from('meetings').select('status').eq('room_code', room).maybeSingle();
      if (result.error) return send(res, 503, { error: 'Meeting access could not be verified.' });
      if (result.data?.status === 'cancelled') return send(res, 403, { error: 'This meeting has been cancelled.' });
    }
    await ensureRoom(room);
    const token = await guestToken(room, name);
    return send(res, 200, { token, serverUrl: process.env.LIVEKIT_URL });
  } catch (error) { return send(res, 502, safeError(error)); }
}
