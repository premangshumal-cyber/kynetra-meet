import { isRoom } from './core.js';

export function validateMeetingDetails(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Invalid meeting details.' };
  const title = typeof body.title === 'string' ? body.title.trim() : 'Instant meeting';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!title || title.length > 120 || description.length > 500) return { error: 'Title or description is too long.' };
  if (body.scheduledAt !== undefined && body.scheduledAt !== null && body.scheduledAt !== '') {
    if (typeof body.scheduledAt !== 'string') return { error: 'Invalid scheduled date.' };
    const parsed = Date.parse(body.scheduledAt);
    if (!Number.isFinite(parsed) || parsed < Date.now() - 60000 || parsed > Date.now() + 366 * 86400000) {
      return { error: 'Choose a future date within one year.' };
    }
    return { title, description, scheduled_at: new Date(parsed).toISOString() };
  }
  return { title, description, scheduled_at: null };
}

export function isUuid(value) {
  return typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
}
