## MODIFIED Requirements

### Requirement: Retrieve a valid saved position

The system SHALL select the store for the last-read position based on authentication
state. For an authenticated user the server SHALL be the source of truth. For an
unauthenticated user the system SHALL return the position from local storage, and
SHALL do so only when the stored value is a well-formed record containing a numeric
`surahNumber`, a string `surahName`, and a numeric `ayahNumber`.

#### Scenario: Well-formed stored position

- **WHEN** local storage holds a record with `surahNumber` (number), `surahName`
  (string), and `ayahNumber` (number)
- **THEN** the system returns that record as the last-read position

#### Scenario: No saved position

- **WHEN** local storage has no last-read entry
- **THEN** the system returns null

#### Scenario: Authenticated user

- **WHEN** an authenticated user requests their last-read position
- **THEN** the position stored on the server is returned
- **AND** local storage is not consulted

#### Scenario: Authenticated user with no server position

- **WHEN** an authenticated user has never recorded a last-read position on the server
- **THEN** the system returns null

### Requirement: Reject invalid stored data

The system SHALL treat any stored last-read value that is not a well-formed record as
if no position were saved, returning null rather than a malformed object. Invalid data
MUST NOT crash retrieval and MUST NOT surface partial or `undefined` field values to
consumers. A record carrying an optional `updatedAt` timestamp SHALL remain valid, and
a record lacking `updatedAt` SHALL remain valid.

#### Scenario: Unparseable data

- **WHEN** the stored last-read value is not valid JSON
- **THEN** the system returns null

#### Scenario: Wrong-shaped data

- **WHEN** the stored value parses successfully but is missing a required field or has
  a field of the wrong type (e.g. `{ "surahNumber": 2 }` or a bare string)
- **THEN** the system returns null

#### Scenario: Record written before timestamps existed

- **WHEN** the stored value is well-formed but has no `updatedAt` field
- **THEN** the system returns that record as the last-read position

#### Scenario: Record with a malformed timestamp

- **WHEN** the stored value is otherwise well-formed but `updatedAt` is not a number
- **THEN** the system returns the record with its timestamp treated as absent
- **AND** retrieval does not fail

### Requirement: Persist a position

The system SHALL persist a last-read position to the store selected by authentication
state, without disrupting the reading experience if the write fails. For an
authenticated user the position SHALL be written to the server. For an unauthenticated
user it SHALL be written to local storage together with an `updatedAt` timestamp.

#### Scenario: Save succeeds

- **WHEN** an unauthenticated user's last-read position is saved
- **THEN** the value is written to local storage under the last-read key
- **AND** the record carries an `updatedAt` timestamp

#### Scenario: Storage unavailable

- **WHEN** writing to local storage throws (e.g. quota exceeded or storage disabled)
- **THEN** the failure is swallowed and does not propagate to the caller

#### Scenario: Authenticated save

- **WHEN** an authenticated user's last-read position is saved
- **THEN** the position is written to the server

#### Scenario: Server write fails

- **WHEN** an authenticated user's last-read position fails to save to the server
- **THEN** the failure does not propagate to the caller
- **AND** the reading experience is not interrupted

## ADDED Requirements

### Requirement: Sign-in resolves local and server positions by recency

When a user signs in, the system SHALL reconcile any local last-read position with the
server position by choosing the more recently updated of the two. A local record
without an `updatedAt` timestamp SHALL be treated as older than any server position.
Once the position is server-owned, the local last-read entry SHALL be cleared so that
exactly one source of truth exists per authentication state.

#### Scenario: Local position only

- **WHEN** a user with a local position and no server position signs in
- **THEN** the local position is written to the server
- **AND** the local entry is cleared

#### Scenario: Server position only

- **WHEN** a user with no local position and an existing server position signs in
- **THEN** the server position is used

#### Scenario: Local position is newer

- **WHEN** a user signs in with a local position whose `updatedAt` is later than the
  server position's last update
- **THEN** the local position is written to the server
- **AND** the local entry is cleared

#### Scenario: Server position is newer

- **WHEN** a user signs in with a local position whose `updatedAt` is earlier than the
  server position's last update
- **THEN** the server position is used
- **AND** the local entry is cleared

#### Scenario: Local position has no timestamp

- **WHEN** a user signs in with a local position lacking `updatedAt` and a server
  position exists
- **THEN** the server position is used

#### Scenario: Neither position exists

- **WHEN** a user with no local and no server position signs in
- **THEN** no position is set and no error is raised

### Requirement: Retrieval degrades when the server is unreachable

When an authenticated user's last-read position cannot be fetched, the system SHALL
report the absence of a position rather than an error state that blocks reading, and
SHALL NOT fall back to a stale local value that may belong to a different user.

#### Scenario: Fetch fails

- **WHEN** an authenticated user's last-read position cannot be retrieved from the
  server
- **THEN** no continue-reading position is offered
- **AND** browsing and reading remain fully usable

#### Scenario: No fallback to another user's local value

- **WHEN** an authenticated user's position cannot be retrieved and a local entry from
  a previous guest session exists
- **THEN** the local entry is not used as the authenticated user's position

### Requirement: Sign-out returns the user to guest behaviour

After sign-out the system SHALL resume treating local storage as the source of truth
and SHALL NOT retain the signed-in user's position for the next guest session.

#### Scenario: Position after sign-out

- **WHEN** a user signs out
- **THEN** the previously authenticated user's last-read position is not offered to the
  guest session
