# Activate Kynetra's dedicated LiveKit conferencing

**Current state:** Kynetra uses public Jitsi only as a demo. Its Supabase database and frontend are connected, but dedicated video meetings will not work until LiveKit Cloud credentials and a Supabase server secret are configured. The host signing secret `KYNETRA_HOST_SECRET` is already stored privately in Vercel.

## 1. Configure your LiveKit project

1. Open [LiveKit Cloud](https://cloud.livekit.io/project) and sign in.
2. Create or choose the project intended for Kynetra.
3. Open **Settings → Keys**, generate a project API key and its corresponding API secret.
4. Locate the project **WebSocket URL** (usually `wss://<your-project>.livekit.cloud`). Use your actual project URL, not this placeholder.

## 2. Enter private credentials directly in Vercel

In the existing **kynetra-meet** Vercel project, go to **Settings → Environment Variables** and configure:

| Key | Value | Security |
| --- | --- | --- |
| `LIVEKIT_URL` | LiveKit Cloud WebSocket URL (wss://...) | Server-only |
| `LIVEKIT_API_KEY` | Matching LiveKit API key | Server-only |
| `LIVEKIT_API_SECRET` | Matching LiveKit API secret | Encrypted, server-only |
| `SUPABASE_SECRET_KEY` | Supabase Settings → API Keys → secret key (`sb_secret_...`) | Encrypted, server-only |
| `VITE_MEETING_ENGINE` | `livekit` | Public build flag |

Keep `KYNETRA_HOST_SECRET` as configured. It is already set in Vercel.

Add all variables to **Production**, and Preview too if you need preview environments. Only `VITE_MEETING_ENGINE` may use the `VITE_` prefix. Do **not** post API secrets into chat, place them in GitHub source code, or expose them in browser-side variables.

If the newest Supabase secret key cannot be created, Kynetra also accepts a legacy `SUPABASE_SERVICE_ROLE_KEY`, but new secret keys are preferred.

**Important:** Add and verify the private credentials *before* setting `VITE_MEETING_ENGINE=livekit`; otherwise the site will lose its working Jitsi demo mode without being able to join LiveKit.

## 3. Deploy and validate

Redeploy Kynetra **after** saving environment values so that Vite gets the new build flag and serverless functions receive the credentials.

Visit `https://kynetra-meet.vercel.app/api/health`. Expect `conferencing: "livekit-configured"`, `authentication: "configured"`, `persistence: "configured"`, and `productionReady: true`.

These values only indicate configuration is present; they do not prove keys or media routing work. For an end-to-end test:

1. Sign up or sign in on Kynetra, confirm email if required, then start a new meeting.
2. Open the invitation link in a second browser/device and join with a different display name.
3. Check two-way video, audio, microphone/camera toggles, screen share, chat, and host removal.
4. Test disconnect/reconnect, denied media permission, cancellation, and mobile network switching.
5. Verify that a cancelled meeting cannot mint a new participant token.

## 4. Configure LiveKit webhooks

After conferencing works, in LiveKit Cloud **Settings → Webhooks → Create new webhook**, set:

- **URL:** `https://kynetra-meet.vercel.app/api/webhooks/livekit`
- **Signing API key:** The exact key in Vercel as `LIVEKIT_API_KEY`
- Events: `room_started` and `room_finished`

Use the dashboard's **Send a test event** action, then verify the webhook delivery result. Kynetra requires the signed raw `application/webhook+json` payload and does not trust unauthenticated requests.

## 5. Before inviting the public

The project needs additional operational hardening: distributed API rate limits, usage quotas and spending alerts, password/lobby policies, media load testing, abuse controls, monitoring, backups, privacy documentation and an on-call response process. The demo provider is not a substitute for a production LiveKit deployment.

Official references: [LiveKit Server SDK](https://docs.livekit.io/reference/server-sdk-js/), [LiveKit webhooks](https://docs.livekit.io/intro/basics/rooms-participants-tracks/webhooks-events/), [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).
