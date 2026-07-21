# theme-preference

## Purpose

Choose, resolve, apply, and persist the app's colour theme. Covers the three-value
preference (`system`, `light`, `dark`), resolving `system` against the operating
system's colour scheme and following it live, precedence between the server value, the
device cache, and the OS preference, the guest-versus-authenticated persistence split,
applying the theme before first paint, and behaviour when the settings request is
pending, fails, or the user logs out.

## Requirements

### Requirement: Three-value theme preference

The system SHALL represent the user's theme choice as exactly one of `system`, `light`,
or `dark`, and SHALL accept that value on both the client and the settings API. `system`
SHALL be the default for a user who has never made a choice.

#### Scenario: Default for a user with no stored choice

- **WHEN** a user loads the app with no cached preference and no stored server value
- **THEN** the preference is `system`

#### Scenario: Server accepts each value

- **WHEN** a `PUT /api/settings` request carries `theme` as `system`, `light`, or `dark`
- **THEN** the request is accepted and the value is stored

#### Scenario: Server rejects an unknown value

- **WHEN** a `PUT /api/settings` request carries a `theme` value outside those three
- **THEN** the request is rejected by validation and no value is stored

#### Scenario: New account default

- **WHEN** a settings document is created for a new user without an explicit theme
- **THEN** its stored theme is `system`

#### Scenario: Existing accounts are not migrated

- **WHEN** a settings document created before this change holds `light`
- **THEN** its stored theme remains `light` until the user changes it

### Requirement: Resolve the preference to an applied theme

The system SHALL derive an applied theme of `light` or `dark` from the preference. A
preference of `light` or `dark` SHALL resolve to itself. A preference of `system` SHALL
resolve to `dark` when the OS reports a dark colour scheme and to `light` otherwise. The
applied theme SHALL be reflected as the presence or absence of the `dark` class on the
document root.

#### Scenario: Explicit preference

- **WHEN** the preference is `dark`
- **THEN** the applied theme is `dark` regardless of the OS colour scheme

#### Scenario: System preference with a dark OS

- **WHEN** the preference is `system` and the OS reports a dark colour scheme
- **THEN** the applied theme is `dark`

#### Scenario: System preference with a light OS

- **WHEN** the preference is `system` and the OS does not report a dark colour scheme
- **THEN** the applied theme is `light`

### Requirement: Follow the OS colour scheme live under `system`

While the preference is `system`, the system SHALL track changes to the OS colour scheme
and update the applied theme without a reload. While the preference is `light` or `dark`,
OS colour scheme changes SHALL have no effect.

#### Scenario: OS switches to dark while on Auto

- **WHEN** the preference is `system` and the OS colour scheme changes to dark
- **THEN** the applied theme becomes `dark` without a page reload

#### Scenario: OS switches while on an explicit theme

- **WHEN** the preference is `light` and the OS colour scheme changes to dark
- **THEN** the applied theme remains `light`

#### Scenario: Leaving Auto

- **WHEN** the preference changes from `system` to `dark`
- **THEN** subsequent OS colour scheme changes do not alter the applied theme

### Requirement: Persist the preference, never the resolved theme

The system SHALL persist only the user's preference. The resolved theme MUST NOT be
written to the device cache or to the server. A user who selects `system` SHALL still
have `system` as their preference after a reload, whatever it resolved to.

#### Scenario: Auto survives a reload as Auto

- **WHEN** a user selects Auto while the OS is dark, then reloads
- **THEN** the preference is `system`, not `dark`
- **AND** the theme control shows Auto as selected

#### Scenario: Auto reloaded under a changed OS scheme

- **WHEN** a user selects Auto while the OS is dark, the OS switches to light, and the
  user reloads
- **THEN** the applied theme is `light`
- **AND** the preference is still `system`

### Requirement: Every theme control persists through one path

All controls that change the theme SHALL persist the choice identically: updating the
applied theme, writing the device cache, and — for an authenticated user — writing the
value to the settings API. No control may change the theme without persisting it.

#### Scenario: Authenticated user changes theme from the navbar

- **WHEN** an authenticated user selects Dark from the navbar theme control
- **THEN** the applied theme becomes `dark`
- **AND** the device cache holds `dark`
- **AND** `dark` is written to the settings API

#### Scenario: Authenticated user changes theme from the settings page

- **WHEN** an authenticated user selects Dark on the settings page
- **THEN** the outcome is identical to selecting it from the navbar

#### Scenario: Guest changes theme

- **WHEN** an unauthenticated user selects Dark from either control
- **THEN** the applied theme becomes `dark`
- **AND** the device cache holds `dark`
- **AND** no settings request is made

#### Scenario: Choice survives a reload

- **WHEN** any user selects Dark from any control and reloads the page
- **THEN** the applied theme is `dark`

### Requirement: Precedence between stored theme sources

The system SHALL resolve the preference by precedence: a successfully fetched server
value first, then the device cache, then the OS colour scheme. A successful server fetch
SHALL overwrite the device cache. The device cache MUST NOT overwrite the server value.
No placeholder or default theme may be applied in place of an unfetched server value.

#### Scenario: Server value wins for an authenticated user

- **WHEN** an authenticated user's settings request succeeds with `theme: 'dark'` while
  the device cache holds `light`
- **THEN** the applied theme becomes `dark`
- **AND** the device cache is updated to `dark`

#### Scenario: Settings request still pending

- **WHEN** an authenticated user's settings request has not yet resolved
- **THEN** the applied theme is the one resolved from the device cache
- **AND** no default or placeholder theme is applied

