import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key
  ? createClient(url, key, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
    })
  : null;

export function makeMeetingCode() {
  const data = new Uint8Array(16);
  crypto.getRandomValues(data);
  return 'kyn-' + Array.from(data, n => n.toString(16).padStart(2, '0')).join('');
}
export async function meetingRequest(method, body) {
  if (!supabase) throw new Error('Connect account services before hosting meetings.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in to your account before hosting meetings.');
  const response = await fetch('/api/meetings', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Meeting request failed.');
  return result;
}
export async function createMeetingRoom({ title = 'Instant meeting', description = '', scheduledAt = null } = {}) {
  const result = await meetingRequest('POST', { title, description, scheduledAt });
  if (result.hostKey) {
    try { localStorage.setItem('kynetra-host:' + result.room, result.hostKey); } catch {}
  }
  return result;
}
