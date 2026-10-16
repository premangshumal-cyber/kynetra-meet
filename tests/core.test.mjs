import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { cleanName, hostKey, checkHost, isRoom, newRoomId, isConfigured } from '../api/_lib/core.js';

test('meeting codes are generated using strong random 128-bit hexadecimal IDs', () => {
  const first = newRoomId();
  const second = newRoomId();
  assert.match(first, /^kyn-[a-f0-9]{32}$/);
  assert.equal(isRoom(first), true);
  assert.notEqual(first, second);
});
test('rejects invalid, short, oversized, or path-injection room identifiers', () => {
  for (const value of ['', 'kin-1234567890123456', '../../etc/passwd', 'kyn-123', 'kyn-abc%2fdef', null, 'kyn-gggggggggggggggg']) assert.equal(isRoom(value), false);
});
test('cleans names while retaining regular Unicode names', () => {
  assert.equal(cleanName('  Asha   <Mal> \x00 '), 'Asha   Mal');
  assert.equal(cleanName('आशा'), 'आशा');
  assert.equal(cleanName('x'.repeat(100)).length, 60);
  assert.equal(cleanName(null), '');
});
test('host keys use HMAC and cannot be forged with a wrong bearer value', () => {
  process.env.KYNETRA_HOST_SECRET = 'minimum-32-chars-unique-deployment-secret';
  const room = newRoomId();
  const key = hostKey(room);
  assert.equal(checkHost(room, key), true);
  assert.equal(checkHost(room, key + 'x'), false);
  assert.equal(checkHost(newRoomId(), key), false);
});
test('requires all livekit environment values to report conferencing as configured', () => {
  const prior = Object.fromEntries(['LIVEKIT_URL','LIVEKIT_API_KEY','LIVEKIT_API_SECRET','KYNETRA_HOST_SECRET'].map(k => [k,process.env[k]]));
  for (const k of ['LIVEKIT_URL','LIVEKIT_API_KEY','LIVEKIT_API_SECRET','KYNETRA_HOST_SECRET']) delete process.env[k];
  assert.equal(isConfigured(),false);
  for (const k of ['LIVEKIT_URL','LIVEKIT_API_KEY','LIVEKIT_API_SECRET','KYNETRA_HOST_SECRET']) process.env[k] = 'test';
  assert.equal(isConfigured(),true);
  for (const [key,val] of Object.entries(prior)) { if (val===undefined) delete process.env[key]; else process.env[key]=val; }
});
