## Context

Theme is the only preference in the app with two owners. `ThemeProvider` holds it in
React state and mirrors it to `localStorage['qm:theme']`; `useSettings` holds it again
inside the `Preferences` object, persisted to `localStorage['qm:settings']` for guests
and to `GET/PUT /api/settings` for authenticated users. `PreferencesSync` bridges the
two at login. Nothing arbitrates between them, and the bridge runs in one direction
only, so the two disagree the moment a write skips one of them.

Four facts about the current code shape the design:

1. **The navbar toggle writes to exactly one of the two owners.** `ThemeToggle.tsx:5`
   calls `toggleTheme()` and nothing else. `SettingsPage.tsx:66-67` calls `setTheme()`
   *and* `updatePreferences()`, but only `if (isAuthenticated)`. So the two theme
   controls in the app have two different persistence behaviours, and neither is
   complete: the toggle never reaches the server, the settings page never reaches
   `qm:settings` for guests.

2. **`DEFAULTS` is indistinguishable from data.** `useSettings.ts:60` returns
   `settingsQuery.data ?? DEFAULTS`, so a caller cannot tell "the server says light"
   from "nothing has loaded yet." `PreferencesSync` consumes exactly that ambiguity.

3. **The `isLoading` guard does not cover the enable transition.** In TanStack Query v5,
   `isLoading === isPending && isFetching`. On the render where `isAuthenticated` flips
   true, the settings query is newly enabled: pending, but not yet fetching. `isLoading`
   is `false`, the guard in `PreferencesSync.tsx:24` passes, `DEFAULTS.theme` is applied,
   and `syncedRef.current = true` latches so it never self-corrects.

4. **`qm:theme` is written as a raw string, `qm:settings` as JSON.** `ThemeProvider`
   uses `localStorage.setItem(key, theme)` directly; `useLocalStorage` wraps values in
   `JSON.stringify`. This matters because a pre-paint inline script has to read one of
   them with no framework available.

The provider tree is `QueryClient > Theme > Auth > Player`, so `ThemeProvider` currently
sits *above* the auth and settings machinery and cannot call `useSettings()`.

Only three modules call `useTheme()`: `ThemeToggle`, `SettingsPage`, `PreferencesSync`.
The blast radius is small.

## Goals / Non-Goals

**Goals:**

- A theme choice survives a reload, for guests and authenticated users alike, from
  either control.
- One write path. Adding a third theme control later cannot reintroduce this bug.
- Unambiguous precedence between server value, device cache, and OS preference, with a
  placeholder never able to reach the DOM.
- Correct theme on first paint, with no flash.
- `system` follows the OS live, and stays `system` across reloads rather than freezing
  into whatever it resolved to.
- Cross-device sync at login is preserved.

**Non-Goals:**

- Migrating existing accounts off their stored `'light'`. See D7.
- Per-surah or scheduled themes, or any theme beyond light/dark palettes.
- Server-rendered theme. This is a Vite SPA; the pre-paint script is the whole story.
- Defending against `localStorage` being unavailable beyond falling back to OS
  preference, which is the existing behaviour.

## Decisions

### D1 — Split `preference` from `resolvedTheme`, persist only `preference`

`useTheme()` returns both:

```
  preference: 'system' | 'light' | 'dark'   ← persisted, drives the dropdown
  resolvedTheme: 'light' | 'dark'           ← derived, drives .dark and the icon

  resolvedTheme = preference === 'system'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : preference
```

Persisting the resolved value instead is the classic failure: a user picks Auto at
night, `'dark'` is written, and Auto has silently become Dark forever. Only the
preference is ever written to the cache or the server.

*Alternative considered:* keep a single `theme` value and a separate `followSystem`
boolean. Rejected — two fields that can contradict each other (`followSystem: true,
theme: 'dark'`) where one three-value enum cannot, and it widens the settings document
by a field for no gain.

### D2 — An explicit precedence ladder, with `DEFAULTS.theme` deleted

```
  1. server settings.theme     applied ONLY on query success (authenticated)
  2. localStorage 'qm:theme'   pre-paint cache; for guests this IS the truth
  3. matchMedia                consulted only when preference === 'system'
  ─────────────────────────────────────────────────────────────────────────
     DEFAULTS.theme            removed from the object entirely
```

The invariant that makes this safe: **a successful server fetch overwrites the cache;
the cache never overwrites the server.** A pending or failed fetch does nothing at all
— the cached preference simply stands.

Removing `theme` from `DEFAULTS` (`useSettings.ts:20`) is what makes the rule
enforceable rather than merely intended. `Preferences` keeps `theme` as a field, but
the fallback object no longer supplies one, so there is no placeholder theme in
existence for a race to apply. `useSettings` consumers other than the theme path are
unaffected.

*Alternative considered:* leave `DEFAULTS.theme` and rely solely on tightening the
guard (D4). Rejected — it fixes the one caller we know about and leaves the trap armed
for the next one.

