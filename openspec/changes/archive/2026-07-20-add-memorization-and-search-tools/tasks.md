## 1. Reducer test harness

The `TRACK_ENDED` resolution table (design D4) has roughly a dozen branches across
four repeat modes, and every one of them is an audio behaviour that is slow and
unreliable to verify by ear. `client/` currently has no test runner. Adding one
scoped to `playerReducer` — a pure function with no DOM dependency — makes each
scenario in `specs/recitation-repeat/spec.md` directly assertable.

If you'd rather not add a runner in this batch, skip this group and rely on the
manual scenarios in group 7; the rest of the tasks do not depend on it.

- [x] 1.1 Add `vitest` as a dev dependency in `client/` and a `test` script; no config beyond defaults if the Vite config already resolves the `@/` alias
- [x] 1.2 Create `client/src/context/playerReducer.test.ts` covering the current pre-change behaviour: `NEXT` advancing, `NEXT` stopping and resetting to index 0 at the end, `PREV` clamping at index 0
- [x] 1.3 Confirm the new tests pass against the unmodified reducer, establishing the regression baseline before any repeat logic lands

## 2. Repeat state in the reducer

- [x] 2.1 Add the `RepeatMode` discriminated union to `playerReducer.ts` per design D2, with `start`/`end` as playlist indices and `count` accepting `Infinity`
- [x] 2.2 Add `repeat`, `repeatsDone`, and `replayToken` to `PlayerState` and `initialPlayerState`, defaulting to `{ kind: 'off' }`, `0`, and `0`
- [x] 2.3 Add a `SET_REPEAT` action that sets the mode and resets `repeatsDone` to 0
- [x] 2.4 Add the `TRACK_ENDED` action, leaving `NEXT` semantically unchanged as user-intent-to-advance (design D1)
- [x] 2.5 Implement `TRACK_ENDED` for `kind: 'off'` — reproduce today's `NEXT` behaviour exactly, including stop-and-reset-to-0 at the end of the surah
- [x] 2.6 Implement `TRACK_ENDED` for `kind: 'ayah'` — replay while `repeatsDone + 1 < count` incrementing the counter, otherwise advance and reset; verify `count: Infinity` never advances
- [x] 2.7 Implement `TRACK_ENDED` for `kind: 'range'` — advance within the range; at `end`, loop to `start` while passes remain, otherwise stop at `end` keeping the range armed and resetting `repeatsDone` (design D4)
- [x] 2.8 Implement `TRACK_ENDED` for `kind: 'surah'` — wrap from the last index to 0 and keep playing
- [x] 2.9 Increment `replayToken` on every branch that replays the current index without changing it (design D5)
- [x] 2.10 Reset `repeatsDone` to 0 in `SET_INDEX`, `NEXT`, and `PREV`
- [x] 2.11 Clear `repeat` to `{ kind: 'off' }` when `SET_INDEX`, `NEXT`, or `PREV` moves the index outside an active range; leave `ayah` and `surah` modes untouched (design D6)
- [x] 2.12 Carry `repeat`, `repeatsDone`, and range bounds through `SET_RECITER` unchanged (design D7)
- [x] 2.13 Extend `playerReducer.test.ts` to assert every scenario in `specs/recitation-repeat/spec.md`, including the unbounded-repeat-at-last-ayah and completed-range-stays-armed cases

## 3. Player effects and audio wiring

- [x] 3.1 Change the `<audio onEnded>` handler in `PlayerContext.tsx` to dispatch `TRACK_ENDED` instead of `NEXT`
- [x] 3.2 Add `replayToken` to the src effect's dependency array alongside `currentUrl`
- [x] 3.3 Branch the src effect: on a `replayToken`-only change, seek to 0 and play without reassigning `src` or calling `load()`, so the loop does not refetch or stall (design D5)
- [x] 3.4 Add a comment above `replayToken` in `playerReducer.ts` recording why it exists — repeating an ayah leaves `currentUrl` unchanged, so the src effect would otherwise never re-run
- [x] 3.5 Add `playbackRate` to `PlayerState` defaulting to `1`, plus a `SET_PLAYBACK_RATE` action
- [x] 3.6 Add an effect keyed on `state.playbackRate` that sets **both** `audio.defaultPlaybackRate` and `audio.playbackRate`, so the rate survives the `load()` on every ayah transition (design D8)
- [x] 3.7 Expose `setRepeat` and `setPlaybackRate` on `PlayerContextValue` and include them in the `useMemo` dependency list

