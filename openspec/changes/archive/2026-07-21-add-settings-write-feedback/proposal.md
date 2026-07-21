## Why

Changing a setting can fail without the user ever finding out. `updatePreferences`
rejects when `PUT /api/settings` fails, and of its five call sites only one handles
that: `useThemeSetting` catches and deliberately swallows, while the reciter,
translation, and font-size rows in `SettingsPage` and the font-size control in
`SurahReader` call it as `void updatePreferences(…)` — which does not catch, so a failed
write becomes an **unhandled promise rejection** and the user sees a setting that appears
to have been saved.

The consequence is not cosmetic. The choice does apply locally, so the UI looks
correct; but the server keeps the old value, and on the next load the server value wins
by design and the setting reverts. That is the same "it changed by itself on reload"
symptom the theme-persistence change was made to eliminate, reachable through a
different door — a failed write rather than a missing one.

The app has no way to tell a user that a background action failed. `ErrorState` is a
full-block, in-page component for *fetch* failures ("this view cannot render"), used in
five places. Nothing exists for "your action did not save."

## What Changes

- **Failed settings writes are surfaced** — when a settings write fails, the user is
  told, in terms of consequence rather than mechanism: the choice applies on this
  device, but did not sync. The choice itself is not reverted.
- **`updatePreferences` stops rejecting** — it handles its own failure and always
  resolves. Today correctness depends on five call sites each remembering to catch, and
  four of them do not. Making the hook resolve-always removes the whole class of defect
  in one place rather than relying on discipline at every future call site.
- **The four unhandled promise rejections go away** as a direct consequence — three in
  `SettingsPage`, one in `SurahReader` — and the `void` prefixes with them.
- **A toast primitive** — the app gains a first notification surface: a small, dismissible,
  auto-expiring message, announced to assistive technology, that does not steal focus or
  block interaction. Built in-repo, with no new dependency, consistent with `Modal`,
  `Button`, `EmptyState`, and `ErrorState` all being hand-rolled.

Deliberately out of scope: the other currently-swallowed writes — progress sync,
last-read push, bookmarks migration, ayah share. Those are background syncs with their
own retry paths, and announcing them would produce noise on every flaky connection.
They can adopt the toast later if a reason appears.

No breaking changes. Every stored preference stays valid, and a successful write behaves
exactly as it does now.

## Capabilities

### New Capabilities

- `transient-notifications`: telling the user about something that already happened,
  without interrupting them — the toast's lifetime and dismissal, how multiple messages
  behave, what assistive technology announces, and the guarantee that a notification
  never blocks or steals focus.

### Modified Capabilities

None in openspec terms. The `settings` module predates openspec and has no spec file
under `openspec/specs/`; the write-failure behaviour is captured in the new capability
spec above and in `design.md`.

## Impact

**Client only.** No server, API, or data-model change — this is about how an existing
failure is reported.

- New `client/src/components/ui/Toast.tsx` — presentational only, following the existing
  `components/ui/` convention.
- New `client/src/providers/ToastProvider.tsx` — context, the message queue, auto-dismiss
  timing, and a single live region. Queue logic extracted as a pure reducer so it is
  testable without rendering, matching `resolveThemePreference` and `resolveLastRead`.
- `client/src/providers/AppProviders.tsx` — wraps the tree inside `ThemeProvider`, so
  toasts inherit the current theme.
- `client/src/features/settings/useSettings.ts` — `updatePreferences` catches, notifies,
  and resolves.
- `client/src/pages/SettingsPage.tsx` — three `void` call sites become plain calls.
- `client/src/features/surahs/SurahReader.tsx` — its font-size `void` call site likewise.
- `client/src/features/settings/useThemeSetting.ts` — its now-redundant `.catch()` is
  removed; the single write path keeps its shape.

**Verification gate:** `npx tsc --noEmit`, `npm run lint`, `npm run build`, and
`npm test` clean in `client/`; the queue reducer covered by unit tests. Manual scenarios
— with `PUT /settings` blocked in devtools, changing each of theme, reciter, translation,
and font size raises exactly one message and logs no unhandled rejection; the chosen
value stays applied; the message auto-dismisses and can be dismissed early; several
rapid failures do not stack without bound; a screen reader announces the message without
focus moving; toasts render correctly in both themes.
