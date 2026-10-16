import { ensureRoom, guestToken } from './_lib/livekit.js';
import { cleanName, isRoom, rateLimit, required, safeError, send } from './_lib/core.js';

export default async function handler(req, res) {
  if (!required(req, res)) return;
  if (!rateLimit(req, res, 'token', 40)) return;
  const room = req.body?.room;
  const name = cleanName(req.body?.name);
  if (!isRoom(room) || name.length < 1) return send(res, 400, { error: 'Enter a valid meeting code and display name.' });

  try {
    await ensureRoom(room);
    const token = await guestToken(room, name);
    return send(res, 200, { token, serverUrl: process.env.LIVEKIT_URL });
  } catch (error) { return send(res, 502, safeError(error)); }
}
