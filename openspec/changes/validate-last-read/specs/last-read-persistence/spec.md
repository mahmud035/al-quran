## ADDED Requirements

### Requirement: Retrieve a valid saved position

The system SHALL return the user's saved last-read position from local storage only when the stored value is a well-formed record containing a numeric `surahNumber`, a string `surahName`, and a numeric `ayahNumber`.

#### Scenario: Well-formed stored position

- **WHEN** local storage holds a record with `surahNumber` (number), `surahName` (string), and `ayahNumber` (number)
- **THEN** the system returns that record as the last-read position

#### Scenario: No saved position

- **WHEN** local storage has no last-read entry
- **THEN** the system returns null

### Requirement: Reject invalid stored data

The system SHALL treat any stored last-read value that is not a well-formed record as if no position were saved, returning null rather than a malformed object. Invalid data MUST NOT crash retrieval and MUST NOT surface partial or `undefined` field values to consumers.

#### Scenario: Unparseable data

- **WHEN** the stored last-read value is not valid JSON
- **THEN** the system returns null

#### Scenario: Wrong-shaped data

- **WHEN** the stored value parses successfully but is missing a required field or has a field of the wrong type (e.g. `{ "surahNumber": 2 }` or a bare string)
- **THEN** the system returns null

### Requirement: Persist a position

The system SHALL persist a last-read position to local storage without disrupting the reading experience if the write fails.

#### Scenario: Save succeeds

- **WHEN** a last-read position is saved
- **THEN** the value is written to local storage under the last-read key

#### Scenario: Storage unavailable

- **WHEN** writing to local storage throws (e.g. quota exceeded or storage disabled)
- **THEN** the failure is swallowed and does not propagate to the caller
