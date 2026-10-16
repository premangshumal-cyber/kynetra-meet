# Kynetra technical architecture

```
Browser (React + Vite)
  ├── Marketing + guest pre-join
  ├── Account sign-in / Dashboard ──── Supabase Auth + Postgres (RLS)
  ├── /api/rooms ── room service + host HMAC ── LiveKit SFU
  ├── /api/token ── signed 1-hour participant JWT ── LiveKit SFU
  └── /api/moderate ── host-grant verification ── LiveKit room service
                                     │
                      LiveKit media plane: SFU, TURN, WebRTC
                      media does not pass through Vercel
```

**Web app host:** Vercel, React 19, React Router 7, Vite. The `vercel.json` fallback must send `/api/*` to Vercel Functions before SPA rewrite. **User accounts:** Supabase email/password, RLS-owned `meetings` and `profiles`. **Conferencing:** self-hosted or managed LiveKit, separately provisioned. **Auth/API distinction:** Supabase authentication is required for the persistent workspace, while this version's guest meeting links intentionally remain anonymous and do not require a Supabase session. **Moderator credentials:** generated HMAC host key is bound to a cryptographically random meeting code, delivered to its creator, and stored only on that browser. Moving to account-tied ownership and invite policies is recommended for high-stakes use.

**Important:** The demo Jitsi provider is explicitly not a Kynetra-owned backend. LiveKit production credentials must be configured to complete the media-plane migration. The app never synthesizes a prerecorded meeting to hide connection failures.

**Endpoints:**

- `GET /api/health` – status and configuration disclosure (never keys).
- `POST /api/rooms` – create a new conferencing room and return a separate host key.
- `GET /api/rooms?room=...` – active room participant count.
- `POST /api/token` – server-signed LiveKit connection token with room-limited publishing/subscription, no moderator privileges.
- `POST /api/moderate` – host-key-gated removal/audio mute action; operators must add distributed abuse prevention.

**Privacy:** meetings are only as private as the configured provider's room authorization; a shareable room URL allows joining. Chat in LiveKit VideoConference is not persisted. The app stores recent public room IDs and creator host keys on the browser (localStorage). Follow secure host credential distribution rules and do not put moderator keys in public invite links.