## 4. Player controls

- [x] 4.1 Add `PLAYBACK_RATES` (`0.5, 0.75, 1, 1.25, 1.5, 2`) and `REPEAT_COUNTS` (`2, 3, 5, 10, Infinity`) to `client/src/utils/constants.ts`
- [x] 4.2 Build a repeat control in `PlayerBar.tsx` for selecting mode and count, rendering `Infinity` as `∞` and showing an active state whenever the mode is not off
- [x] 4.3 Show count progress when a bounded count is active, and an infinity indicator when unbounded
- [x] 4.4 Add range selection — pick start and end ayahs — converting between ayah numbers in the UI and playlist indices in state, and display the armed range as ayah numbers
- [x] 4.5 Add a speed control showing the current rate, styled active whenever the rate is not 1
- [x] 4.6 Verify all new controls have accessible labels and are reachable by keyboard

## 5. Verse search

- [x] 5.1 Create `client/src/features/search/useVerseSearch.ts` following the fetch-and-shape pattern in `useSurah.ts`, with query key `['verse-search', debouncedQuery, translationEdition]`
- [x] 5.2 Catch axios 404 in the query function and return `{ count: 0, matches: [] }`; let every other status propagate to the error state (design D9)
- [x] 5.3 Shape the response into a typed result with surah number, surah English name, ayah number, and matched text
- [x] 5.4 Gate the query on a trimmed query length of at least 3 via TanStack Query's `enabled`
- [x] 5.5 Debounce the input with the existing `useDebounce` hook
- [x] 5.6 Cap rendering at 50 matches while displaying the true total count (design D10)
- [x] 5.7 Restructure `SearchPage.tsx` into two sections — surah matches first using the unchanged `matchesSurah` predicate, then verse matches under their own heading (design D11)
- [x] 5.8 Render the two sections' loading states independently, so surah matches appear immediately while the verse request is in flight
- [x] 5.9 Implement the remaining search states: no query, zero results, error with retry, and a note in the verse section when the query is under 3 characters
- [x] 5.10 Link each verse result to `/surah/:number#ayah-:n`, matching the anchor `AyahCard` already renders

## 6. Ayah copy and share

- [x] 6.1 Add a formatter producing the exact text contract from design D12 — Arabic, translation, reference line, blank-line separated, no transliteration
- [x] 6.2 Add a copy action to `AyahCard.tsx` using `navigator.clipboard.writeText`
- [x] 6.3 Show a transient copied confirmation on the control that reverts on its own
- [x] 6.4 Surface a failure message when the clipboard write rejects, without showing the copied confirmation
- [x] 6.5 Feature-detect `navigator.share` and render the share action only when present; treat user dismissal as a non-error
- [x] 6.6 Verify both actions have accessible labels and do not disturb the existing play and bookmark controls in the card header

## 7. Verification gate

- [x] 7.1 `npm run build` clean in `client/`
- [x] 7.2 `npx tsc --noEmit` clean in `client/`
- [x] 7.3 `npm run lint` clean in `client/`
- [x] 7.4 Reducer tests pass, if group 1 was done
- [x] 7.5 Manual — each repeat mode loops correctly: ayah with a bounded count, ayah unbounded, range looping and stopping armed at `end`, and loop-surah wrapping
- [x] 7.6 Manual — manual next/prev during each repeat mode advances exactly one ayah and does not repeat
- [x] 7.7 Manual — navigating outside an active range clears it to off and the control visibly updates
- [x] 7.8 Manual — speed holds across an ayah transition, a repeat replay, and a reciter change, and resets to 1 on reload
- [x] 7.9 Manual — a known phrase returns its verse and the result deep-links to the correct ayah; a nonsense query shows the empty state, not an error
- [x] 7.10 Manual — copy produces the agreed text; share appears on a browser exposing `navigator.share` and is absent on one that does not
- [x] 7.11 Manual — regression: with repeat off, playing a surah to the end still stops and resets to the first ayah
