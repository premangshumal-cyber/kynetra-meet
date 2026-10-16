import { roomsClient } from './_lib/livekit.js';
import { checkHost, isRoom, rateLimit, required, safeError, send } from './_lib/core.js';

export default async function handler(req, res) {
  if (!required(req, res)) return;
  if (!rateLimit(req, res, 'moderate', 40)) return;
  const { room, hostKey, action, identity, trackSid } = req.body || {};
  if (!checkHost(room, hostKey)) return send(res, 403, { error: 'Only the meeting host can perform this action.' });
  if (!['remove', 'mute'].includes(action) || typeof identity !== 'string' || identity.length > 100 || !/^[\w-]{10,100}$/.test(identity)) {
    return send(res, 400, { error: 'Invalid moderation request.' });
  }
  try {
    const svc = roomsClient();
    if (action === 'remove') await svc.removeParticipant(room, identity);
    else {
      if (typeof trackSid !== 'string' || !/^TR_[a-zA-Z0-9]{8,}$/.test(trackSid)) return send(res, 400, { error: 'Valid audio track ID required.' });
      await svc.mutePublishedTrack(room, identity, trackSid, true);
    }
    return send(res, 200, { ok: true });
  } catch (error) { return send(res, 502, safeError(error)); }
}
