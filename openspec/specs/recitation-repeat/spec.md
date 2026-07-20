# recitation-repeat

## Purpose

Define repeat behaviour for per-ayah audio playback — repeat-ayah with a play count, repeat over a contiguous ayah range, and loop-surah — including how each mode interacts with manual navigation, reciter changes, loading a different surah, and reaching the end of a surah.

## Requirements

### Requirement: Repeat mode selection

The player SHALL support four repeat modes: off, repeat-ayah with a play count,
repeat-range over a contiguous span of ayahs with a play count, and loop-surah.
Exactly one mode SHALL be active at a time. The default mode SHALL be off.

Repeat state SHALL be session-scoped: held in player state, not persisted to user
settings or local storage, and reset to off on page reload.

#### Scenario: Default mode on first load

- **WHEN** the application loads and no repeat mode has been chosen
- **THEN** the repeat mode is off
- **AND** playback behaves exactly as it did before this change

#### Scenario: Repeat mode does not survive reload

- **WHEN** the user selects any repeat mode and then reloads the page
- **THEN** the repeat mode is off

#### Scenario: Selecting a mode replaces the previous one

- **WHEN** repeat-ayah is active and the user selects loop-surah
- **THEN** loop-surah is the active mode
- **AND** repeat-ayah is no longer active

### Requirement: Track completion is distinct from user navigation

The player SHALL distinguish audio finishing naturally from the user requesting the
next ayah. Repeat behaviour SHALL apply only to natural completion. The manual next
and previous controls SHALL advance or rewind by exactly one ayah regardless of the
active repeat mode.

#### Scenario: Manual next during repeat-ayah

- **WHEN** repeat-ayah with count 3 is active, one play has completed, and the user
  presses next
- **THEN** playback moves to the following ayah
- **AND** the ayah is not repeated again

#### Scenario: Manual previous during loop-surah

- **WHEN** loop-surah is active and the user presses previous
- **THEN** playback moves back exactly one ayah

#### Scenario: Previous at the first ayah

- **WHEN** the current ayah is the first in the playlist and the user presses previous
- **THEN** the index remains at the first ayah

### Requirement: Repeat-ayah replays the current ayah a fixed number of times

When repeat-ayah with count N is active and a track completes, the player SHALL
replay the same ayah until it has played N times in total, then advance to the next
ayah and reset the completed-play counter.

The available counts SHALL be 2, 3, 5, 10, and unbounded. Under an unbounded count
the player SHALL replay the current ayah indefinitely and SHALL NOT advance on its
own; the user ends it by pausing or by changing the repeat mode.

#### Scenario: Replay before the count is reached

- **WHEN** repeat-ayah with count 3 is active and the ayah completes its first play
- **THEN** the same ayah plays again from the beginning
- **AND** playback continues without a gap or refetch

#### Scenario: Advance after the count is reached

- **WHEN** repeat-ayah with count 3 is active and the ayah completes its third play
- **THEN** playback advances to the next ayah
- **AND** the completed-play counter resets to zero

#### Scenario: Counter resets when position changes

- **WHEN** repeat-ayah with count 3 is active, one play has completed, and the user
  jumps to a different ayah
- **THEN** the completed-play counter resets to zero
- **AND** the new ayah is played its full count of 3 times

#### Scenario: Repeat-ayah at the last ayah of the surah

- **WHEN** repeat-ayah is active on the final ayah and it completes its full count
- **THEN** end-of-surah behaviour applies: playback stops and the index resets to the
  first ayah

#### Scenario: Unbounded repeat never advances

- **WHEN** repeat-ayah with an unbounded count is active and the ayah completes any
  number of plays
- **THEN** the same ayah plays again
- **AND** playback never advances to the next ayah on its own

#### Scenario: Ending an unbounded repeat

- **WHEN** repeat-ayah with an unbounded count is active and the user sets the repeat
  mode to off
- **THEN** the current ayah finishes and playback advances normally

#### Scenario: Unbounded repeat at the last ayah of the surah

- **WHEN** repeat-ayah with an unbounded count is active on the final ayah
- **THEN** that ayah continues to repeat
- **AND** end-of-surah behaviour does not apply

### Requirement: Repeat-range loops a contiguous span of ayahs

When repeat-range over `[start, end]` with count N is active, the player SHALL advance
normally within the range, and on completion of the ayah at `end` SHALL return to
`start` until the range has played N times in total, then stop.

The range SHALL be stored as playlist indices and SHALL satisfy `start <= end`.

#### Scenario: Advancing inside the range

- **WHEN** repeat-range over ayahs 3–7 is active and the ayah at index 4 completes
- **THEN** playback advances to index 5

#### Scenario: Looping back at the end of the range

- **WHEN** repeat-range over ayahs 3–7 with count 2 is active, one pass has completed,
  and the ayah at index 7 completes
- **THEN** playback jumps to index 3 and continues

#### Scenario: Stopping when the range count is exhausted

- **WHEN** repeat-range over ayahs 3–7 with count 2 is active and the ayah at index 7
  completes its second pass
- **THEN** playback stops
- **AND** playback does not continue past index 7

#### Scenario: Single-ayah range

