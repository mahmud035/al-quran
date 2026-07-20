## 1. Server pure functions and tests

Coverage bitmap operations and streak arithmetic are pure functions with no database
or clock dependency, and they hold the two failure modes named in the design: a
silently wrong bitmap and an off-by-one-day streak. They are built and proven before
anything touches Mongo or Express.

These live in `progress.coverage.ts` and `progress.streak.ts` alongside the six
standard module files. That is an extension of the mandatory module pattern, taken
deliberately so the unit-test surface is isolated from service and DB code — flag it
if you would rather they fold into `progress.service.ts`.

- [x] 1.1 Add `vitest` as a dev dependency in `server/` and a `test` script, matching the setup already working in `client/`
- [x] 1.2 Create `server/src/modules/progress/progress.coverage.ts` with an empty-coverage constructor producing a 780-byte buffer (6236 bits, bit `n-1` for ayah `n`)
- [x] 1.3 Implement `setAyahs(buffer, ayahNumbers)` as a bitwise OR, returning new coverage
- [x] 1.4 Implement `countRead(buffer)` via popcount and `khatmahPercent(buffer)` over 6236
- [x] 1.5 Implement `coverageToRanges(buffer)` — the debugging and test helper that makes the opaque bitmap inspectable (design D2)
- [x] 1.6 Create `progress.coverage.test.ts` asserting the `reading-progress` coverage scenarios: non-contiguous reading, idempotent re-set, fixed size regardless of pattern, 3118 ayahs → 50 percent, empty → 0 percent
- [x] 1.7 Create `server/src/modules/progress/progress.streak.ts` with `localDay(instant, timezone)` using `Intl.DateTimeFormat('en-CA', { timeZone })`, returning `YYYY-MM-DD`
- [x] 1.8 Make `localDay` fall back to UTC when the zone is absent or throws `RangeError`, never throwing to the caller (design D5)
- [x] 1.9 Implement `nextDay(day)` by parsing the date-only value as UTC midnight, adding 24h, and reformatting — no wall-clock arithmetic anywhere
- [x] 1.10 Implement `applyActivity(state, day)` covering all four transitions in the design D6 table, including the `day < lastActiveDay` no-op
- [x] 1.11 Implement `displayStreak(state, today)` returning the stored streak when `lastActiveDay` is today or yesterday and 0 otherwise, without mutating state (design D7)
- [x] 1.12 Create `progress.streak.test.ts` asserting every scenario in `specs/reading-streak/spec.md`, including month and year boundaries, westward travel, DST days, and that a lapsed streak restarts at 1 rather than resuming

## 2. Server progress module

- [x] 2.1 Create `progress.interface.ts` with the document and state types, exporting the coverage buffer, streak fields, and last-read shape
- [x] 2.2 Create `progress.model.ts` — one document per user, unique index on `user`, coverage as Mongo `Binary`, streak fields, embedded last-read
- [x] 2.3 Create `progress.validation.ts` with Zod schemas: `ayahs` bounded to 1..6236 with a maximum array length, optional `timezone` string, and the last-read body
- [x] 2.4 Create `progress.service.ts` — `getProgress`, `recordAyahs`, `setLastRead`; all DB access lives here, JSDoc above each function
- [x] 2.5 Make `getProgress` treat an absent document as zero coverage, no streak, and no last-read, without creating a document
- [x] 2.6 Make `recordAyahs` upsert, OR the coverage, and apply the streak transition in one operation
- [x] 2.7 Make `getProgress` compute the display streak against the caller's timezone rather than returning the raw stored value
- [x] 2.8 Create `progress.controller.ts` — controller object only, no DB access, standard `{ statusCode, success, message, data }` envelope via `sendResponse`
- [x] 2.9 Create `progress.route.ts` — `router.use(auth)`, then `GET /`, `POST /ayahs`, `PUT /last-read`, wiring `validateRequest` where a body is accepted
- [x] 2.10 Register `app.use('/api/progress', progressRoutes)` in `server/src/app.ts` alongside the existing modules
- [x] 2.11 Verify every endpoint rejects unauthenticated requests as unauthorised

## 3. Gate A — server verified in isolation

No client work begins until this gate is green.

- [x] 3.1 `npm run build` clean in `server/`
- [x] 3.2 `npm run typecheck` clean in `server/`
- [x] 3.3 `npm test` passing in `server/` — coverage and streak suites
- [x] 3.4 Manual — `POST /api/progress/ayahs` records coverage; sending the same batch twice leaves coverage and percentage unchanged
- [x] 3.5 Manual — `GET /api/progress` on a user with no document returns zero coverage and no streak without creating one
- [x] 3.6 Manual — a request with an invalid timezone still records, bucketed to UTC
- [x] 3.7 Manual — an out-of-range ayah number and an oversized batch are both rejected with validation errors