### D3 — The single write path lives in a `features/settings` hook, not in `ThemeProvider`

`ThemeProvider` cannot call `useSettings()` from its current position above
`AuthProvider`. Rather than reorder providers, `ThemeProvider` stays a pure
presentation-layer applicator — preference state, `matchMedia` subscription, the
`.dark` class, the cache write — and a new hook in `features/settings/` composes it
with `useSettings`:

```
  ThemeToggle ─┐
               ├─► useThemeSetting()  ─┬─► useTheme().setPreference()  (state + cache)
  SettingsPage ┘                       └─► updatePreferences({ theme }) (server, if authed)
```

Both controls call one function; neither knows about auth. This keeps a DOM concern
free of the network stack and respects the `features/` boundary — theme is settings-
domain data, so its persistence belongs in the settings feature. It is a genuine
two-caller reuse, not a speculative extraction.

*Alternative considered:* reorder to `QueryClient > Auth > Theme > Player` and let
`ThemeProvider` own the whole path, so `useTheme()` is the only hook anyone calls.
Cheap — `AuthProvider` does not depend on theme — and tempting for its single-hook
ergonomics. Rejected because it couples the component that must work before any data
loads to the data layer, and the reorder is a change to a file with no other reason to
move in this batch.

### D4 — Gate the login sync on query success, and skip it if the user already chose

`PreferencesSync` keeps its job — cross-device sync at login is a goal — with two
corrections:

- Gate on `settingsQuery.isSuccess`, not `!isLoading`. Pending, disabled, and errored
  states all mean "do nothing," which the current guard conflates with "loaded."
- Do not apply the server theme if the user changed the theme in this session before
  the query resolved. Without this, a user who loads the page and immediately clicks
  Dark gets clobbered a few hundred milliseconds later by the fetch that was already in
  flight. A "user has touched theme this session" flag makes the login sync yield to a
  deliberate in-session choice; the choice is itself being PUT, so the server converges.
- That flag is scoped to the **current login**, not the page. Left set for the life of
  the page it suppresses the *next*
  login's theme entirely: a guest who picks Light and then signs in would have their
  account's stored Dark silently discarded — and, because a guest's choice is written
  only to local storage, the server would still hold Dark and reapply it on the next
  reload. That is the original "theme changes by itself on reload" symptom, rebuilt from
  the fix for it. Caught in verification, not in manual testing, which happened to log
  in on a fresh page load every time.
- It is cleared **on entering a login**, not on leaving one, because the choice is
  normally made in between: log out, pick a theme, log in. Clearing only at logout
  leaves the flag set again by the time the sync runs.
- The trigger is a transition out of a *settled* logged-out state — the session probe
  resolved and returned no user — not simply `isAuthenticated` becoming true. During
  boot `isAuthenticated` is also false while `/auth/me` is in flight, and treating that
  as a logout would clear a choice made in the first moments of a page load, which is
  the exact case the flag exists to protect.

*Alternative considered:* have `PreferencesSync` seed the query cache from `qm:theme`
via `initialData` so there is never an undefined window. Rejected — it would make a
guessed value indistinguishable from a fetched one, which is the exact confusion D2
exists to remove.

### D5 — Pre-paint inline script in `index.html`, reading the raw-string cache

A small blocking (non-module) script in `<head>` reads `localStorage['qm:theme']`,
resolves `system` against `matchMedia`, and adds `.dark` before first paint. Module
scripts are deferred, so `main.tsx` cannot do this.

`qm:theme` therefore stays a **raw string**, not routed through `useLocalStorage`'s
JSON wrapper (fact 4 above). A raw read needs no `JSON.parse`, cannot throw on a
corrupted value, and keeps the inline script to a few lines. This is a deliberate
inconsistency with `qm:settings`, justified by the pre-paint constraint.

The resolution rule now exists in two places — the inline script and `ThemeProvider`.
That duplication is accepted (the alternative is shipping a module just to share four
lines, which defeats the purpose), and is contained by both reading the same key with
the same rule, cross-referenced in comments.

### D6 — Subscribe to `matchMedia` only while preference is `system`

The `change` listener is attached in an effect keyed on `preference` and torn down when
the preference is not `system`. Under an explicit light or dark choice there is nothing
to listen for, and a live listener that fires into a no-op is a debugging trap.
`addEventListener('change', …)` is used; the deprecated `addListener` fallback is not
needed for the supported browser range.

### D7 — Server default becomes `'system'`; existing rows are not migrated

`settings.model.ts:17` changes its default. `THEMES` in `settings.interface.ts:40`
gains `'system'`, which widens the Mongoose enum and the Zod schema together since both
read that array — one edit, both layers, consistent with the existing defence-in-depth
setup.

Existing documents keep their explicitly stored `'light'`. A migration cannot tell
"never touched the setting" from "deliberately chose light," and silently flipping the
second group to follow their OS is a worse outcome than leaving the first group on a
theme they have been using all along. New accounts get `'system'`.

