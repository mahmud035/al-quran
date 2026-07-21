## Why

A logged-in user who picks dark mode and reloads the page gets light mode back. The
navbar toggle (`ThemeToggle.tsx`) only flips local state — it never writes to
`PUT /api/settings` — so the server keeps its `theme: 'light'` default, and on the next
load `PreferencesSync` faithfully applies that stale server value over the correct local
one. The setting silently un-sets itself, on the one surface users touch most.

Behind that sits a second, harder-to-see defect: `useSettings` returns
`settingsQuery.data ?? DEFAULTS` with `DEFAULTS.theme = 'light'`, and `PreferencesSync`
gates on `isLoading`, which is `false` on the render where the query is enabled but has
not begun fetching. In that window the sync applies the *placeholder* theme and latches
`syncedRef`, so it never corrects itself. Fixing only the toggle would leave this in
place to resurface as an intermittent version of the same bug.

Theme is also the only preference with no "follow my system" option, and the class is
applied in a `useEffect` — after first paint — so every load flashes the wrong theme
before correcting.

## What Changes

- **Theme survives a reload for logged-in users** — every theme change persists through
  one write path that updates local state, the device cache, and (when authenticated)
  the server. The navbar control and the settings page stop having different persistence
  behaviour.
- **A stale or absent server value can no longer override a real choice** — the server
  value is applied only when the settings query has actually succeeded. `DEFAULTS` loses
  its `theme` member entirely, so a placeholder can never reach the DOM.
- **Precedence between the three stores becomes explicit** — a successful server fetch
  overwrites the device cache; the device cache never overwrites the server. For guests
  the cache *is* the truth. `localStorage['qm:theme']` is demoted from rival source of
  truth to a pre-paint render cache that doubles as guest storage, and is written for
  authenticated users too (today it is not, which is why it cannot be trusted at boot).
- **A third theme option, `system`** — preference becomes `'system' | 'light' | 'dark'`,
  surfaced as Auto / Light / Dark in a navbar dropdown replacing the two-state toggle
  button, and as a third option on the settings page. Under `system` the app follows
  `prefers-color-scheme` live, without a reload, via a `matchMedia` subscription held
  only in that state.
- **Preference and resolved theme become separate concepts** — `useTheme()` exposes
  `preference` (drives the dropdown's selected state) and `resolvedTheme` (drives the
  `.dark` class and the sun/moon icon). Only the *preference* is ever persisted; storing
  the resolved value is what would silently decay Auto into a fixed theme.
- **No theme flash on load** — an inline script in `index.html` stamps the `.dark` class
  from the cache plus `matchMedia` before first paint.

`theme` widens from a two-value to a three-value enum on the settings API. This is
additive: `'light'` and `'dark'` remain valid everywhere, every stored value stays
valid, and an older client receiving `'system'` is the only incompatibility — not a
concern for a single-client app deployed together.

Not doing: migrating existing accounts. New accounts default to `'system'`; existing
rows keep their explicitly-stored `'light'` until the user changes it, because a
migration cannot distinguish "never touched the setting" from "deliberately chose
light."

## Capabilities

### New Capabilities

- `theme-preference`: choosing and persisting the app's theme — the three-value
  preference, resolving `system` against `prefers-color-scheme` and tracking OS changes
  live, precedence between server value / device cache / system preference, the
  guest-versus-authenticated persistence split, applying the resolved theme before first
  paint, and how the app behaves when the settings request is pending, fails, or the
  user logs out.

### Modified Capabilities

None in openspec terms. The `settings` module predates openspec and has no spec file
under `openspec/specs/`; its `theme` field widening is captured in the new capability
spec above and in `design.md`.

## Impact

**Server**

- `settings.interface.ts`: `Theme` union and the `THEMES` array gain `'system'`. The
  array feeds both the Mongoose enum and the Zod schema, so both widen from one edit.
- `settings.model.ts`: `theme` default changes from `'light'` to `'system'`. Existing
  documents are untouched.
- No route, controller, or service changes — `PUT /settings` already accepts a partial
  patch containing `theme`.

**Client**

- `types/api.ts`: `Theme` mirrors the server union.
- `providers/ThemeProvider.tsx`: reworked to hold `preference` + `resolvedTheme`,
  subscribe to `matchMedia` only under `system`, and own the single write path that
  fans out to state, cache, and server.
- `providers/PreferencesSync.tsx`: theme sync gates on query success rather than
  `isLoading`.
- `features/settings/useSettings.ts`: `theme` removed from `DEFAULTS`.
- `components/ui/ThemeToggle.tsx`: toggle button becomes a three-option dropdown;
  keyboard-navigable and labelled, with the icon reflecting `resolvedTheme`.
- `pages/SettingsPage.tsx`: third theme option; the row binds to `preference`, not the
  resolved theme, and drops its local `isAuthenticated` branch now that persistence is
  centralised.
- `index.html`: inline pre-paint theme script.

**Batching.** Two gates, per the operating charter:

- **Batch 1 — persistence fix.** Server enum widened, client type mirrored, single write
  path, success-gated sync, `DEFAULTS.theme` removed, pre-paint script. UI still shows
  two options. *Gate:* `npm run build` and `npx tsc --noEmit` clean in `client/` and
  `server/`; logged in, pick dark from the navbar, reload — stays dark; same as a guest;
  pick dark on device A, log in on device B — dark follows; with the network offline the
  cached theme still applies and is not reset.
- **Batch 2 — Auto.** `system` surfaced in both controls, `matchMedia` subscription,
  preference-versus-resolved split. *Gate:* build and typecheck clean; pick Auto, flip
  the OS theme — the app follows without a reload; reload — still Auto, not frozen to
  the resolved value; a user still on `'light'` is unaffected.