## 4. Client progress feature

- [x] 4.1 Create `client/src/features/progress/` mirroring the backend domain, with types matching the API response so contract drift breaks at compile time
- [x] 4.2 Add `useProgress.ts` — TanStack Query hook fetching progress, passing the client's timezone from `Intl.DateTimeFormat().resolvedOptions().timeZone`
- [x] 4.3 Add `readingBuffer.ts` — a pending `Set` of global ayah numbers mirrored to local storage, with a size bound that drops oldest entries rather than blocking new ones
- [x] 4.4 Add `useRecordReading.ts` — flush on a 15-second interval while entries are pending, on `visibilitychange` to hidden, and on reader unmount
- [x] 4.5 Implement the `pagehide` flush with `navigator.sendBeacon` and a JSON `Blob`, relying on the auth cookie being sent automatically
- [x] 4.6 Recover and send any mirrored pending ayahs on app load, before accepting new ones
- [x] 4.7 Invalidate the progress query after a successful flush so streak and percentage stay current
- [x] 4.8 Make the whole recording path inert for unauthenticated users — no buffering, no mirror writes, no requests (design D10)
- [x] 4.9 Add dwell tracking to `SurahReader` on the existing `IntersectionObserver`: an ayah qualifies after 2 continuous seconds in the reading zone, with the timer cleared when it leaves
- [x] 4.10 Add `DWELL_MS` to `client/src/utils/constants.ts` as a single named constant, since it is the tuning point called out in the design risks

## 5. Client last-read migration

- [x] 5.1 Add an optional `updatedAt` epoch-millisecond field when writing the local last-read record
- [x] 5.2 Update the local validator so records without `updatedAt` stay valid and a non-numeric `updatedAt` is treated as absent rather than invalidating the record
- [x] 5.3 Add `useLastRead.ts` selecting the store by auth state: server for authenticated users, `lastRead.ts` for guests
- [x] 5.4 Route authenticated last-read writes through `PUT /api/progress/last-read`, swallowing failures so reading is never interrupted
- [x] 5.5 Implement sign-in reconciliation per design D8, choosing the more recent position and treating a missing local timestamp as older
- [x] 5.6 Clear the local last-read key once the position is server-owned, so exactly one source of truth exists per auth state
- [x] 5.7 On a failed authenticated fetch, offer no position rather than falling back to a local value that may belong to a previous guest session
- [x] 5.8 On sign-out, stop offering the previously authenticated user's position to the guest session
- [x] 5.9 Confirm `SurahReader`'s existing unmount write goes through the new auth-aware path rather than writing local storage directly

## 6. Client progress surfaces

- [ ] 6.1 Add a streak display to `HomePage` showing the display streak from the API, not a locally computed value
- [ ] 6.2 Add a khatmah progress display showing percentage read
- [ ] 6.3 Define loading, empty, and error states for both, using the existing `Skeleton` and `ErrorState` components
- [ ] 6.4 Show a signed-out state inviting an account rather than rendering zeroes or an error for guests
- [ ] 6.5 Verify the new surfaces use Tailwind semantic tokens and render correctly in light and dark themes

## 7. Gate B — full verification

- [ ] 7.1 `npm run build` clean in `client/` and `server/`
- [ ] 7.2 `npx tsc --noEmit` clean in `client/`; `npm run typecheck` clean in `server/`
- [ ] 7.3 `npm run lint` clean in `client/`
- [ ] 7.4 `npm test` passing in `client/` and `server/`, with Batch A's player and share suites still green
- [ ] 7.5 Manual — reading a surah records coverage and the percentage rises; scrolling quickly past ayahs does not credit them
- [ ] 7.6 Manual — listening with autoscroll credits ayahs on the same dwell path
- [ ] 7.7 Manual — a session's reads survive closing the tab mid-session and appear after reopening
- [ ] 7.8 Manual — streak shows 1 on first read, and a lapsed streak displays 0 before the next read rather than a stale value
- [ ] 7.9 Manual — a guest reading records nothing and issues no progress requests
- [ ] 7.10 Manual — a guest with a local last-read position signs in and the newer position wins; the local key is cleared
- [ ] 7.11 Manual — last-read agrees across two browsers signed in as the same user
- [ ] 7.12 Manual — regression: reading, playback, repeat, speed, search, bookmarks, and settings sync all behave as before
