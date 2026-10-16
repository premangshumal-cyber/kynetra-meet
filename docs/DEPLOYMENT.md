# Kynetra — launch checklist

This project has two deployment modes. **Demo** works on Vercel with no secrets and uses public `meet.jit.si` (not licensed for production app embedding). **Dedicated** mode uses a LiveKit server and server-side minting of short-lived access tokens.

## 1. Dedicated LiveKit conferencing (required for serious deployment)

Create a LiveKit Cloud project or self-host the [LiveKit server](https://docs.livekit.io/home/self-hosting/). Provide reliable UDP reachability, TURN/TLS, load balancing, monitoring, network bandwidth and geographic routing. Video meetings **do not** run on the Vercel serverless backend; LiveKit runs independently as an SFU. Vercel hosts the web frontend, authentication APIs, token issuing, room and moderation APIs.

On Vercel → Project → Settings → Environment Variables set these values:

| Variable | Browser exposed? | Description |
| --- | --- | --- |
| `VITE_MEETING_ENGINE` | yes | `livekit` after the other values are ready |
| `LIVEKIT_URL` | no | wss URL of your LiveKit instance |
| `LIVEKIT_API_KEY` | no | API key from LiveKit |
| `LIVEKIT_API_SECRET` | no | API secret |
| `KYNETRA_HOST_SECRET` | no | Random >=32 byte signing secret kept on server |

Set all variables for Production, redeploy, then check `/api/health` reports `livekit-configured`. **Never** prefix secrets with `VITE_`. Test different participant browsers with separate devices and networks. Browser media capture requires HTTPS.

## 2. Persistent accounts and scheduled meetings

Provision a Supabase project. Run `supabase/schema.sql` in the SQL editor once (review it first), enable email authentication and configure SMTP, mail templates, signup/confirmation and password reset URL allowlists. Supply **public** Supabase project URL and anon key:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Every organizer-facing meeting mutation (creating and cancelling) is executed through `/api/meetings` with a validated Supabase access token. Users can only read their own meetings through RLS; clients cannot write meeting rows directly.

To create a dedicated LiveKit meeting, hosts must be signed in. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (the latter is safe to expose as a key, but keep server configuration separate). The host creation endpoint verifies the user's signed session with Supabase Auth; guest invitation recipients may still join without an account.

The Kynetra backend can access the database using verified users' own JWTs and Supabase RLS. This supports sign-in and meeting scheduling without the service-role key. Configure `SUPABASE_SERVICE_ROLE_KEY` securely before enabling dedicated LiveKit guest token issuance and webhook-driven status updates.

For server features/webhooks, configure **private** `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (or the legacy `SUPABASE_ANON_KEY`), and `SUPABASE_SERVICE_ROLE_KEY` (do not put this in React or public repositories). Accounts and meeting schedules are protected by Row Level Security. Apply migrations to a staging project before using production data.

Without Supabase, homepage/demo meetings still work; account and scheduling functionality intentionally shows a configuration message rather than storing fake records.

## 3. Security obligations before public launch

1. Restrict anonymous room creation with *distributed* edge rate limits, CAPTCHA or authentication; the example best-effort per-instance map is not enough on serverless.
2. Configure email verification, password policies, optional MFA, bot and spam mitigation. Use HTTPS everywhere.
3. Decide on your attendee authorization and waiting-room policy. A random meeting link is a bearer invitation, **not** end-to-end participant authentication.
4. Put LiveKit API secret, service-role key, and host signing key in server-only secret storage; rotate regularly.
5. Set backups, row retention, audit logging, incident handling, a privacy policy and an acceptable-use policy.
6. Set LiveKit media traffic limits/cost alerts, metrics, alerts and SLOs. The included UI supports live video/audio, screen share and *ephemeral* in-meeting chat; it does not automatically record or store chat messages.
7. For recording, add a separately configured LiveKit Egress worker, recordings bucket, permissions and explicit consent before advertising it.
8. Conduct integration tests (2 users, 3+ users, mobile browsers), media permission denial, host moderation, reconnect, network changes, accessibility and load tests.

## 4. Testing

```bash
npm install
npm run check
npm run build
```

`npm run check` runs local Node unit tests of core IDs/host grants. `npm run build` runs the Vite production bundle. Automated CI can additionally run Playwright multi-browser tests with test conferencing credentials.

## 5. Migration from existing demo

You can operate the demo without an account. To move to LiveKit, add server environment variables and switch `VITE_MEETING_ENGINE=livekit`. New rooms in dedicated mode use server-side cryptographic room IDs and a separate host key; meeting links are stable, but LiveKit room instances may expire and be recreated. Anyone with an old 16-hex-character Kynetra meeting link can still join, without host privileges. Existing Jitsi chat/attendees/room state does not transfer to LiveKit.

## What is NOT yet provided

A managed LiveKit/SFU/TURN cluster, guaranteed participant capacity/SLA, native mobile apps, telephony, billing, compliance certification, SSO enterprise provisioning, durable chat messages, stored recordings/transcription, file sharing, invitation emails, or legally reviewed policies. These require separate services and work, not merely web UI screens.
