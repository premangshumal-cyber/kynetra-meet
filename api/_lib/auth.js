import { createClient } from '@supabase/supabase-js';
import { send } from './core.js';

/**
 * Server-verified Supabase session. A browser-provided user id or JWT payload is
 * never trusted without requesting the verified user from Supabase Auth.
 */
export function extractBearer(header) {
  if (typeof header !== 'string') return null;
  const match = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(header.trim());
  return match && match[1].length <= 8192 ? match[1] : null;
}

export async function authenticatedUser(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !key) {
    send(res, 503, { error: 'Account authentication is not configured for meeting hosting.' });
    return null;
  }
  const token = extractBearer(req.headers.authorization);
  if (!token) {
    send(res, 401, { error: 'Sign in to your Kynetra account before hosting a meeting.' });
    return null;
  }
  try {
    const client = createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user || data.user.is_anonymous) {
      send(res, 401, { error: 'Your session is expired. Sign in again.' });
      return null;
    }
    return data.user;
  } catch {
    send(res, 503, { error: 'The authentication service is temporarily unavailable.' });
    return null;
  }
}
