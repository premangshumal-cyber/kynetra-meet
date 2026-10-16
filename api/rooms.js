import { authenticatedUser } from './_lib/auth.js';
import { ensureRoom, roomsClient } from './_lib/livekit.js';
import { checkHost, hostKey, isRoom, newRoomId, rateLimit, required, safeError, send } from './_lib/core.js';

export default async function handler(req, res) {
  if (!required(req, res, ['GET', 'POST'])) return;
  if (!rateLimit(req, res, 'rooms', req.method === 'POST' ? 12 : 90)) return;

  if (req.method === 'GET') {
    const room = req.query.room;
    if (!isRoom(room)) return send(res, 400, { error: 'Invalid meeting code.' });
    try {
      const matches = await roomsClient().listRooms([room]);
      const item = matches.find(x => x.name === room);
      return send(res, 200, { room, active: !!item, participantCount: item?.numParticipants || 0 });
    } catch (error) { return send(res, 502, safeError(error)); }
  }

  // Room creation is privileged: invitees can join anonymously, but hosts must
  // possess a valid Supabase account session.
  const creator = await authenticatedUser(req, res);
  if (!creator) return;

  try {
    const room = newRoomId();
    await ensureRoom(room);
    return send(res, 201, {
      room,
      hostKey: hostKey(room),
      invitePath: '/meet/' + room
    });
  } catch (error) { return send(res, 502, safeError(error)); }
}
