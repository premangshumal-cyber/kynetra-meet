import meetingsHandler from './meetings.js';
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

  // Reuse the authenticated durable meeting creation endpoint.
  return meetingsHandler(req, res);
}
