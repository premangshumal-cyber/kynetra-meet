import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

export function roomsClient() {
  const url = process.env.LIVEKIT_URL.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
  return new RoomServiceClient(url, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
}
export async function roomExists(room) {
  const matches = await roomsClient().listRooms([room]);
  return matches.some(x => x.name === room);
}
export async function ensureRoom(room) {
  const client = roomsClient();
  const list = await client.listRooms([room]);
  if (!list.some(x => x.name === room)) {
    try {
      await client.createRoom({ name: room, emptyTimeout: 900, maxParticipants: 32 });
    } catch (error) {
      // Multiple participants can race to create the same room. Recheck.
      const existing = await client.listRooms([room]);
      if (!existing.some(x => x.name === room)) throw error;
    }
  }
  return client;
}
export async function guestToken(room, name) {
  const { randomUUID } = await import('node:crypto');
  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: randomUUID(), name, ttl: '1h'
  });
  token.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true, canPublishData: true });
  return token.toJwt();
}
