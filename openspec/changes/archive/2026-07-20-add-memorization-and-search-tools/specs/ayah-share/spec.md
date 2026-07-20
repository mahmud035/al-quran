## ADDED Requirements

### Requirement: Copy an ayah to the clipboard

Each ayah SHALL offer an action that copies that ayah to the system clipboard as
plain text.

#### Scenario: Copying an ayah

- **WHEN** the user activates the copy action on an ayah
- **THEN** the formatted ayah text is written to the clipboard

#### Scenario: Action is available on every ayah

- **WHEN** a surah is rendered
- **THEN** every ayah exposes a copy action

### Requirement: Shared text format

Copied and shared text SHALL contain the Arabic text, the active translation, and a
reference line naming the surah and giving the surah and ayah numbers, in that order,
separated by blank lines:

```
{arabic}

{translation}

— Surah {englishName} {surahNumber}:{ayahNumber}
```

The transliteration SHALL NOT be included.

#### Scenario: Format of a copied ayah

- **WHEN** the user copies surah 2 ayah 255 with the English translation active
- **THEN** the clipboard contains the Arabic text, then a blank line, then the English
  translation, then a blank line, then "— Surah Al-Baqara 2:255"

#### Scenario: Format follows the active translation

- **WHEN** the user's translation is Bengali and they copy an ayah
- **THEN** the copied text contains the Bengali translation

#### Scenario: Transliteration is excluded

- **WHEN** the user copies an ayah whose transliteration is displayed
- **THEN** the copied text does not contain the transliteration

### Requirement: Native share when available

Where the browser provides the Web Share API, the ayah SHALL additionally offer a
share action that opens the native share sheet with the same formatted text. The
capability SHALL be detected by feature test. Where it is unavailable, the share
action SHALL NOT be rendered and copy SHALL remain available.

#### Scenario: Share offered on a supporting browser

- **WHEN** the browser exposes the Web Share API
- **THEN** a share action is rendered alongside copy
- **AND** activating it opens the native share sheet with the formatted text

#### Scenario: Share hidden on a non-supporting browser

- **WHEN** the browser does not expose the Web Share API
- **THEN** no share action is rendered
- **AND** the copy action is still available

#### Scenario: Share dismissed by the user

- **WHEN** the user opens the native share sheet and dismisses it without sharing
- **THEN** no error is shown

### Requirement: Visible confirmation and failure feedback

Copy and share actions SHALL give visible feedback. A successful copy SHALL show a
transient confirmation on the control that reverts to the default state on its own. A
failed copy SHALL tell the user it failed rather than appearing to succeed.

#### Scenario: Successful copy is confirmed

- **WHEN** the copy succeeds
- **THEN** the control shows a transient copied confirmation
- **AND** the control returns to its default state without further user action

#### Scenario: Clipboard write rejected

- **WHEN** the clipboard write is rejected, for example because permission is denied
- **THEN** the user is informed that copying failed
- **AND** no copied confirmation is shown
