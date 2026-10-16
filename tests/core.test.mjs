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

test('bearer parsing rejects malformed authorization headers', async () => {
  const { extractBearer } = await import('../api/_lib/auth.js');
  assert.equal(extractBearer('Bearer sample.eyJhbGciOiJIUzI1NiJ9.signature'), 'sample.eyJhbGciOiJIUzI1NiJ9.signature');
  for (const text of ['Basic abc', 'Bearer', 'Bearer a b', 'Bearer !@#', null, '']) {
    assert.equal(extractBearer(text), null);
  }
});

test('meeting validation accepts constrained details without trusting arbitrary fields', async () => {
  const { validateMeetingDetails, isUuid } = await import('../api/_lib/validation.js');
  const details = validateMeetingDetails({ title: 'Team call', description: 'Weekly update', owner_id: 'forged-id' });
  assert.deepEqual(details, { title: 'Team call', description: 'Weekly update', scheduled_at: null });
  assert.equal(validateMeetingDetails({ title: ' '.repeat(10) }).error, 'Title or description is too long.');
  assert.ok(validateMeetingDetails({ title: 'x'.repeat(121) }).error);
  assert.ok(validateMeetingDetails({ title: 'Meeting', scheduledAt: '2000-01-01T00:00:00Z' }).error);
  assert.equal(isUuid('a6f2cb7c-1419-451d-a0de-f4930279e4b0'), true);
  assert.equal(isUuid('foo'), false);
});