#### Scenario: Settings request fails

- **WHEN** an authenticated user's settings request fails
- **THEN** the theme resolved from the device cache remains applied and is not reset

#### Scenario: Guest is never overridden

- **WHEN** an unauthenticated user has `dark` in the device cache
- **THEN** the applied theme is `dark` and no server value is consulted

### Requirement: An in-session choice outranks the login sync

The system SHALL NOT overwrite a theme the user selected during the current session with
a server value that arrives afterwards. A settings response in flight when the user makes
a choice MUST NOT clobber that choice. This protection SHALL be scoped to the current
login: crossing a logout clears it, so the next account's stored theme still applies.

#### Scenario: User picks a theme while the settings request is in flight

- **WHEN** an authenticated user selects Dark before the settings request resolves, and
  that request then resolves with `theme: 'light'`
- **THEN** the applied theme remains `dark`
- **AND** `dark` is the value persisted to the server

#### Scenario: A choice made during the initial page load is protected

- **WHEN** a user selects Dark while the session probe is still in flight, and the app
  then resolves them as authenticated with a stored theme of `light`
- **THEN** the applied theme remains `dark`

#### Scenario: No in-session choice

- **WHEN** an authenticated user makes no theme choice and the settings request resolves
  with `theme: 'dark'`
- **THEN** the applied theme becomes `dark`

### Requirement: Theme follows the user across devices at login

On login, the system SHALL apply the theme stored on the server, so a preference set on
one device takes effect on another.

#### Scenario: Preference set elsewhere applies at login

- **WHEN** a user set Dark on another device and logs in on a device whose cache holds
  `light`
- **THEN** the applied theme becomes `dark` once the settings request succeeds
- **AND** the device cache is updated to `dark`

#### Scenario: Sync applies once per login

- **WHEN** the settings data is refetched later in the same session
- **THEN** the applied theme is not re-synced over the user's current choice

#### Scenario: A guest picks a theme and then logs in

- **WHEN** a user picks Light while logged out and then logs in to an account whose
  stored theme is `dark`, without reloading
- **THEN** the applied theme becomes `dark`
- **AND** the choice made while logged out does not suppress it

#### Scenario: A second account logs in on the same page

- **WHEN** one user changes their theme, logs out, and another user logs in without a
  reload
- **THEN** the second user's stored theme is applied

### Requirement: Apply the theme before first paint

The system SHALL apply the resolved theme to the document root before the first paint,
so no incorrect theme is displayed while the app initialises.

#### Scenario: Dark cached preference

- **WHEN** a user whose cached preference is `dark` loads the app
- **THEN** the dark theme is in effect on the first painted frame
- **AND** no light-themed frame is displayed

#### Scenario: Auto cached preference on a dark OS

- **WHEN** a user whose cached preference is `system` loads the app with a dark OS
  colour scheme
- **THEN** the dark theme is in effect on the first painted frame

#### Scenario: Hydration does not change the theme

- **WHEN** the app finishes initialising after a pre-paint theme was applied
- **THEN** the applied theme is unchanged

### Requirement: Degrade safely when the device cache is unavailable

The system SHALL continue to function when local storage cannot be read or written.
A storage failure MUST NOT prevent the app from loading or from applying a theme.

#### Scenario: Storage read throws at startup

- **WHEN** reading the cached preference throws
- **THEN** the app loads and the theme resolves from the OS colour scheme

#### Scenario: Storage write throws on selection

- **WHEN** writing the preference throws
- **THEN** the applied theme still changes
- **AND** an authenticated user's choice is still written to the settings API

#### Scenario: Corrupt cached value

- **WHEN** the cached preference is not one of the three valid values
- **THEN** it is treated as absent and the preference resolves to `system`

### Requirement: Theme persists across logout

The system SHALL leave the applied theme and the device cache unchanged when a user logs
out. Theme is device-scoped presentation state and is not cleared with the user's
personal data.

#### Scenario: Logout retains the theme

- **WHEN** a user with the dark theme applied logs out
- **THEN** the dark theme remains applied
- **AND** the device cache still holds `dark`

#### Scenario: Subsequent guest session

- **WHEN** the app is reloaded after that logout with no user logged in
- **THEN** the applied theme is `dark`

### Requirement: Browser-painted UI follows the applied theme

The system SHALL declare the document's colour scheme to match the applied theme, so
that native controls the app cannot style directly — select popups, scrollbars, and
form widgets — render in the same theme as the page.

#### Scenario: Native dropdown under the dark theme

- **WHEN** the applied theme is `dark` and a native select is opened
- **THEN** its popup renders in the dark scheme, not the light one

#### Scenario: Native dropdown under the light theme

- **WHEN** the applied theme is `light` and a native select is opened
- **THEN** its popup renders in the light scheme

### Requirement: Theme control presents all three options

Each theme control SHALL offer Auto, Light, and Dark, and SHALL indicate which is
currently selected based on the preference rather than the resolved theme. The navbar
control SHALL be operable by keyboard and carry an accessible label.

#### Scenario: Selected option reflects the preference

- **WHEN** the preference is `system` and it resolves to `dark`
- **THEN** the control shows Auto as selected, not Dark

#### Scenario: Keyboard operation

- **WHEN** a user opens the navbar theme control by keyboard
- **THEN** the options can be navigated and selected by keyboard
- **AND** the control exposes an accessible label

#### Scenario: Both controls agree

- **WHEN** the preference is changed from one control
- **THEN** the other control reflects the new preference
