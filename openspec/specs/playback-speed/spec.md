# playback-speed

## Purpose

Define the user-selectable recitation speed: its allowed values, how it applies to the audio element across ayah transitions, and its session-scoped lifetime.

## Requirements

### Requirement: Selectable playback speed

The player SHALL allow the user to select a recitation speed from a fixed set of
values: 0.5, 0.75, 1, 1.25, 1.5, and 2. The default speed SHALL be 1. Arbitrary or
continuously variable speeds SHALL NOT be offered.

#### Scenario: Default speed

- **WHEN** the application loads and no speed has been chosen
- **THEN** the playback speed is 1

#### Scenario: Selecting a slower speed

- **WHEN** the user selects 0.5 while an ayah is playing
- **THEN** the audio immediately plays at half speed
- **AND** playback does not restart from the beginning of the ayah

#### Scenario: Only fixed values are offered

- **WHEN** the user opens the speed control
- **THEN** exactly the values 0.5, 0.75, 1, 1.25, 1.5, and 2 are available

### Requirement: Speed persists across ayah transitions

The selected speed SHALL remain in effect when playback moves from one ayah to the
next, including advancing at the end of a track, manual navigation, repeat-driven
replays, and reciter changes. Loading a new audio source SHALL NOT silently reset the
speed to 1.

#### Scenario: Speed survives advancing to the next ayah

- **WHEN** the speed is 0.75 and playback advances from one ayah to the next
- **THEN** the next ayah plays at 0.75

#### Scenario: Speed survives a repeated replay

- **WHEN** the speed is 1.5 and repeat-ayah replays the current ayah
- **THEN** the replay plays at 1.5

#### Scenario: Speed survives a reciter change

- **WHEN** the speed is 0.5 and the user selects a different reciter
- **THEN** the new reciter's audio plays at 0.5

#### Scenario: Speed survives jumping to a different surah

- **WHEN** the speed is 1.25 and the user starts playing a different surah
- **THEN** the first ayah of the new surah plays at 1.25

### Requirement: Speed is session-scoped

The selected speed SHALL be held in player state only. It SHALL NOT be written to
user settings, the server, or local storage, and SHALL reset to 1 on page reload.

#### Scenario: Speed resets on reload

- **WHEN** the user selects 2 and then reloads the page
- **THEN** the playback speed is 1

#### Scenario: No settings request is issued

- **WHEN** the user changes the playback speed
- **THEN** no request is sent to the settings endpoint

### Requirement: Speed control is visible in the player

The player interface SHALL display the current speed and allow changing it. When the
speed is not 1, the control SHALL be rendered in a visibly active state so a
non-default speed is never silently in effect.

#### Scenario: Current speed is displayed

- **WHEN** the speed is 1.5
- **THEN** the player displays 1.5 as the current speed

#### Scenario: Non-default speed is highlighted

- **WHEN** the speed is any value other than 1
- **THEN** the speed control is rendered in a visibly active state

#### Scenario: Default speed is not highlighted

- **WHEN** the speed is 1
- **THEN** the speed control is rendered in its normal, inactive state
