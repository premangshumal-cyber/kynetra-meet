# Kynetra

**Kynetra** is a responsive video-meeting web application featuring a premium landing page, shareable meeting rooms, a camera/microphone pre-join screen, and real video conferences through Jitsi's iframe API.

## Features

- Instantly create a cryptographically random meeting ID and share the link.
- Join with a room ID or invitation link.
- Preview and choose camera/microphone before entering the room.
- Join with a display name, which is stored **only in your browser**.
- In-call video, audio, screen sharing, text chat and participant controls provided by Jitsi Meet.
- Copy room invitations and quickly rejoin recently visited rooms (browser-local only).
- Responsive design and accessible form/button labels.
- SPA routing configured for Vercel.

## Quick start

Requirements: Node.js 20.19+ or 22.12+.

```bash
npm install
cp .env.example .env
npm run dev
```

Visit the local URL shown by Vite, usually `http://localhost:5173`.

To compile:

```bash
npm run build
npm run preview
```

## Deploy to Vercel

1. Import this GitHub repository into a Vercel project.
2. Framework: **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. Add `VITE_JITSI_DOMAIN` in Vercel's environment settings.
4. Deploy. Direct links to `/meet/<room-id>` work using `vercel.json`.

## IMPORTANT: Demo conferencing vs production

**This first release is a functional Jitsi-powered prototype, not a stand-alone video-conferencing backend.** It defaults to `meet.jit.si` only to let you test a video meeting without provisioning servers. [Jitsi states](https://jitsi.org/api/) that the public `meet.jit.si` service is **not intended for production application integrations**. Hosts may be required to log in to Jitsi; capacity, uptime, UI and policies are controlled by Jitsi. Kynetra does **not** provide its own sign-in, stored recordings, calendar synchronization, invite-email delivery, dedicated signaling infrastructure, host account roles or contractual SLA.

Before public production use, provision your own Jitsi Meet deployment (or an appropriate commercial service), set `VITE_JITSI_DOMAIN=your.meet.hostname`, and test it with multiple participants and devices. For scalable professional hosting, evaluate appropriate bandwidth/capacity, STUN/TURN, monitoring, rate limits, abuse prevention, TLS and privacy policies. Jitsi may support additional security settings when correctly configured.

The Kynetra invitation URL is not an access-control boundary. Treat links as shareable and configure waiting room/moderation/password policies in your conferencing provider when required. The camera and microphone preview uses local `getUserMedia`; it releases these local preview tracks before the iframe joins. Your browser will ask permission before using media.

## Structure

- `src/App.jsx` — site pages, invitation links, pre-join preview, Jitsi integration.
- `src/styles.css` — responsive layout and visual design.
- `src/main.jsx` — React entry point.
- `vercel.json` — Vite output and client-side routing fallback.

## License / services

Source code can be customized by the repository owner. Video calling runs on the chosen **external** Jitsi service and remains subject to that service's terms. This project is not affiliated with Google Meet, Zoom, or Jitsi.
