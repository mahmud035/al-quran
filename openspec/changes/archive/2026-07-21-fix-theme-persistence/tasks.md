## 1. Batch 1 — Reproduce the bug

- [x] 1.1 Extract the precedence rule as a pure function (`resolveThemePreference`),
      taking the fetched server value (or "not fetched"), the cached preference, and
      whether the user has chosen in this session, and returning the preference to
      apply. Mirrors the existing `resolveLastRead` pattern so it is testable without
      React.
- [x] 1.2 Write a failing unit test for `resolveThemePreference` covering the
      precedence scenarios: server value wins on success, pending fetch leaves the
      cache standing, failed fetch leaves the cache standing, guest never consults the
      server, in-session choice outranks a later server value, corrupt cached value is
      treated as absent.
- [ ] 1.3 **Skipped by decision.** An end-to-end reproduction needs to render
      `ThemeProvider` + `PreferencesSync`, which requires a React testing library the
      client does not have; adding one was declined in favour of the manual gate.
      Coverage of the wiring therefore rests on 4.3–4.6.
- [ ] 1.4 **Not satisfiable as written.** 1.2 tests `utils/theme.ts`, a module created
      by this change, so it could not fail beforehand — there was nothing to run it
      against. With 1.3 skipped, no automated test fails on the old code. The bug's
      regression coverage is manual (4.3, 4.6).

## 2. Batch 1 — Widen the contract

- [x] 2.1 Add `'system'` to `Theme` and the `THEMES` array in
      `server/src/modules/settings/settings.interface.ts`. Verify the Mongoose enum and
      the Zod schema both widen from that one edit.
- [x] 2.2 Change the `theme` default to `'system'` in
      `server/src/modules/settings/settings.model.ts`. Existing documents keep their
      stored value.
- [x] 2.3 Mirror the `Theme` union in `client/src/types/api.ts`.
- [x] 2.4 Add a server test asserting `PUT /settings` accepts `system`, `light`, and
      `dark`, and rejects anything else.

## 3. Batch 1 — Fix persistence

- [x] 3.1 Remove `theme` from `DEFAULTS` in `client/src/features/settings/useSettings.ts`
      and adjust the `Preferences` fallback shape so the compiler flags every consumer
      that relied on a placeholder theme. Resolve each flagged site rather than casting.
- [x] 3.2 Rework `client/src/providers/ThemeProvider.tsx` to hold `preference` and
      derive `resolvedTheme`, write the raw-string cache to `qm:theme` on every change,
      and wrap all storage access so a throw cannot break boot. Keep it free of auth and
      query dependencies.
- [x] 3.3 Add `useThemeSetting()` under `client/src/features/settings/` composing
      `useTheme` and `useSettings` into the single write path: update state and cache,
      and `PUT` the value when authenticated. Mark the preference as user-chosen for
      this session.
- [x] 3.4 Point `client/src/components/ui/ThemeToggle.tsx` at `useThemeSetting()` so the
      navbar control persists. Keep it a two-state toggle for now.
- [x] 3.5 Point `client/src/pages/SettingsPage.tsx` at `useThemeSetting()` and drop its
      local `isAuthenticated` branch. Bind the selected option to `preference`.
- [x] 3.6 Fix `client/src/providers/PreferencesSync.tsx`: gate the theme sync on
      `settingsQuery.isSuccess`, skip it when the user has chosen in this session, and
      write the fetched value through to the cache. Leave the reciter sync as it is.
- [x] 3.7 Add the pre-paint inline script to `client/index.html` — blocking, non-module,
      reading `qm:theme` and `matchMedia`, wrapped against storage throws. Cross-
      reference it and `ThemeProvider` in comments as the two copies of one rule.

## 4. Batch 1 — Gate

- [x] 4.1 `npx tsc --noEmit` clean in `client/` and `server/`; `npm run build` clean in
      both; `npm run lint` clean in `client/`.
- [x] 4.2 `npm test` passes in `client/` and `server/`, including the suites from
      section 1, which must now pass.
- [x] 4.3 Manual: logged in, pick Dark from the navbar, reload — stays dark. Repeat from
      the settings page. Repeat as a guest.
- [x] 4.4 Manual: pick Dark on device A, log in on device B whose cache holds light —
      dark follows once settings load.
- [x] 4.5 Manual: with `/settings` blocked or throttled in devtools, the cached theme
      applies and is never reset to light.
- [x] 4.6 Manual: with the network throttled, click Dark during the first second of a
      page load — the in-flight settings response must not clobber it.
- [x] 4.7 Manual: load with a cached dark preference and confirm no light frame paints,
      and that nothing changes when the app hydrates.
