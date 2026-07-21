# transient-notifications

## Purpose

Tell the user about something that has already happened, without interrupting what they
are doing. Covers the notification's lifetime and dismissal, how several messages behave
together, what assistive technology announces, the guarantee that a notification never
blocks or steals focus, and the first use of that surface: a settings write that failed
to reach the server.

## ADDED Requirements

### Requirement: A failed settings write is reported to the user

When a settings write to the server fails, the system SHALL raise a notification saying
so. The user's chosen value SHALL remain applied locally and MUST NOT be reverted as a
result of the failure.

#### Scenario: The write fails

- **WHEN** an authenticated user changes a setting and the settings request fails
- **THEN** a notification reports that the setting could not be synced
- **AND** the chosen value remains applied

#### Scenario: The write succeeds

- **WHEN** a settings write succeeds
- **THEN** no notification is raised

#### Scenario: A guest changes a setting

- **WHEN** an unauthenticated user changes a setting
- **THEN** the value is stored on the device and no notification is raised

#### Scenario: Each failing setting reports

- **WHEN** the theme, reciter, translation, or font size is changed and its write fails
- **THEN** the failure is reported for each of them alike

### Requirement: A settings write never fails silently or unhandled

Changing a setting SHALL NOT produce an unhandled promise rejection, and SHALL NOT fail
without the user being told. Handling SHALL NOT depend on each individual call site
remembering to catch.

#### Scenario: No unhandled rejection

- **WHEN** a settings write fails from any control in the app
- **THEN** no unhandled promise rejection is raised

#### Scenario: A new call site inherits the behaviour

- **WHEN** a new caller changes a setting without handling errors itself
- **THEN** a failure is still reported to the user

### Requirement: Notification content states the consequence

A notification SHALL describe what the failure means for the user rather than its
technical cause. It MUST NOT surface status codes, endpoint names, or exception text.

#### Scenario: Wording

- **WHEN** a settings write fails
- **THEN** the message conveys that the change applies on this device but was not synced
- **AND** it contains no status code, URL, or exception text

#### Scenario: Cause-independent

- **WHEN** the write fails because the device is offline, or with a server error, or by
  timing out
- **THEN** the same message is shown, because the consequence is the same

### Requirement: Notifications expire on their own and can be dismissed early

A notification SHALL disappear on its own after a period long enough to read it, and
SHALL offer an explicit control to dismiss it sooner. Dismissing one notification MUST
NOT affect any other.

#### Scenario: Expires unaided

- **WHEN** a notification has been shown and left alone
- **THEN** it disappears without user action

#### Scenario: Dismissed early

- **WHEN** the user activates a notification's dismiss control
- **THEN** that notification is removed immediately

#### Scenario: Dismissing one of several

- **WHEN** two notifications are showing and one is dismissed
- **THEN** the other remains, with its own remaining lifetime unaffected

### Requirement: Repeated identical notifications do not accumulate

A notification identical to one already showing SHALL refresh that notification rather
than adding another. The number shown at once SHALL be bounded; beyond the limit the
oldest is dropped.

#### Scenario: The same failure repeats

- **WHEN** several settings writes fail in quick succession with the same message
- **THEN** one notification is shown, not one per failure
- **AND** its lifetime is extended by the later failures

#### Scenario: Distinct messages stack

- **WHEN** two notifications with different text are raised
- **THEN** both are shown

#### Scenario: Beyond the limit

- **WHEN** more notifications are raised than may be shown at once
- **THEN** the oldest is dropped and the newest is shown

### Requirement: Notifications are announced to assistive technology

Notifications SHALL be rendered in a live region that is present in the document
regardless of whether any notification is showing, so that a newly added message is
observed as a change and announced. Announcement SHALL be polite, not interrupting what
is currently being read.

#### Scenario: A message is announced

- **WHEN** a notification is raised while a screen reader is running
- **THEN** its text is announced

#### Scenario: The region persists when empty

- **WHEN** no notifications are showing
- **THEN** the live region is still present in the document

### Requirement: Notifications never block or steal focus

Raising a notification SHALL NOT move focus, and SHALL NOT prevent interaction with the
rest of the page. Its dismiss control SHALL be reachable by keyboard in the normal tab
order.

#### Scenario: Focus is undisturbed

- **WHEN** a notification is raised while the user is interacting with a control
- **THEN** focus stays where it was

#### Scenario: The page stays usable

- **WHEN** a notification is showing
- **THEN** the rest of the page can still be clicked, scrolled, and typed into

#### Scenario: Keyboard dismissal

- **WHEN** the user tabs to a showing notification's dismiss control and activates it
- **THEN** the notification is removed

### Requirement: Notifications remain visible above other layers

A notification SHALL be visible whenever it is showing, and MUST NOT be obscured by the
navigation bar, the player bar, or a modal.

#### Scenario: While audio is playing

- **WHEN** a notification is raised while the player bar is showing
- **THEN** the notification is fully visible and the player bar does not cover it

#### Scenario: While a modal is open

- **WHEN** a notification is raised while a modal is open
- **THEN** the notification is visible above the modal

### Requirement: Notifications follow the applied theme

Notifications SHALL render legibly in both the light and dark themes, using the app's
existing colour tokens.

#### Scenario: Dark theme

- **WHEN** a notification is shown while the applied theme is `dark`
- **THEN** it renders in the dark palette with readable contrast

#### Scenario: Light theme

- **WHEN** a notification is shown while the applied theme is `light`
- **THEN** it renders in the light palette with readable contrast
