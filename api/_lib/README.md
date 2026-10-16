# Backend security and deployment

Server SDK credentials must never be published to Vite/React environment variables. Only VITE_* configuration is exposed to browsers. The host key is a bearer credential returned to the creator and held in localStorage on that creator's device; it is never embedded in the ordinary invitation URL. Distributing the key gives moderator privileges.

Anonymous creation is limited per IP in an in-memory map as *best effort*, not a distributed guarantee on serverless instances. Configure upstream Vercel Firewall rate limiting, CAPTCHA/turnstile, and durable session/auth service before widely opening registration. Meeting codes are cryptographically random and unguessable; they are **not** a substitute for authenticating invited participants. Public links must not be marketed as password protected.

Signed LiveKit webhooks are processed at /api/webhooks/livekit. No arbitrary secret is accepted in query strings; only the provider's signed Authorization token grants webhook access. Public APIs do not expose API keys, tokens for other rooms, or Supabase service-role credentials.