- [x] 4.8 Manual: log out with dark applied — theme and cache are retained.

## 5. Batch 2 — Auto

- [x] 5.1 Subscribe to `matchMedia('(prefers-color-scheme: dark)')` in `ThemeProvider`,
      attached only while the preference is `system` and torn down otherwise.
- [x] 5.2 Expose `preference` and `resolvedTheme` separately from `useTheme()`, and
      update consumers so the `.dark` class and the icon follow `resolvedTheme` while
      selected state follows `preference`. **Already done in batch 1** by the
      ThemeProvider rework (3.2); verified rather than re-implemented.
- [x] 5.3 Extend the pre-paint script in `index.html` to resolve a cached `system`
      preference against `matchMedia`. **Already done in batch 1** (3.7); verified.
- [x] 5.4 Replace the `ThemeToggle` button with a three-option dropdown (Auto / Light /
      Dark), keyboard-navigable, with an accessible label and the icon reflecting
      `resolvedTheme`.
- [x] 5.5 Add the third option to the theme row in `SettingsPage.tsx`. **Pulled into
      batch 1:** with the server default now `system`, a two-option row left new users
      with nothing selected, so batch 1 was not shippable without it.
- [x] 5.6 Add tests: `system` resolves against the media query, an OS change under
      `system` updates the applied theme, an OS change under an explicit preference does
      not, and only the preference is ever persisted. **Partial:** the first, second and
      fourth are covered in `utils/theme.test.ts`. The third is a ThemeProvider
      subscription guard and needs component rendering, declined at 1.3 — it rests on
      manual check 6.2 instead.

- [x] 5.7 Declare `color-scheme` on `<html>` in `index.css`, switched by the `dark`
      class, so browser-painted UI matches the theme. Found in manual testing: the new
      native theme dropdown opened light on a dark page.
- [x] 5.8 Set explicit background and text colours on the `<select>` and its `<option>`
      elements in `ThemeToggle`. `color-scheme` alone did not reach the popup; the two
      together do. Invisible on the transparent trigger itself.

## 6. Batch 2 — Gate (continued below with verification fixes)

- [x] 6.1 `npx tsc --noEmit`, `npm run build`, `npm run lint`, and `npm test` clean in
      both packages.
- [x] 6.2 Manual: pick Auto, flip the OS colour scheme — the app follows with no reload.
- [x] 6.3 Manual: pick Auto under a dark OS, reload — the control still shows Auto, and
      the stored preference is `system`, not `dark`.
- [x] 6.4 Manual: pick Auto under a dark OS, switch the OS to light, reload — light
      applies and the preference is still `system`.
- [x] 6.5 Manual: an account whose stored theme is `light` sees no behaviour change.
- [x] 6.6 Manual: operate the navbar dropdown by keyboard only, and confirm both
      controls agree after a change from either.
- [x] 6.7 Manual: under the dark theme, open the navbar theme dropdown and the player's
      reciter/speed selects — every popup renders dark, and scrollbars follow too.

## 7. Verification fixes

- [x] 7.1 Scope the session-choice flag to the login window: add `resetSessionChoice()`
      to `ThemeProvider` and call it in `PreferencesSync` where `syncedRef` is reset.
      Without it a theme picked before signing in suppressed the account's own theme,
      which then reappeared on the next reload.
- [x] 7.2 Fix the stale `resolveTheme` reference in the `index.html` comment — the
      function was renamed to `resolveSystemTheme`, and that cross-reference is what
      keeps the duplicated resolution rule (D5) in step.
- [x] 7.3 Remove the now-unused `isLoading` from the `useSettings` return, orphaned when
      `PreferencesSync` moved to `isSuccess`.
- [x] 7.4 Manual: as a guest pick Light, log in to an account whose stored theme is
      Dark without reloading — dark applies, and still applies after a reload.
      **Failed on first attempt** — 7.1 cleared the flag at logout, but the choice is
      made after logging out and before logging in, so it was set again by sync time.
- [x] 7.5 Clear the session-choice flag on *entering* a login rather than on leaving
      one, triggered by a transition out of a settled logged-out state (session probe
      resolved, no user) so the boot window is not mistaken for a logout.
- [x] 7.6 Manual: re-run 7.4 — as a guest pick Light, log in to an account whose stored
      theme is Dark without reloading. Dark applies, and survives a reload.
- [x] 7.7 Manual: re-run 4.6 — throttled network, click Dark within the first second of
      a page load while already logged in. The choice must survive; this is the check
      the 7.5 trigger is narrowed to protect.
