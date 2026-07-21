# reading-streak

## Purpose

Maintain and report a per-user reading streak driven by daily reading activity.
Days are bucketed by the client's IANA timezone, streak arithmetic operates only on
date-only values, and the displayed streak reflects staleness at read time without
mutating stored state.

## Requirements

### Requirement: Days are bucketed by the client's timezone

Each recording request SHALL carry an IANA timezone identifier. The system SHALL
determine the calendar day of the request by evaluating the current instant in that
timezone, producing a date-only value. Streak arithmetic SHALL operate only on
date-only values and SHALL NOT perform wall-clock or hour arithmetic.

#### Scenario: Evening reading counts for the local day

- **WHEN** a user in `Asia/Dhaka` records reading at 11pm local time
- **THEN** the activity is attributed to that local calendar date, not the following
  or preceding UTC date

#### Scenario: Zones on different calendar days

- **WHEN** two users in `Asia/Dhaka` and `Pacific/Auckland` record reading at the same
  instant, and that instant falls on different calendar dates in the two zones
- **THEN** each user's activity is attributed to their own local date

#### Scenario: Daylight saving transition

- **WHEN** a user records reading on a day when their timezone shifts for daylight
  saving
- **THEN** the day is bucketed correctly
- **AND** no streak day is duplicated or skipped by the transition

### Requirement: An invalid or missing timezone falls back to UTC

The system SHALL validate the supplied timezone identifier. When the identifier is
absent or not a valid IANA zone, the system SHALL bucket the day using UTC and SHALL
still record the reading. An invalid timezone SHALL NOT cause the recording request to
fail.

#### Scenario: Unrecognised timezone identifier

- **WHEN** a recording request supplies a timezone that is not a valid IANA zone
- **THEN** the ayahs are still recorded
- **AND** the day is bucketed using UTC

#### Scenario: Timezone omitted

- **WHEN** a recording request omits the timezone
- **THEN** the ayahs are still recorded
- **AND** the day is bucketed using UTC

### Requirement: Streak state

The system SHALL maintain per user the last active day as a date-only value, the
current streak count, and the longest streak achieved. A new user SHALL have no last
active day and a current streak of zero.

#### Scenario: First ever recording

- **WHEN** a user with no prior activity records reading
- **THEN** the current streak becomes 1
- **AND** the last active day is set to that day

#### Scenario: Longest streak is raised

- **WHEN** the current streak exceeds the recorded longest streak
- **THEN** the longest streak is updated to match

#### Scenario: Longest streak is retained after a break

- **WHEN** a user with a longest streak of 12 breaks their current streak
- **THEN** the longest streak remains 12

### Requirement: Streak transitions

On recording activity for local day `D`, the system SHALL apply exactly one
transition:

- `D` equal to the last active day SHALL leave the streak unchanged.
- `D` exactly one day after the last active day SHALL increment the streak.
- `D` more than one day after the last active day SHALL reset the streak to 1.
- `D` earlier than the last active day SHALL leave the streak and last active day
  unchanged.

#### Scenario: Second reading on the same day

- **WHEN** a user records reading twice on the same local day
- **THEN** the current streak is unchanged after the second recording

#### Scenario: Reading on consecutive days

- **WHEN** a user with a streak of 4 and a last active day of yesterday records
  reading today
- **THEN** the current streak becomes 5

#### Scenario: Reading after a gap

- **WHEN** a user with a streak of 7 and a last active day three days ago records
  reading today
- **THEN** the current streak becomes 1

#### Scenario: Day earlier than the last active day

- **WHEN** a recording resolves to a day earlier than the stored last active day, for
  example after travelling westward across timezones
- **THEN** the current streak is unchanged
- **AND** the last active day is unchanged
- **AND** the streak is not broken

#### Scenario: Month and year boundaries

- **WHEN** a user's last active day is the final day of a month or year and they record
  reading on the following day
- **THEN** the current streak increments

### Requirement: Displayed streak reflects staleness

Reporting SHALL return a display streak computed at read time against the requesting
client's timezone. When the last active day is the client's today or yesterday, the
display streak SHALL be the stored current streak. A last active day later than the
client's today SHALL also be treated as current, mirroring the write-side rule that an
earlier day never breaks a streak. Otherwise the display streak SHALL be zero. The
stored current streak SHALL NOT be mutated by a read.

#### Scenario: Read today

- **WHEN** a user with a stored streak of 5 last read today and requests their progress
- **THEN** the display streak is 5

#### Scenario: Read yesterday, still active

- **WHEN** a user with a stored streak of 5 last read yesterday and requests their
  progress
- **THEN** the display streak is 5

#### Scenario: Last active day is ahead of the client's today

- **WHEN** a user's last active day is later than the requesting client's today, for
  example after travelling westward across timezones
- **THEN** the display streak is the stored current streak

#### Scenario: Streak has lapsed

- **WHEN** a user with a stored streak of 5 last read three days ago and requests their
  progress
- **THEN** the display streak is 0

#### Scenario: Reading does not resurrect a lapsed streak

- **WHEN** a user whose streak has lapsed records reading again
- **THEN** the current streak becomes 1, not the previously stored value

#### Scenario: Reads do not mutate state

- **WHEN** a user with a lapsed streak requests their progress without reading
- **THEN** the stored current streak and last active day are unchanged

### Requirement: Streak requires an account

Streak tracking SHALL require an authenticated user. Unauthenticated users SHALL have
no streak recorded or reported.

#### Scenario: Guest reads

- **WHEN** an unauthenticated user reads a surah
- **THEN** no streak state is created or updated
