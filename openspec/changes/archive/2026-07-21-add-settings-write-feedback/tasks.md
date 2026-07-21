## 1. Reproduce the failure first

- [x] 1.1 Manual, before any code change: with `PUT /settings` blocked in devtools and
      logged in, change the reciter, translation, and font size on the settings page.
      Record the unhandled promise rejection in the console for each, and that nothing
      tells the user. This is the reproduction — the defect lives in component wiring
      that cannot be rendered in a test here, so it is captured by observation rather
      than by a failing test.
- [x] 1.2 Manual: reload after 1.1 and confirm each setting has reverted to its previous
      value, since the server never received the change. This is the consequence the
      notification exists to expose.

## 2. Notification primitive

- [x] 2.1 Add `client/src/providers/toastQueue.ts` — a pure reducer over the message
      list handling add, dismiss-by-id, and expire-by-id, with coalescing of identical
      text and a cap that drops the oldest. No React, no timers, no DOM.
- [x] 2.2 Add `client/src/providers/toastQueue.test.ts` covering: a distinct message is
      appended; an identical message refreshes the existing entry instead of appending;
      exceeding the cap drops the oldest; dismissing by id leaves the others untouched;
      dismissing an unknown id is a no-op.
- [x] 2.3 Add `client/src/components/ui/Toast.tsx` — presentational only: message text
      and a dismiss button with an accessible label, styled with the existing colour
      tokens for both themes. No state, no timers.
- [x] 2.4 Add `client/src/providers/ToastProvider.tsx` — `useReducer` over 2.1, a
      per-message expiry timer cleaned up on dismiss and unmount, and a `useToast` hook.
      The live region is rendered **unconditionally**, empty when there are no messages,
      with `role="status"` and `aria-live="polite"`; mounting it alongside its first
      message would leave nothing for a screen reader to observe (design D4).
- [x] 2.5 Position the stack below the navbar and above every other layer, so neither
      the player bar nor a modal can cover it (design D5). Inline `fixed`, no portal,
      matching `Modal`.
- [x] 2.6 Wire `ToastProvider` into `client/src/providers/AppProviders.tsx`, inside
      `ThemeProvider` so messages inherit the theme and above the feature providers so
      anything in the tree can raise one.

## 3. Settings write path

- [x] 3.1 `client/src/features/settings/useSettings.ts` — `updatePreferences` catches a
      failed write, raises the notification, and resolves. It no longer rejects, so
      correctness stops depending on each call site remembering to catch (design D1).
      Message per D6: the change applies on this device but was not synced.
- [x] 3.2 Drop the four `void` prefixes on `updatePreferences` now that it cannot
      reject: three in `client/src/pages/SettingsPage.tsx`, and the font-size control in
      `client/src/features/surahs/SurahReader.tsx`.
- [x] 3.3 `client/src/features/settings/useThemeSetting.ts` — remove its now-redundant
      `.catch()`, keeping the single write path otherwise unchanged.

## 4. Gate

- [x] 4.1 `npx tsc --noEmit`, `npm run lint`, and `npm run build` clean in `client/`.
- [x] 4.2 `npm test` passes, including the 2.2 suite.
- [x] 4.3 Manual: re-run 1.1 — each failing change now raises a notification, the
      console shows no unhandled rejection, and the chosen value stays applied.
- [x] 4.4 Manual: with writes still failing, change three settings quickly — one
      notification is shown rather than three, and its lifetime extends.
- [x] 4.5 Manual: a notification disappears on its own if left alone, and can be
      dismissed sooner with its close control.
- [x] 4.6 Manual: raise a notification while typing or focused on a control — focus does
      not move, the page stays interactive, and the dismiss control is reachable by
      keyboard alone.
- [x] 4.7 Manual: with a screen reader running, a raised notification is announced and
      does not interrupt what is currently being read. This is the only check for the
      live region; it cannot be automated in this project.
- [x] 4.8 Manual: raise a notification while audio is playing, and again with a modal
      open — it is fully visible in both cases.
- [x] 4.9 Manual: notifications render legibly in both light and dark themes. Disable
      any dark-mode browser extension first, so what is on screen is the app's own
      styling.
- [x] 4.10 Manual: as a guest, change a setting with the network blocked — the value is
      stored on the device and no notification appears, since no server write was
      attempted.
- [x] 4.11 Manual: with writes succeeding again, change a setting — no notification, and
      the value survives a reload.
