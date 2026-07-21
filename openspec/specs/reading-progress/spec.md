# reading-progress

## Purpose

Track which of the 6236 ayahs an authenticated user has read, derived from
dwell-based passive recording, and report khatmah completion as coverage over the
whole Quran. Recording is buffered on the client, flushed in batches, survives
interruption, and is idempotent on the server.

## Requirements

### Requirement: An ayah is recorded as read after dwelling in the reading zone

The client SHALL record an ayah as read once it has held the reading zone
continuously for at least 2 seconds. Scrolling past an ayah without dwelling SHALL
NOT record it. No user action SHALL be required.

#### Scenario: Ayah dwells long enough

- **WHEN** an ayah occupies the reading zone continuously for 2 seconds
- **THEN** that ayah is recorded as read

#### Scenario: Ayah scrolled past quickly

- **WHEN** an ayah enters and leaves the reading zone in under 2 seconds
- **THEN** that ayah is not recorded as read

#### Scenario: Dwell interrupted and resumed

- **WHEN** an ayah is in the reading zone for 1 second, leaves, and later returns for
  2 continuous seconds
- **THEN** that ayah is recorded as read on the second visit

#### Scenario: Ayah reached during audio playback

- **WHEN** audio playback scrolls an ayah into the reading zone and it dwells for 2
  seconds
- **THEN** that ayah is recorded as read

### Requirement: Reads are buffered and flushed in batches

The client SHALL accumulate qualifying ayahs in a pending set and send them in
batches rather than issuing one request per ayah. The buffer SHALL be flushed on a
recurring interval while entries are pending, when the page becomes hidden, when the
reader unmounts, and on page hide.

#### Scenario: Many ayahs read in one session

- **WHEN** a user reads 100 ayahs over several minutes
- **THEN** the ayahs are sent in batched requests
- **AND** no request is issued for an individual ayah

#### Scenario: Periodic flush

- **WHEN** ayahs are pending and the flush interval elapses
- **THEN** the pending ayahs are sent and the pending set is cleared

#### Scenario: Flush when the tab is hidden

- **WHEN** ayahs are pending and the page visibility changes to hidden
- **THEN** the pending ayahs are sent

#### Scenario: Flush on page hide

- **WHEN** ayahs are pending and the page is being unloaded
- **THEN** the pending ayahs are sent using a delivery mechanism that survives unload

#### Scenario: No pending ayahs

- **WHEN** a flush is triggered and the pending set is empty
- **THEN** no request is issued

### Requirement: Unflushed reads survive interruption

The pending set SHALL be mirrored to local storage so that a failed, dropped, or
interrupted flush is retried rather than lost. The mirror SHALL be bounded in size;
when the bound is reached, the oldest pending entries SHALL be dropped so that
recording continues to accept new ayahs.

#### Scenario: Flush fails

- **WHEN** a flush request fails
- **THEN** the ayahs remain pending
- **AND** they are included in a later flush

#### Scenario: Pending reads recovered after reload

- **WHEN** ayahs are pending, the tab closes before they are delivered, and the user
  returns later
- **THEN** the previously pending ayahs are sent

#### Scenario: Mirror bound reached

- **WHEN** the pending mirror reaches its size bound and a new ayah qualifies
- **THEN** the newest ayah is accepted
- **AND** the oldest pending entry is dropped rather than blocking recording

### Requirement: Recording is idempotent

Recording an ayah that is already recorded SHALL have no effect on stored coverage.
Duplicate or replayed batches SHALL be safe and SHALL NOT require client-side
deduplication.

#### Scenario: Same ayah recorded twice

- **WHEN** an ayah already present in coverage is recorded again
- **THEN** coverage is unchanged

#### Scenario: Batch delivered twice

- **WHEN** the same batch of ayahs is delivered twice, for example by a retry
- **THEN** the resulting coverage is identical to delivering it once

### Requirement: Coverage records which ayahs have been read

The system SHALL store, per user, which of the 6236 ayahs have been read. The
representation SHALL be fixed in size regardless of how sequentially or erratically
the user reads.

#### Scenario: Non-contiguous reading

- **WHEN** a user reads surah 2 and later surah 18 without reading anything between
- **THEN** coverage reflects exactly those ayahs as read
- **AND** the ayahs between them are not marked read

#### Scenario: Coverage size is independent of reading pattern

- **WHEN** one user reads sequentially and another reads scattered ayahs totalling the
  same count
- **THEN** the stored coverage representation is the same size for both

#### Scenario: New user has empty coverage

- **WHEN** a user has never recorded any reading
- **THEN** coverage is empty and no progress document is required to exist

### Requirement: Khatmah percentage is derived from coverage

The system SHALL report khatmah progress as the proportion of the 6236 ayahs present
in coverage. The value SHALL be derived from stored coverage, never accumulated
independently.

#### Scenario: Partial completion

- **WHEN** a user's coverage contains 3118 ayahs
- **THEN** the reported khatmah percentage is 50

#### Scenario: No reading recorded

- **WHEN** a user has empty coverage
- **THEN** the reported khatmah percentage is 0

#### Scenario: Re-reading does not increase percentage

- **WHEN** a user re-reads ayahs already in their coverage
- **THEN** the khatmah percentage is unchanged

### Requirement: Recorded ayah numbers are validated

The system SHALL reject recording requests containing ayah numbers outside the range
1 to 6236, and SHALL cap the number of ayahs accepted in a single request.

#### Scenario: Out-of-range ayah number

- **WHEN** a recording request contains an ayah number of 0 or 6237
- **THEN** the request is rejected with a validation error

#### Scenario: Oversized batch

- **WHEN** a recording request contains more ayahs than the permitted maximum
- **THEN** the request is rejected with a validation error

### Requirement: Progress requires an account

Recording coverage SHALL require an authenticated user. Unauthenticated users SHALL
NOT have coverage recorded and the client SHALL NOT buffer or attempt progress writes
for them. Reading and listening SHALL remain fully available without an account.

#### Scenario: Guest reads a surah

- **WHEN** an unauthenticated user reads a surah
- **THEN** no coverage is recorded
- **AND** no progress request is issued

#### Scenario: Unauthenticated request to record

- **WHEN** a recording request arrives without valid authentication
- **THEN** it is rejected as unauthorised

#### Scenario: Guest reading remains unaffected

- **WHEN** an unauthenticated user reads and listens to a surah
- **THEN** all reading and playback behaviour works as it does for an authenticated user

### Requirement: Recording coverage is separate from last-read

Recording ayahs as read SHALL NOT update the last-read position, and updating the
last-read position SHALL NOT record coverage.

#### Scenario: Resuming a surah does not credit unread ayahs

- **WHEN** a user's last-read position is set to surah 2 ayah 200
- **THEN** ayahs 1 through 199 of surah 2 are not recorded as read by that action
