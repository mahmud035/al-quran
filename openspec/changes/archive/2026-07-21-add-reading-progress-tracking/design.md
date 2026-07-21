## Context

This is the first change to add a server module since the original build. The client
already has everything needed to detect reading: `SurahReader` runs an
`IntersectionObserver` with `rootMargin: '-20% 0px -70% 0px'` that tracks the ayah in
the reading zone, and writes a last-read position to local storage on unmount.

Four properties of the problem shape the design:

1. **The read signal is high-frequency.** Reading Al-Baqara passes 286 ayahs. A naive
   write-per-ayah would issue hundreds of requests per session against endpoints that
   exist to record a boolean.
2. **Reading is not linear.** The coverage model was chosen precisely because people
   jump surahs, re-read Al-Kahf on Fridays, and start mid-juz. Any representation
   optimised for sequential reading will degrade on the real access pattern.
3. **Days are a client concept, not a server one.** Verified on the target runtime:
   at the same instant, `Asia/Dhaka` reads `2026-07-20` while `Pacific/Auckland` reads
   `2026-07-21`. Bucketing by UTC would assign an Auckland evening session to the
   previous day and a Dhaka evening session to the wrong day for six hours of every
   day.
4. **Guests must keep working.** Unauthenticated reading and listening are fully
   functional today, and last-read works via local storage. That cannot regress.

Runtime facts confirmed on Node v24: full ICU is present, `Intl.DateTimeFormat` with
locale `en-CA` returns `YYYY-MM-DD` directly, and an invalid IANA zone throws
`RangeError`. Day bucketing therefore needs no date library.

## Goals / Non-Goals

**Goals:**

- Record reading with no new user action and no visible change to the reading flow.
- A coverage representation whose size does not depend on how erratically the user reads.
- Streak arithmetic that is a pure function of date-only values, testable without clocks.
- Bounded write volume, with unflushed reads surviving a tab close or a failed request.
- Guests unaffected; authenticated users get cross-device continuity.

**Non-Goals:**

- Configurable daily goals, plan scheduling, catch-up. Deferred by the proposal.
- Per-ayah read *timestamps* or reading history. Only current coverage is stored.
- Retroactive backfill. Users start at zero coverage; nothing infers past reading.
- Defending against a user inflating their own streak. See Risks.

## Decisions

### D1 — One document per user, one collection

A single `UserProgress` document per user holds coverage, streak state, and last-read
position, with a unique index on `user`. All three are read together on app load and
written by the same small set of actions.

*Alternative considered:* separate collections per concern, or extending the existing
`UserSettings` document. Rejected — separate collections mean three round trips for
one dashboard; `UserSettings` is preference data with a different write pattern and
lifetime, and merging them would couple a hot write path to settings sync.

### D2 — Coverage as a fixed 6236-bit bitmap

Coverage is a `Buffer` of 780 bytes (6236 bits, one per global ayah number, bit `n-1`
for ayah `n`), stored as Mongo `Binary`.

| | bitmap | merged ranges |
|---|---|---|
| size, linear reading | 780 B | tiny |
| size, erratic reading | 780 B | up to ~3118 entries |
| set an ayah | `byte \|= mask` | insert + merge neighbours |
| union a batch | bitwise OR | repeated merge |
| idempotence | inherent | requires care |
| percentage | popcount | sum of spans |
| inspectable in a DB GUI | no | yes |

Ranges are readable in Compass; that is their only advantage here, and it is bought
with merge logic that has real edge cases (overlap, adjacency, insertion order) on the
exact access pattern — erratic reading — that this feature exists to support. The
bitmap makes every operation a bitwise primitive that cannot be subtly wrong, and its
size is constant regardless of behaviour.

To offset the opacity, the service exposes a `coverageToRanges()` helper used by tests
and available for debugging. Recording is naturally idempotent: OR-ing a set bit is a
no-op, so retries and duplicate sends need no deduplication anywhere.

### D2a — Coverage writes are guarded by an optimistic-concurrency `rev`

The bitmap's one operational cost falls on the write path. Mongo has no bitwise
operator over `Binary`, so the OR cannot happen in the database — the service must
read the document, OR the batch in application code, and write it back. Two flushes
overlapping (the same user reading on two devices, which D8 explicitly supports) would
each read the same coverage and the later write would clobber the earlier one's bits.
Unlike a dropped network flush, this loss is permanent: coverage is only re-credited
if the user reads those exact ayahs again.

