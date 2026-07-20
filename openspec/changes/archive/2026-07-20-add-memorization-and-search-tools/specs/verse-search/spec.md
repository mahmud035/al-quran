## ADDED Requirements

### Requirement: Full-text search over the active translation

The search page SHALL search the text of the user's active translation edition and
return matching verses. The search SHALL cover the selected translation edition only;
it SHALL NOT search the Arabic text or other editions.

#### Scenario: Query returns matching verses

- **WHEN** the user searches for a phrase present in the active translation
- **THEN** matching verses are listed with their surah name and ayah reference

#### Scenario: Results follow the active translation

- **WHEN** the user's translation is Bengali and they search Bengali text
- **THEN** matching verses from the Bengali edition are returned

#### Scenario: Changing translation re-runs the search

- **WHEN** results are displayed and the user changes their translation setting
- **THEN** the results are refetched for the new edition rather than left stale

### Requirement: Surah-name matching is preserved

The existing surah-name search SHALL continue to work in the same input. A query
SHALL be matched against surah English name, name translation, Arabic name, and
number using the existing matching rules, and those matches SHALL be presented
alongside verse results.

#### Scenario: Query matching a surah name

- **WHEN** the user searches "Baqara"
- **THEN** Surah Al-Baqara appears in the surah results

#### Scenario: Query matching a surah number

- **WHEN** the user searches "2"
- **THEN** Surah Al-Baqara appears in the surah results

#### Scenario: Surah results are ordered first

- **WHEN** a query matches both a surah name and verse text
- **THEN** surah matches are rendered above verse matches
- **AND** each group is under its own heading

### Requirement: Minimum query length

The application SHALL NOT issue a verse search request for a query shorter than three
characters, measured after trimming whitespace. Surah-name matching SHALL remain
available for shorter queries.

#### Scenario: Two-character query issues no request

- **WHEN** the user types a two-character query
- **THEN** no verse search request is sent

#### Scenario: Short query still matches surahs

- **WHEN** the user types "2"
- **THEN** surah results are shown
- **AND** the verse results section indicates that a longer query is required

#### Scenario: Request issued at three characters

- **WHEN** the user types a three-character query
- **THEN** a verse search request is sent for that query

### Requirement: Input is debounced

Verse search requests SHALL be debounced so that typing a query continuously does not
issue a request per keystroke.

#### Scenario: Typing continuously issues one request

- **WHEN** the user types a seven-character query without pausing
- **THEN** a single verse search request is sent for the final query value

### Requirement: Zero matches is an empty result, not an error

The content API responds to a zero-match query with HTTP 404. The application SHALL
treat that response as a successful search returning zero results, and SHALL NOT
render it as a failure. Any other error status SHALL render the error state.

#### Scenario: No matching verses

- **WHEN** the user searches a phrase that appears in no verse and the API responds 404
- **THEN** an empty state is shown indicating nothing matched the query
- **AND** no error message is shown

#### Scenario: Network or server failure

- **WHEN** the verse search request fails with a status other than 404
- **THEN** an error state is shown with a retry action

#### Scenario: Retry after failure

- **WHEN** the error state is shown and the user activates retry
- **THEN** the verse search request is reissued for the current query

### Requirement: Result count is capped for rendering

The application SHALL render at most 50 verse matches. When the total match count
exceeds the cap, the interface SHALL display both the number rendered and the true
total so the user knows the list is truncated.

#### Scenario: Result set under the cap

- **WHEN** a query returns 12 matches
- **THEN** all 12 are rendered
- **AND** the total count of 12 is displayed

#### Scenario: Result set over the cap

- **WHEN** a query returns 6150 matches
- **THEN** exactly 50 are rendered
- **AND** the interface indicates that 50 of 6150 are shown

### Requirement: Results deep-link to the verse

Each verse result SHALL link to its ayah within the surah reader, scrolling that ayah
into view on arrival.

#### Scenario: Opening a verse result

- **WHEN** the user activates a verse result for surah 2 ayah 255
- **THEN** the surah 2 reader opens
- **AND** ayah 255 is scrolled into view

### Requirement: Search states are explicit

The search page SHALL define a distinct rendering for each state: no query entered,
loading, results present, zero results, and error. No state SHALL render as a blank
region.

#### Scenario: No query entered

- **WHEN** the search input is empty
- **THEN** a prompt describing what can be searched is shown

#### Scenario: Request in flight

- **WHEN** a verse search request is in flight
- **THEN** a skeleton loading state is shown in the verse results section

#### Scenario: Surah results present while verses load

- **WHEN** surah matches are available and the verse request is still in flight
- **THEN** surah results render immediately
- **AND** the verse section shows its loading state independently
