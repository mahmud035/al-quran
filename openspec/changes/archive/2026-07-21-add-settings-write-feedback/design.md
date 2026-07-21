## Context

The app has never needed to tell a user that a background action failed, so it has no
way to. `ErrorState` covers the other case — a *fetch* that failed, where the view has
nothing to render — and is a full-block, centred component used in five pages. A failed
*write* is different: the view is fine, the user is mid-task, and the thing to convey is
that something they already did did not stick.

Four facts about the current code shape the design:

1. **`updatePreferences` rejects, and most callers do not catch.** `SettingsPage.tsx:67`,
   `:86`, `:97`, and `SurahReader.tsx:191` call it as `void updatePreferences(…)`, which
   does not handle a rejection — those four are unhandled promise rejections today.
   `useThemeSetting` is the only caller of the five that catches, and it swallows
   deliberately. Font size is reachable from two of them, the settings page and the
   reader.
2. **A failed write is not merely silent, it reverts.** The local value applies, the
   server keeps the old one, and by the precedence rule established in the
   theme-persistence change a fetched server value wins on the next load. So the setting
   changes back by itself — the same symptom that change existed to remove.
3. **There is no UI dependency in the project.** `Modal`, `Button`, `Badge`,
   `EmptyState`, and `ErrorState` are all hand-rolled, and `Modal` does not even use a
   portal — it renders inline with `fixed inset-0`.
4. **The bottom of the viewport is taken.** `PlayerBar` is `fixed inset-x-0 bottom-0
   z-40` whenever audio is loaded. `Navbar` is `sticky top-0 z-40`; `Modal` is `z-50`.

The client has `vitest` + `jsdom` but no React testing library, so anything that must be
verified automatically has to be reachable without rendering a component.

## Goals / Non-Goals

**Goals:**

- A user who changes a setting while the write fails finds out, in terms of what it
  means for them.
- The failure mode stops depending on every call site remembering to catch.
- A notification surface that never blocks, never steals focus, and is announced to
  assistive technology.
- Queue behaviour that stays sane when several writes fail in quick succession.
- No new dependency; consistent with the existing hand-rolled `components/ui`.

**Non-Goals:**

- Retrying the failed write, or queueing it for later. The user's next change re-sends.
- Notifying about the other swallowed writes — progress sync, last-read push, bookmarks
  migration, ayah share. Deferred by the proposal.
- A general notification centre, history, or persistence across reloads.
- Success confirmations. Only failures are worth interrupting for; a setting that saved
  is evidenced by the UI already showing it.

## Decisions

### D1 — `updatePreferences` handles its own failure and always resolves

The hook catches, raises the notification, and returns normally. Callers stop needing
`.catch()`, and the four `void` prefixes disappear.

Correctness today depends on five call sites each remembering to handle a rejection, and
four of them do not. Centralising it removes the entire class of defect at one point
instead of relying on discipline at every call site added in future — the same reasoning
that made `useThemeSetting` the single write path for theme.

The cost is that a data hook reaches for a UI service. That is accepted: the alternative
has already failed in practice, in this file, three times.

*Alternative considered:* keep rejecting and fix the five call sites. Rejected — it
leaves the trap armed for the next caller, and nothing in the type system marks
`updatePreferences` as something that must be caught. The count itself is the argument:
the original reading of this code found four call sites, not five, and missed a live
unhandled rejection in `SurahReader` — a per-call-site rule fails at exactly the call
site nobody noticed.

*Alternative considered:* surface failure as returned state (`{ ok: false }`) for callers
to render however they like. Rejected as speculative: there is one presentation, and
inventing a per-caller rendering contract for it is configurability nobody asked for.

### D2 — Queue state as a pure reducer, provider as a thin shell

The add/dismiss/expire transitions live in a pure function over an array of messages;
`ToastProvider` holds it with `useReducer` and owns only the timers and the rendering.

