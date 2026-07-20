## Context

The player is a `useReducer` in `PlayerContext` driving a single `<audio>` element.
State transitions live in `playerReducer.ts`; side effects (src loading, play/pause,
volume) are declarative effects keyed on the state they mirror. Search is a
`useMemo` filter over the cached surah list in `SearchPage.tsx` — no network call.

Four constraints shape this design:

1. **`onEnded` and the manual next button dispatch the same action.** `PlayerContext`
   wires `onEnded={() => dispatch({ type: 'NEXT' })}`, and `next()` dispatches the
   identical `NEXT`. Repeat behaviour must apply to a track *finishing* but not to a
   user *skipping*, so the two cannot stay merged.
2. **`audio.load()` resets `playbackRate`.** The HTML media load algorithm assigns
   `playbackRate` from `defaultPlaybackRate` on every load. The existing `currentUrl`
   effect calls `load()` on each ayah transition, so a naive `audio.playbackRate = x`
   effect would silently reset at every ayah boundary. `volume` is *not* reset by the
   load algorithm, which is why the existing volume effect is correct and is not a
   template to copy here.
3. **Repeating an ayah does not change `currentUrl`.** The src effect is keyed on the
   URL, so a repeat of the same index produces no effect re-run and no replay.
4. **The search endpoint returns 404 for zero matches** —
   `{"code":404,"status":"NOT FOUND","data":"Nothing matching your search was found.."}`.
   Axios rejects on 404, so "no results" arrives as a thrown error.

Measured payloads: `mercy` → 155 matches / 93KB. `a` → 6150 matches / ~3.7MB. The
endpoint has no pagination parameter and returns the full match set.

## Goals / Non-Goals

**Goals:**

- Repeat behaviour that is decided in the reducer (pure, testable) rather than in
  imperative audio callbacks.
- A speed control that survives ayah transitions.
- Verse search that degrades correctly at both ends: too-short queries and
  zero-match queries.
- Preserve every behaviour the app has today — surah-name search, manual next/prev,
  reciter switching mid-playback, volume.

**Non-Goals:**

- Persisting repeat or speed to the `settings` document. Session-only, per the
  proposal. No server or schema change in this batch.
- Arabic-text search. `/search/{q}/all/{edition}` queries one translation edition;
  searching Arabic requires a different approach and is out of scope.
- Pagination or infinite scroll for search results.
- Word-level audio, or any repeat granularity below one ayah.

## Decisions

### D1 — Split `TRACK_ENDED` from `NEXT`

`NEXT` keeps its current meaning: user intent to advance, repeat-agnostic. A new
`TRACK_ENDED` action carries "the audio element finished this track" and is the only
action that consults repeat state. `onEnded` dispatches `TRACK_ENDED`; the next button
keeps dispatching `NEXT`.

*Alternative considered:* a `source: 'user' | 'audio'` field on `NEXT`. Rejected —
it makes every `NEXT` reducer branch re-check the discriminant, and the two actions
genuinely have different semantics.

### D2 — Repeat state as a discriminated union

```ts
type RepeatMode =
  | { kind: 'off' }
  | { kind: 'ayah'; count: number }
  | { kind: 'range'; start: number; end: number; count: number }
  | { kind: 'surah' };
```

`start`/`end` are **playlist indices**, not `numberInSurah`. The playlist is per-surah
and index-aligned, so `index === numberInSurah - 1`; storing indices keeps the reducer
free of ayah-numbering arithmetic. UI converts at the boundary.

`count` accepts `Infinity` for unbounded repeat-ayah. This needs no reducer branch:
`repeatsDone + 1 < Infinity` is always true, so the replay path is taken forever.
Because repeat state is session-only it is never serialised, so `Infinity` costs
nothing at a JSON boundary. The UI renders it as `∞`.

*Alternative considered:* flat fields (`repeatMode: string` + nullable `repeatStart`,
`repeatEnd`, `repeatCount`). Rejected — permits impossible states like a range mode
with a null end, which the reducer would then have to defend against.

### D3 — `repeatsDone` counter, reset on any index change

A `repeatsDone: number` counter tracks plays completed at the current position.
`count` means *total plays*, so `count: 3` plays an ayah three times. The counter
resets to `0` whenever `currentAyahIndex` changes for any reason, and whenever
`repeat` changes.

### D4 — `TRACK_ENDED` resolution

```
                       repeatsDone + 1 < count ?
                        │
  kind: 'ayah'   ───────┼── yes ──▶ replay same index (repeatsDone += 1)
                        └── no  ──▶ advance like NEXT (repeatsDone = 0)

  kind: 'range'  ── at end index ? ── yes ─▶ repeatsDone + 1 < count ?
                        │                      ├─ yes ─▶ jump to start (repeatsDone += 1)
                        │                      └─ no  ─▶ stop, stay at end,
                        │                                range stays armed,
                        │                                repeatsDone = 0
                        └── no ──────────────▶ advance one index

  kind: 'surah'  ── last index ? ── yes ─▶ jump to index 0, keep playing
                        └── no ──────────▶ advance one index

  kind: 'off'    ──────────────────────▶ current NEXT behaviour (stop at end)
```

`kind: 'off'` must reproduce today's end-of-surah behaviour exactly: stop and reset to
index 0.

