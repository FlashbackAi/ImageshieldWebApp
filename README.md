# ImageShield Web

The quiz funnel and landing pages. Mobile browser first — most visitors arrive on a
phone, so every screen is designed for a thumb and a flaky connection.

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Plus Jakarta Sans

## Running it

```bash
cp .env.example .env.local   # then fill in IMAGESHIELD_API_URL and FUNNEL_SECRET
npm run dev
```

### Without the API

```bash
npm run dev:offline          # next dev + a stand-in /v1 on :5099
```

Runs the app against `tools/dev-api/`, which implements the contract faithfully — the
quiz definition behind auth included — so the whole funnel walks. The OTP code is
`123456`. It is also the only way to reach the states a real backend won't produce to
order: a score that isn't ready, a write that fails once, an access token about to
expire. See the knobs at the top of `tools/dev-api/server.mjs`.

## How it's put together

```
src/
  app/          route per funnel screen
  components/   Screen shell + primitives
  lib/
    funnel.ts         step order — the single source of truth for what follows what
    funnel-state.ts   answers + quiz version, persisted to sessionStorage
    session.ts        the /v1 token pair, and the cookies either side of sign-in
    quiz.ts           the shapes of a server-defined quiz, and answer validation
    score.ts          how a served score is presented — no thresholds of its own
    v1/               server-only client for the /v1 API
    quiz-submit.ts    posting the answers, shared by the two screens that do it
tools/
  dev-api/      a stand-in /v1, for `npm run dev:offline`. Never imported by src/
```

Three conventions worth keeping, because they're what make design churn cheap:

**Tokens live in `src/app/globals.css`.** Colours, spacing, and the content column are
defined once in the `@theme` block, mirrored from the mobile app. A redesign should be
edits to those values — components shouldn't carry hardcoded hexes or pixel sizes.

**Step order lives in `src/lib/funnel.ts`.** Screens ask `nextPath()` where to go, so
moving a step is one array edit rather than a hunt through every `router.push`. It has
already earned that: the questions used to come before the phone number and now come
after it.

The order is not only a design preference. `GET /v1/quiz` is answered only to a
session, so the questions have to sit behind sign-in — the funnel renders the
definition the server is serving rather than a copy of its own, and answers to a
made-up quiz are rejected at submit. Which is why the shape is:

```
landing → quiz (intro, marketing copy) → details → otp → quiz/questions → calculating → score
                                          ^ phone verified here    ^ read + answered   ^ written
```

**Answers save on change, not on submit.** Mobile browsers kill background tabs; a user
who takes a call mid-quiz has to come back to their answers still there. See
`funnel-state.ts`.

## Talking to the API

The browser never calls the API directly. Route handlers under `src/app/api/` go
through `src/lib/v1/`, so the tokens, the OTP send policy and the abuse rules stay on
this side where they can't be bypassed.

**The session is the identity.** No /v1 route accepts an account id, person id or
phone number to decide whose data it touches — that always comes from the bearer
token. So the funnel holds a phone number only until the code is verified, and after
that reads the person from `GET /v1/me`. Anything that wants to know "whose score is
this?" is asking the wrong question; there is only ever the caller's.

**The quiz is data.** `POST /v1/quiz/responses` validates both the answer keys and the
answer values against whatever `GET /v1/quiz` served, so the questions are rendered
from the definition and the answers carry the `quiz_version` they were given against.
Nothing in `src/` may hardcode a question — that is what the /v1 migration removed.

**Errors are a code, not a message.** Every failure is `{ error, message, retry_after? }`.
Branch on `error`; the message is for people and gets shown to them where its wording
beats ours.

Two things worth knowing before changing this layer:

- **Refresh tokens rotate**, so the new pair has to be written to a cookie — and a
  server component's render cannot set one. Renders use `readAsUser`, which reports a
  spent token as `stale` rather than refreshing; the browser then posts to
  `/api/session/refresh` and the page re-renders. Route handlers use `callAsUser`,
  which refreshes inline because they can persist the result.
- **Nothing is cached.** Every /v1 response is either a write or answered for whoever
  the bearer token belongs to, the quiz definition included — it is the same bytes for
  everyone but is fetched with an Authorization header, and a cache entry keyed loosely
  enough to be shared would be one visitor's authenticated response served to another.
  The transport has no opt-out.

## Still open

- **Conversion cost of asking for the phone number before the questions.** The order is
  forced by `GET /v1/quiz` needing a session. If the API ever serves the definition
  anonymously, the questions can move back in front of the form — one array edit in
  `funnel.ts`, plus moving the submit back off `/calculating`.
- Real App Store URL (`.env.example` has a placeholder).
- Universal link / App Links setup so "Open the app" works on an installed device.
  The QR-code handoff from the old design doesn't apply here: nobody scans a QR with
  the phone that's already showing it.
