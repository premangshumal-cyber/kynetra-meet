import { createClient } from '@supabase/supabase-js';
import { authenticatedUser } from './_lib/auth.js';
import { hostKey, isConfigured, newRoomId, permit, rateLimit, safeError, send } from './_lib/core.js';
import { ensureRoom, roomExists, roomsClient } from './_lib/livekit.js';
import { isUuid, validateMeetingDetails } from './_lib/validation.js';

function database() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export default async function handler(req, res) {
  if (!permit(req, res, ['GET', 'POST', 'PATCH'])) return;
  if (!rateLimit(req, res, 'meetings-' + req.method, req.method === 'POST' ? 12 : 80)) return;
  const db = database();
  if (!db) return send(res, 503, { error: 'Meeting database is not configured on the server.' });
  const user = await authenticatedUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { data, error } = await db.from('meetings')
      .select('id,title,description,room_code,scheduled_at,status,created_at')
      .eq('owner_id', user.id).order('created_at', { ascending: false }).limit(100);
    if (error) return send(res, 503, safeError(error));
    return send(res, 200, { meetings: data || [] });
  }

  if (req.method === 'PATCH') {
    const { id, action } = req.body || {};
    if (!isUuid(id) || action !== 'cancel') return send(res, 400, { error: 'Invalid cancellation request.' });
    try {
      const { data, error } = await db.from('meetings')
        .update({ status: 'cancelled' })
        .eq('owner_id', user.id).eq('id', id)
        .in('status', ['scheduled', 'active'])
        .select('room_code,status,id').maybeSingle();
      if (error) return send(res, 503, safeError(error));
      if (!data) return send(res, 404, { error: 'Meeting not found or already finished.' });
      if (isConfigured()) {
        try { if (await roomExists(data.room_code)) await roomsClient().deleteRoom(data.room_code); }
        catch (err) { console.error('[Kynetra] cancellation media cleanup failed:', err.message); }
      }
      return send(res, 200, { meeting: data });
    } catch (error) { return send(res, 503, safeError(error)); }
  }

  const details = validateMeetingDetails(req.body || {});
  if (details.error) return send(res, 400, { error: details.error });
  try {
    const room = newRoomId();
    if (!details.scheduled_at && isConfigured()) await ensureRoom(room);
    const record = {
      owner_id: user.id,
      title: details.title,
      description: details.description,
      scheduled_at: details.scheduled_at,
      room_code: room,
      status: 'scheduled'
    };
    const { data, error } = await db.from('meetings')
      .insert(record).select('id,title,description,room_code,scheduled_at,status,created_at').single();
    if (error) return send(res, 503, safeError(error));
    return send(res, 201, {
      room,
      meeting: data,
      hostKey: isConfigured() ? hostKey(room) : null,
      invitePath: '/meet/' + room
    });
  } catch (error) { return send(res, 503, safeError(error)); }
}
