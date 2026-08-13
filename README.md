# ImageShield Web

The quiz funnel and landing pages. Mobile browser first — most visitors arrive on a
phone, so every screen is designed for a thumb and a flaky connection.

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Plus Jakarta Sans

## Running it

```bash
cp .env.example .env.local   # then fill in BACKEND_URL
npm run dev
```

## How it's put together

```
src/
  app/          route per funnel screen
  components/   Screen shell + primitives
  lib/
    funnel.ts         step order — the single source of truth for what follows what
    funnel-state.ts   answers + phone, persisted to sessionStorage
    api.ts            server-only gateway to the existing backend
```

Three conventions worth keeping, because they're what make design churn cheap:

**Tokens live in `src/app/globals.css`.** Colours, spacing, and the content column are
defined once in the `@theme` block, mirrored from the mobile app. A redesign should be
edits to those values — components shouldn't carry hardcoded hexes or pixel sizes.

**Step order lives in `src/lib/funnel.ts`.** Screens ask `nextPath()` where to go. When
the designer moves the phone step after the quiz, that's one array edit, not a hunt
through every `router.push`.

**Answers save on change, not on submit.** Mobile browsers kill background tabs; a user
who takes a call mid-quiz has to come back to their answers still there. See
`funnel-state.ts`.

## Talking to the backend

The browser never calls the API directly. Route handlers under `src/app/api/` use
`backendFetch()` to reach the existing server (`~/Desktop/ImageShieldPhotoShare/server`),
so OTP rate limiting and abuse policy stay server-side where they can't be bypassed.

## Still open

- Quiz-submit and score endpoints — confirm what already exists from the earlier funnel.
- Real App Store URL (`.env.example` has a placeholder).
- Universal link / App Links setup so "Open the app" works on an installed device.
  The QR-code handoff from the old design doesn't apply here: nobody scans a QR with
  the phone that's already showing it.
