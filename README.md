# Kynetra — Online Meetings

Kynetra is a responsive, full-stack video conferencing project.

**Live website:** https://kynetra-meet.vercel.app

## Status

The frontend is deployed. Demo calls are available through public Jitsi Meet. The server-side LiveKit conferencing integration and Supabase-backed account workspace are included in this repository. Account hosting and scheduling are enabled when the linked project URL and publishable key are configured. Independent LiveKit conferencing remains inactive until the media service is provisioned. The public Jitsi service is not intended for production embedding.

## Features

- Responsive Kynetra homepage and meeting launch/join flows
- Camera and microphone preview; device selection
- Video meetings, screen sharing and chat through the chosen provider
- Dedicated LiveKit video room component and API routes for creating rooms, issuing signed participant tokens, and authorized host removal/muting
- Auth page for email/password sign-in, signup and password recovery
- Account-verified room creation and server-owned meeting records; cancellation prevents issuing fresh access tokens
- Meeting organizer dashboard with scheduled meeting CRUD
- Supabase database schema with row-level security for profiles and meetings
- Verified LiveKit webhooks for meeting status updates
- GitHub Actions tests and Vercel deployment configuration

## Start locally

Requires Node.js 22+.

```bash
npm install
cp .env.example .env
npm run check
npm run dev
npm run build
```

## Deployment

Read the [LiveKit activation checklist](docs/LIVEKIT_SETUP.md) and [DEPLOYMENT.md](docs/DEPLOYMENT.md) for instructions to configure a LiveKit server, Supabase Auth/PostgreSQL, environment variables, webhook signatures, security protection and external infrastructure. Read [ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system design.

Server-side secrets must **never** have the `VITE_` prefix. Supabase Auth and meeting scheduling use row-level security and support a publishable-key-only server integration. A server-only Supabase secret key (or legacy service_role key) is still needed for server-side guest meeting cancellation checks and LiveKit event persistence. Switching `VITE_MEETING_ENGINE=livekit` without valid dedicated video credentials will produce explicit API errors.

## Boundaries

This is not yet a tested commercial Google Meet/Zoom replacement. Dedicated media hosting and TURN, robust distributed abuse prevention, capacity/load tests, monitoring, recording storage, transcription, enterprise identity, waiting rooms, durable chat and accessibility/regulatory audits still require implementation or configuration. Do not use the Jitsi demo integration as the production media provider.