The document therefore carries a `rev` integer, bumped on every coverage write. The
update applies only when `rev` still matches what was read; a losing writer re-reads
and reapplies its batch on top of the winner's coverage, with jittered backoff so
simultaneous losers do not collide again in lockstep. This is optimistic concurrency,
chosen over a transaction (cheaper, and the retry is bounded) and over Mongoose's
built-in `optimisticConcurrency` (an explicit field is visible in the document and
obvious in the query). A missing `rev` is matched as `0`, so documents written before
the field existed are not stranded.

### D3 — Client buffers reads, flushes on a schedule and on exit

The client accumulates qualifying ayah numbers in an in-memory `Set` and flushes:

- every 15 seconds while ayahs are pending,
- on `visibilitychange` to hidden,
- on unmount of the reader,
- on `pagehide`.

The exit flush uses `navigator.sendBeacon` with a JSON `Blob`. Auth is an HTTP-only
cookie, which `sendBeacon` sends automatically, so no header work is needed — this is
the reason it works here where it often does not.

The pending set is mirrored into local storage so a failed or interrupted flush is
retried on next load rather than lost. The mirror is capped; on overflow the oldest
entries are dropped in favour of continuing to accept new ones, since losing some
coverage is strictly better than stalling recording.

*Alternative considered:* write-per-ayah with server-side debounce. Rejected — it
moves the same volume onto the network and makes the mobile case worse.

### D3a — The buffer is drained only on confirmed delivery

The mirror's "retried on next load rather than lost" guarantee holds only if an ayah
is never removed from the buffer before the server confirms it. The first
implementation broke this on both flush paths, and both were corrected after the
initial build:

- **Exit flush (`sendBeacon`).** `sendBeacon` reports only that the browser *queued*
  the request, never that the server accepted it. Consuming the buffer on send meant a
  beacon the browser dropped, or one the server rejected with a `409` after the D2a
  retry budget was exhausted, was gone from the mirror too. The exit flush now sends
  *without consuming*; a later confirmed flush drains what actually landed.
- **Scheduled flush (`fetch`).** A normal `fetch` has no `keepalive`, so an in-flight
  flush is cancelled if the tab closes mid-request, and its failure handler is not
  guaranteed to run during teardown. Draining the buffer up front therefore lost the
  batch — and, having drained it, left the `pagehide` beacon with nothing to re-send.

Both now follow one rule: **snapshot with a non-consuming read, and remove only the
batch the server confirms** (removing exactly that batch, so ayahs that qualify while a
request is in flight are kept). A cancelled, dropped, or rejected flush removes
nothing, so the still-pending beacon, the mirror's next-load recovery, and the request
itself become three independent backstops rather than one fragile path. Idempotent
recording (D2) makes the resulting duplicate deliveries free.

### D4 — An ayah qualifies after 2 seconds in the reading zone

The existing observer already identifies the ayah in the reading zone. Recording adds
a dwell timer: an ayah qualifies once it has held that zone continuously for 2 seconds.
Scrolling past does not qualify it.

Audio playback auto-scrolls the active ayah into that same zone, so listening
qualifies ayahs on the same path with no separate signal. That is intended — the user
chose "dwell", and a listened ayah is read for these purposes.

### D5 — Day bucketing from a client-supplied IANA zone

Every recording request carries an IANA `timezone`. The server computes the local
calendar day as `Intl.DateTimeFormat('en-CA', { timeZone })` over the current instant,
yielding `YYYY-MM-DD`. Zone validity is checked by construction inside a `try/catch`;
`RangeError` means invalid, and the server falls back to `UTC` rather than rejecting
the write — losing a day's streak accuracy is a better failure than losing the reading
record.

All streak arithmetic operates on the `YYYY-MM-DD` string, never on wall-clock time.
This makes it immune to DST by construction: no hour arithmetic is ever performed.

### D6 — Streak transitions

State: `lastActiveDay: string | null`, `currentStreak: number`, `longestStreak: number`.
On a recording request resolving to local day `D`:

```
  D === lastActiveDay          →  no change (already counted today)
  D === lastActiveDay + 1 day  →  currentStreak += 1
  D  >  lastActiveDay + 1 day  →  currentStreak = 1   (streak broken, restart)
  D  <  lastActiveDay          →  no change           (clock skew / westward travel)
  lastActiveDay === null       →  currentStreak = 1
```

`longestStreak` is raised whenever `currentStreak` exceeds it. The `D < lastActiveDay`
case must never decrement or break: a user flying east then west would otherwise be
punished for travelling. Adding one day to a `YYYY-MM-DD` value is done by parsing it
as UTC midnight, adding 24h, and reformatting — safe because the value is date-only
and never carries a wall-clock component.

### D7 — Displayed streak is computed at read time, not stored