Guests with no cache resolve to `'system'` by the same reasoning, which is also the
current effective behaviour (`getInitialTheme` already falls back to `matchMedia`) —
only now it is a nameable preference rather than an unlabelled fallback.

### D8 — The navbar control is a native `<select>` overlaid on the icon

Decided during implementation. The navbar hides every label below `sm:`, so a text
control would be the only words there and would eat scarce width; but a hand-rolled
listbox means writing roving focus, arrow/Home/End/Escape handling, outside-click
dismissal, and ARIA by hand. A transparent `<select>` positioned over the icon keeps
the icon-sized footprint and inherits keyboard navigation and screen-reader semantics
from the platform. `focus-within` on the wrapper restores the focus ring the
transparent select would otherwise hide. This also matches the existing idiom —
`ReciterSelect`, `SpeedControl`, and `RepeatControl` are all native selects.

Making the popup follow the theme took two changes, and both were needed:

1. `color-scheme` declared on `<html>` and flipped by the `dark` class. Browser-painted
   UI — select popups, scrollbars, form widgets — reads this property, not our classes.
   This was missing from the stylesheet entirely, so the player's selects had been
   opening light in dark mode since before this change.
2. Explicit `background-color` and `color` on the `select` and its `option` elements.
   `color-scheme` alone did not reach the popup on the target browser. The colours are
   invisible on the transparent trigger; they exist only for the popup.

*Alternative considered:* a custom dropdown, for full control of the popup's
appearance. Rejected once (1) and (2) proved sufficient — it would have traded a
working control for meaningfully more code and bug surface.

## Risks / Trade-offs

- **Resolution logic duplicated between the inline script and `ThemeProvider` (D5)** →
  Same storage key, same rule, comments pointing at each other, and a verification
  scenario that catches drift the moment it appears (load in dark with the network
  throttled: no flash, no correction on hydration).

- **Logout leaves the previous user's theme applied.** `PreferencesSync` resets its
  latch but nothing reverts the DOM, so the next guest on that device inherits the
  theme — and the cache — of whoever logged out. → Accepted deliberately: theme is
  cosmetic and device-scoped, and a jarring flip at logout is worse than inheriting a
  palette. Called out here so it is a decision rather than a surprise. Note this
  differs from bookmarks/settings/progress, which `AuthContext` *does* purge on logout,
  because those are personal data.

- **Two devices changing theme concurrently: last write wins.** → Accepted. There is no
  merge semantics worth building for a three-value cosmetic enum.

- **An old cached client receiving `'system'`** would find a value outside its `Theme`
  union. At runtime it fails open — `theme === 'dark'` is false, so it renders light —
  and client and server deploy together. → No mitigation beyond deploying together.

- **`localStorage` unavailable (private mode, quota, blocked).** The inline script must
  be wrapped so a throw cannot block the app from booting; the app then falls back to
  OS preference each load, and an authenticated user's server value still arrives.

- **Removing `theme` from `DEFAULTS` makes `Preferences.theme` unpopulated in the
  fallback path**, which TypeScript will flag at every consumer. → That is the point:
  the compiler enumerates exactly the places that were relying on a placeholder theme.
  Expect to make `theme` optional on the fallback shape rather than casting it away.

## Migration Plan

Two batches, gated per the operating charter. Batch 1 stands alone and ships the bug
fix without any visible UI change.

**Batch 1 — persistence.** Server enum + default (D7), client type mirrored, write path
consolidated (D3), sync gated on success and yielding to in-session choice (D4),
`DEFAULTS.theme` removed (D2), inline pre-paint script (D5). Both controls still offer
only Light and Dark.

*Gate:* `npm run build` and `npx tsc --noEmit` clean in `client/` and `server/`; logged
in, pick dark from the navbar, reload → stays dark; same as a guest; pick dark on device
A, log in on device B → dark follows; `/settings` failing or slow → cached theme stands
and is not reset; a theme picked during the first second of a page load is not clobbered
by the in-flight fetch.

**Batch 2 — Auto.** `system` surfaced in the navbar dropdown and the settings page,
`matchMedia` subscription (D6), preference/resolved split exposed through `useTheme`
(D1).

*Gate:* build and typecheck clean; pick Auto and flip the OS theme → app follows with no
reload; reload → still Auto, not frozen to the resolved value; a user still on `'light'`
sees no change; dropdown is keyboard-navigable and labelled.

**Rollback.** The server change is additive and backwards-compatible — an old client
against the new server is fine unless a row already holds `'system'`, which fails open
to light. Reverting the client alone is therefore safe at any point. Reverting the
server after users have selected Auto would fail Zod validation on their next settings
write, so the server change is the one to leave in place.

## Open Questions

- Should the settings page keep a full theme row once the navbar has a dropdown, or
  drop to a link that points at it? Keeping both is assumed; they now share one write
  path, so duplication is cheap.
- Worth revisiting later: offering existing `'light'` accounts a one-time "follow my
  system?" prompt, which gets the migration's benefit without guessing on their behalf.