- **WHEN** repeat-range is set with `start` equal to `end` and count 3
- **THEN** that one ayah plays 3 times and then playback stops

### Requirement: A completed range stays armed

When repeat-range exhausts its count, the player SHALL stop with the playhead at
`end`, SHALL keep the range and its count set, and SHALL reset the completed-pass
counter to zero. Pressing play SHALL re-run the same range from `start` for the full
count again. The range SHALL be cleared only by explicit user action, by navigating
outside it, or by loading a different surah.

#### Scenario: Range remains set after completion

- **WHEN** repeat-range over ayahs 3–7 with count 2 completes its second pass
- **THEN** the repeat mode is still repeat-range over ayahs 3–7 with count 2
- **AND** the completed-pass counter is zero

#### Scenario: Replaying a completed range

- **WHEN** a completed repeat-range over ayahs 3–7 with count 2 is armed and the user
  presses play
- **THEN** playback starts from ayah 3
- **AND** the range runs the full count of 2 passes again

#### Scenario: Playhead position after completion

- **WHEN** repeat-range over ayahs 3–7 completes its count
- **THEN** the current ayah is 7

### Requirement: Navigating outside an active range cancels it

When repeat-range is active and the user navigates to an ayah outside `[start, end]`,
the player SHALL clear the repeat mode to off rather than forcing playback back into
the range.

#### Scenario: Manual jump outside the range

- **WHEN** repeat-range over ayahs 3–7 is active and the user plays ayah 12 directly
- **THEN** the repeat mode becomes off
- **AND** playback continues from ayah 12 without looping

#### Scenario: Manual jump inside the range

- **WHEN** repeat-range over ayahs 3–7 is active and the user plays ayah 5 directly
- **THEN** the range remains active
- **AND** the completed-pass counter resets to zero

#### Scenario: Manual navigation does not cancel other modes

- **WHEN** repeat-ayah or loop-surah is active and the user jumps to any ayah within
  the same surah
- **THEN** the repeat mode remains active

### Requirement: Loading a different surah resets repeat

Range bounds are indices into the loaded playlist, so they carry no meaning against a
different surah's. When a surah is loaded, the player SHALL reset the repeat mode to
off and the completed-play counter to zero, whatever mode was previously active.

#### Scenario: Range does not carry across surahs

- **WHEN** repeat-range over ayahs 3–7 is active and the user opens a different surah
- **THEN** the repeat mode is off

#### Scenario: Counted repeat does not carry across surahs

- **WHEN** repeat-ayah with count 3 is active with one play completed and the user
  opens a different surah
- **THEN** the repeat mode is off
- **AND** the completed-play counter is zero

### Requirement: Loop-surah restarts the surah indefinitely

When loop-surah is active and the final ayah of the playlist completes, the player
SHALL return to the first ayah and continue playing, without a play limit.

#### Scenario: Wrapping at the end of the surah

- **WHEN** loop-surah is active and the final ayah completes
- **THEN** playback resumes from the first ayah
- **AND** playback remains in the playing state

#### Scenario: Advancing mid-surah under loop-surah

- **WHEN** loop-surah is active and a non-final ayah completes
- **THEN** playback advances to the next ayah

### Requirement: Repeat off preserves existing end-of-surah behaviour

When the repeat mode is off, track completion SHALL produce exactly the behaviour
present before this change: advance to the next ayah, and on completion of the final
ayah stop playback and reset the index to the first ayah.

#### Scenario: Final ayah with repeat off

- **WHEN** the repeat mode is off and the final ayah of the surah completes
- **THEN** playback stops
- **AND** the current ayah index resets to the first ayah

### Requirement: Repeat state survives a reciter change

Changing the reciter rebuilds the playlist for the same ayahs at the same indices.
The player SHALL preserve the active repeat mode, its range bounds, and its counters
across a reciter change.

#### Scenario: Reciter switched during repeat-range

- **WHEN** repeat-range over ayahs 3–7 is active and the user selects a different
  reciter
- **THEN** the range remains 3–7 and stays active
- **AND** playback continues from the current ayah in the new reciter's audio

#### Scenario: Reciter switched during repeat-ayah

- **WHEN** repeat-ayah with count 3 is active with one play completed and the user
  selects a different reciter
- **THEN** repeat-ayah with count 3 remains active
- **AND** the current ayah continues to repeat to its full count

### Requirement: Repeat controls are visible in the player

The player interface SHALL expose the active repeat mode and allow changing it. When
a mode with a play count is active, the interface SHALL show progress through that
count. When repeat-range is active, the interface SHALL show the range bounds.

#### Scenario: Active mode is visually distinguishable

- **WHEN** any repeat mode other than off is active
- **THEN** the repeat control is rendered in a visibly active state

#### Scenario: Count progress is shown

- **WHEN** repeat-ayah with count 3 is active and one play has completed
- **THEN** the interface indicates the current play position within the count

#### Scenario: Unbounded count is shown as infinity

- **WHEN** repeat-ayah with an unbounded count is active
- **THEN** the interface displays an infinity indicator rather than a play position

#### Scenario: Range bounds are shown

- **WHEN** repeat-range over ayahs 3–7 is active
- **THEN** the interface displays the range as ayah numbers, not playlist indices