`currentStreak` in the document is the value as of `lastActiveDay`. A user with a
5-day streak who stops reading still has `5` stored three days later. `GET /api/progress`
therefore takes the client's timezone and returns a **display** streak: the stored
value if `lastActiveDay` is today or yesterday, otherwise `0`.

Without this, a broken streak keeps displaying its stale value until the user reads
again — which is the moment they are least likely to notice they were misled.

### D8 — Last-read resolves by recency, with an added timestamp

The existing local record is `{ surahNumber, surahName, ayahNumber }`. A fourth
optional field, `updatedAt` (epoch milliseconds), is added. The existing validator must
continue to accept records lacking it — records written before this change stay valid
and are treated as older than any server position.

On sign-in:

```
  local only              →  push local to server
  server only             →  adopt server
  both, local newer       →  push local to server
  both, server newer      →  adopt server
  both, local has no ts   →  adopt server
```

Local storage is cleared of the last-read key once the position is server-owned, so
there is one source of truth per auth state and no drift.

*Alternative considered:* server always wins. Rejected — the common case is reading as
a guest and then signing in, where server-always-wins silently discards the position
the user was just at.

### D9 — Endpoint shape

```
GET  /api/progress?timezone=…     → coverage (base64), khatmahPercent,
                                     streak { current, longest, lastActiveDay },
                                     lastRead
POST /api/progress/ayahs          → { ayahs: number[], timezone }
PUT  /api/progress/last-read      → { surahNumber, surahName, ayahNumber }
```

All authenticated, all Zod-validated via `validateRequest`, all returning the standard
`{ statusCode, success, message, data }` envelope. `ayahs` entries are validated to
`1..6236` and the array length is capped so a malformed client cannot send an
unbounded payload.

Recording ayahs does **not** update last-read, and updating last-read does not record
coverage. They answer different questions — "what have I read" versus "where do I
resume" — and conflating them would make resuming a surah credit ayahs the user never
reached.

### D10 — Guests record nothing

Unauthenticated users get no coverage and no streak; last-read stays entirely on local
storage as today. The client does not buffer or attempt writes when unauthenticated.
This mirrors how bookmarks already behave and needs no new auth work.

## Risks / Trade-offs

- **Fast scrolling or audio autoscroll over-credits coverage** → the 2-second dwell is
  the whole defence, and it is a guess. It is a single constant, easy to raise once
  there is real data. Accepted deliberately: the alternative the user rejected was
  friction on every ayah.
- **The bitmap is opaque in a database GUI** → mitigated by `coverageToRanges()` and by
  the fact that every operation on it is a bitwise primitive rather than logic that can
  drift. This is the main cost of D2 and it is real.
- **A client can inflate its own streak** by sending a false timezone → accepted. The
  only thing at stake is the user's own vanity counter; there is no shared leaderboard
  and no privilege attached. Rejecting suspicious zones would break legitimate
  travellers to no benefit.
- **`sendBeacon` on `pagehide` is best-effort** and can be dropped by the browser →
  mitigated by the local-storage mirror, which retries on next load. Coverage is
  idempotent, so a duplicate retry costs nothing. This mitigation is real only because
  the exit flush does not consume the buffer (D3a); consuming it would have discarded
  exactly the dropped reads the mirror is meant to recover.
- **Write volume is bounded but not small** for a long session → a 15-second cadence
  caps it at four requests per minute regardless of scroll speed, each carrying a small
  integer array.
- **Streak arithmetic is easy to get wrong by one day** and the bug is invisible for 24
  hours → D5 and D6 are pure functions over `YYYY-MM-DD` strings with no clock
  dependency, so every transition in the D6 table is directly unit-testable. This is
  where tests go first.

## Migration Plan

No data migration. New collection, created on first write per user; absent documents
are treated as zero coverage, no streak, no server last-read. Existing local-storage
last-read records remain valid and are adopted on next sign-in per D8.

Rollback is dropping the new routes and the client feature module; nothing in the
existing schema changes, so a rollback loses recorded progress but breaks nothing.

## Resolved Questions

- **Read signal**: scroll dwell, 2 seconds (D4).
- **Day boundary**: client IANA timezone per write, UTC fallback on invalid (D5).
- **Progress model**: per-ayah coverage as a fixed bitmap (D2).
- **Scope**: coverage, streak, and last-read sync; goals deferred.

## Open Questions

- Should `GET /api/progress` return the full 780-byte coverage on every load, or a
  per-surah summary with the full bitmap fetched only when a detailed view needs it?
  Base64 of 780 bytes is roughly 1 KB, which is likely not worth optimising, but it is
  sent on every app load.
- Is khatmah percentage over all 6236 ayahs the number users actually want, or do they
  think in juz completed? The stored data supports both; this is only a display choice.