This is the only way any of it is testable — the client has no React testing library, so
a provider cannot be rendered in a test. It matches how `resolveThemePreference` and
`resolveLastRead` were extracted for exactly the same reason. The reducer covers what is
worth asserting anyway: capacity, coalescing, and dismissal by id.

### D3 — Coalesce identical messages; cap the queue at three

Adding a message identical to one already showing refreshes that message's timer instead
of appending. Beyond three simultaneous messages, the oldest is dropped.

Both exist because the realistic failure is correlated, not isolated: the network is
down, and the user changes four settings in ten seconds. Without coalescing they would
get four stacked copies of one sentence; without a cap, an unbounded column of them.

### D4 — Always-mounted live region, `role="status"` / `aria-live="polite"`

The region element is rendered unconditionally — empty when there are no messages — and
only its children change.

This is the classic failure in hand-rolled toasts: mounting the live region at the same
moment as its first message means screen readers have nothing to observe changing, and
the message goes unannounced. `polite` rather than `assertive` because a settings write
that did not sync is not urgent enough to interrupt what is being read.

Focus is never moved, and the dismiss control is reachable in normal tab order.

### D5 — Top placement, below the navbar, above every other layer

Messages appear under the header rather than at the conventional bottom, because
`PlayerBar` occupies the bottom edge whenever audio is loaded and would cover them. Top
placement is unconditional — it does not depend on whether the player happens to be
showing, so there is no layout coupling between the two and no state to get wrong.

The stack sits above `Modal` (`z-50`), since a transient message that renders behind
something is worse than useless, and a background write can fail while a modal is open.

*Alternative considered:* bottom placement offset by the player bar's height. Rejected —
it couples two unrelated components through a magic number that breaks the moment either
changes height.

### D6 — Message states the consequence, not the mechanism

*"Couldn't sync your settings — they'll apply on this device only."*

Not "PUT /settings failed", not "Network error". The user needs to know their choice
still took effect here and will not follow them elsewhere, which is precisely the
situation. It also stays true whether the cause was offline, a 500, or a timeout.

### D7 — No portal, matching `Modal`

Rendered inline from the provider with fixed positioning, exactly as `Modal` does.
Introducing `createPortal` for this one case would leave the codebase with two
conventions for escaping layout, and the existing one demonstrably works.

`ToastProvider` sits inside `ThemeProvider` in `AppProviders` so messages pick up the
current theme, and outside the feature providers so anything in the tree can raise one.

## Risks / Trade-offs

- **A data hook depends on a UI service (D1)** → Confined to `useSettings`, where the
  failure actually occurs and the message is written. If a second consumer ever needs a
  different presentation, that is the point to introduce a returned result — not before.

- **Auto-dismiss can outrun a slow reader.** A message that vanishes on a timer may be
  missed entirely. → Mitigated by a generous duration, an explicit dismiss control, and
  the fact that the underlying state is not destructive: the user's choice still applies
  locally, and the next successful change re-syncs it. Pause-on-hover was considered and
  left out; it adds timer state for a marginal gain on a single-sentence message.

- **The live region is hand-rolled, and screen-reader behaviour cannot be unit-tested
  here.** → The reducer is tested; the announcement rests on a manual check with a real
  screen reader, called out explicitly in the tasks rather than assumed.

- **Coalescing could hide a genuinely different second failure** if two distinct messages
  ever share wording. → Only one message exists today. Coalescing keys on the message
  text, so distinct text stacks normally.

- **Toast text asserts "this device only", which is only true for authenticated users.**
  A guest's write goes to local storage and cannot fail this way, so the message is
  reachable only when a server write failed — where the claim is accurate.

## Open Questions

- Should a *successful* write after a failure quietly confirm that syncing resumed? Left
  out for now: it means tracking a "was previously failing" flag for a reassurance most
  users will never see.
- Whether the other swallowed writes should eventually adopt this surface, particularly
  the bookmarks migration, where silent failure loses user data rather than a preference.
  Worth revisiting once the toast has been in use.
