## Why

Nothing in the app brings a user back tomorrow. Batch A made a reading session better
once you are in it — repeat drills, speed, verse search — but the app still has no
memory of what you have read, no sense of progress toward finishing the Quran, and no
reason to open it on a day you were not already planning to. The retention loop is the
one structural gap left against comparable apps.

Last-read position is also still browser-local. A user who reads on their phone and
opens their laptop starts over, which quietly contradicts the account they created for
exactly that reason.

## What Changes

- **New `progress` backend module** — the first server module added since the original
  build, following the mandatory feature-module pattern. Owns recorded reading
  coverage, streak state, and the synced last-read position.
- **Ayah-read recording** — an ayah is recorded as read once it holds the reading zone
  for a dwell interval, reusing the `IntersectionObserver` already in `SurahReader`.
  No new user action and no new reading UI. Recording is batched, not one request per
  ayah.
- **Per-ayah coverage** — read ayahs are stored as a coverage set over the 6236 global
  ayah numbers, merged into ranges. This survives real reading behaviour: jumping
  between surahs, re-reading Al-Kahf on a Friday, starting mid-juz.
- **Khatmah progress** — percentage of the Quran read, derived from coverage and
  displayed to the user. Read-only in this change; no configurable plan yet.
- **Daily streak** — consecutive days with at least one recorded ayah. Days are
  bucketed by the **client's IANA timezone**, sent with each write, so an evening
  session counts for that evening's local date rather than rolling over at UTC
  midnight.
- **Last-read position syncs to the server** for authenticated users, replacing
  local storage as the source of truth. Guests keep working exactly as they do today
  on local storage.

Deferred to a later change: configurable daily goals, plan scheduling, and catch-up
when behind. Goal semantics are worth designing against real coverage data rather
than ahead of it.

No breaking changes. Every new endpoint is additive, and unauthenticated reading and
listening remain fully functional.

## Capabilities

### New Capabilities

- `reading-progress`: recording ayahs as read — the dwell signal that qualifies an
  ayah, batching and retry of writes, the coverage-set representation and its merge
  behaviour, idempotence when the same ayah is recorded twice, khatmah percentage
  derivation, and what an unauthenticated user gets instead.
- `reading-streak`: streak semantics — what constitutes an active day, timezone-based
  day bucketing from a client-supplied IANA zone, how a streak extends, holds, and
  breaks, behaviour across travel between zones and DST transitions, and the handling
  of an absent or invalid timezone.

### Modified Capabilities

- `last-read-persistence`: currently specifies local storage as the sole store. The
  requirements change so that the position is server-owned for authenticated users
  and local-storage-owned for guests, including which side wins when a guest who has
  a local position signs in, and how retrieval degrades when the server is
  unreachable. The existing validation requirements for malformed stored data remain
  in force for the guest path.

## Impact

**Server** — new module `server/src/modules/progress/` with the full pattern
(`route`, `controller`, `service`, `validation`, `model`, `interface`). New
collection storing per-user coverage ranges, streak state, and last-read position.
New authenticated endpoints under `/api/progress`, all using the standard
`{ statusCode, success, message, data }` envelope and Zod validation via
`validateRequest`.

**Client** — new feature module `client/src/features/progress/` mirroring the backend
domain 1:1, with TanStack Query owning all progress server state. `SurahReader` gains
dwell-based recording on the existing observer. `client/src/utils/lastRead.ts` becomes
the guest-only path behind a provider that selects storage by auth state.
`HomePage` surfaces streak and khatmah progress.

**Dependency on auth** — progress is inherently cross-device and requires an account.
Guests get last-read via local storage as today, and no streak or coverage. This
matches how bookmarks already behave and needs no new auth work.

**Risk concentrated in write volume and correctness of day bucketing** — a scroll-driven
signal can generate far more writes than a user action would, and timezone-bucketed
streaks are a well-known source of off-by-one-day bugs. Both are design concerns for
`design.md`.

**Verification gate:** `npm run build` and `npx tsc --noEmit` clean in both `client/`
and `server/`; reducer-style unit tests for coverage merging and day bucketing, which
are pure functions; and manual scenarios covering a streak extending across a real day
boundary, coverage surviving a re-read, guest-to-authenticated sign-in, and last-read
agreeing across two browsers.