A completed range **stops without clearing itself**. The playhead stays at `end`, the
range stays set, and `repeatsDone` resets to `0`, so pressing play re-runs the same
drill. Drilling a passage repeatedly is the primary use, and re-selecting the range
each pass would put friction on the most repeated action. Clearing the range remains
an explicit user action — or D6's automatic clear on navigating outside it.

*Alternative considered:* stopping and clearing to `off`. Rejected — cleaner state,
worse ergonomics. *Also rejected:* continuing past `end` into the rest of the surah;
the failure mode is asymmetric, since a user who walks away returns to find playback
far downstream with their place lost, whereas an unwanted stop costs one button press.

### D5 — `replayToken` to force a same-index replay

Because repeating an ayah leaves `currentUrl` unchanged (constraint 3), the reducer
increments a `replayToken: number` whenever it decides to replay the current index.
The src effect's dependency becomes `[currentUrl, replayToken]`, and on a token-only
change it seeks to `0` and plays rather than re-assigning `src` and calling `load()`
— re-loading an identical src would refetch and stall the loop audibly.

*Alternative considered:* handling replay imperatively inside `onEnded` by reading
state and calling `audio.currentTime = 0; audio.play()`. Rejected — it splits repeat
logic across the reducer and a callback, and the callback would close over stale state.

### D6 — Manual navigation overrides but does not cancel repeat

`NEXT` / `PREV` / `SET_INDEX` move the index and reset `repeatsDone`, leaving
`repeat` untouched. For `kind: 'range'`, jumping outside `[start, end]` **clears the
range to `{ kind: 'off' }`** — a range loop whose playhead is outside the range has no
coherent meaning, and silently snapping the user back into the range would fight them.
Ayah and surah repeat survive manual navigation unchanged.

### D7 — Reciter switching preserves repeat

`SET_RECITER` rebuilds the playlist for the same `globalAyahNumbers` and keeps the
index. Playlist length and index alignment are unchanged, so `repeat` — including an
active range — stays valid and is carried through untouched.

### D8 — Speed applied via `defaultPlaybackRate` *and* `playbackRate`

The effect sets both. `defaultPlaybackRate` is what the load algorithm restores from
(constraint 2), so setting it makes the rate survive every ayah transition; setting
`playbackRate` applies it to the track already playing. Effect is keyed on
`state.playbackRate` alone.

Allowed values are a fixed list (`0.5, 0.75, 1, 1.25, 1.5, 2`) in `constants.ts`
rather than a free slider — a discrete control is a smaller UI surface, and arbitrary
rates have no value for recitation.

### D9 — Search: 404 means empty, not error

The query function catches axios 404 and returns `{ count: 0, matches: [] }`. Any
other status propagates and drives the existing `ErrorState`. Without this, the most
common negative case renders as a failure.

### D10 — Minimum query length of 3, results capped at 50

Below 3 characters no request is issued. Results are capped at 50 rendered matches
with the true `count` shown ("showing 50 of 6150"). This bounds the ~3.7MB worst case
at the render layer; the response itself is still fully downloaded, which is the
accepted limit of an endpoint with no pagination parameter.

Debounce reuses the existing `useDebounce` hook. The TanStack Query key is
`['verse-search', debouncedQuery, translationEdition]` — the edition must be in the
key, since the same query against a different translation is a different result set.

### D11 — Combined results, surah matches first

One input, two groups. Surah-name matches (the current `matchesSurah` predicate,
unchanged) render first in a compact section; verse matches follow under a heading
with the result count. Surah matches are almost always the intent when the query looks
like a name or number, and there are at most a handful of them.

### D12 — Share text contract

```
{arabic}

{translation}

— Surah {englishName} {surah}:{ayah}
```

`navigator.clipboard.writeText` is the primary path; `navigator.share` is offered
only when present (feature-detected, not UA-sniffed). Both paths give visible
confirmation — a transient "Copied" state on the button, not a silent success.

## Risks / Trade-offs

- **Repeat state machine has the most branches of anything in this batch, and audio
  bugs are hard to see in review** → `TRACK_ENDED` is a pure reducer transition, so
  every row of the D4 table is assertable without an audio element. If any test
  infrastructure gets added in this batch, it goes here first.
- **`replayToken` is an unusual pattern and reads as a hack without its comment** →
  document constraint 3 directly above the token in `playerReducer.ts`; the next
  reader will otherwise "simplify" it away and silently break ayah repeat.
- **Large search payloads still cross the wire even when capped at render** →
  accepted. The min-length rule removes the pathological single-character case, which
  is the one that actually hurts.
- **Speed and repeat reset on reload, which users may not expect** → deliberate, per
  the proposal's session-only scope. If it turns out to be a real annoyance, speed is
  the one worth promoting to `settings` in a later batch; repeat is per-session intent.
- **Search covers the active translation only** → a user reading Bengali searches
  Bengali text. Correct, but means results change when the translation setting
  changes. The edition in the query key makes that behaviour consistent rather than
  stale.

## Resolved Questions

- **Unbounded repeat-ayah**: included. Offered as `∞` alongside fixed counts of 2, 3,
  5 and 10. Pause and setting repeat to off are the stop affordances — no new control
  is needed, and the reducer needs no new branch (see D2).
- **Range completion**: playback stops and the range stays armed with its pass counter
  reset (see D4).
