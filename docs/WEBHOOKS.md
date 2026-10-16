# Verified event ingestion

After connecting a dedicated LiveKit deployment and Supabase, configure a webhook in your LiveKit settings at:

`https://kynetra-meet.vercel.app/api/webhooks/livekit`

Enable at minimum `room_started` and `room_finished`. LiveKit sends `application/webhook+json` with a signed authorization token. The Vercel function reads the **raw** body and calls the LiveKit SDK WebhookReceiver; unsigned/tampered requests are rejected.

For a stored meeting, a room start changes `scheduled` to `active` and a room finish changes `scheduled` or `active` to `completed`. A `cancelled` meeting is never reactivated by this handler. Only the service role key accesses the database; it remains server-side.

Webhooks can be delayed, duplicated or lost. This mechanism is idempotent by meeting status but is **not** yet a reliable event-sourced audit log. Implement periodic reconciliation and delivery observability for production analytics.
