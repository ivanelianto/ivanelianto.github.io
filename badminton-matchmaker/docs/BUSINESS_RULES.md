# Badminton Matchmaker - Business Rules

This document describes all business logic and rules governing the application's behavior.

---

## Player Skill Classification

### Skill Classes
Players are classified into four skill levels:
- **C** (Beginner/Lowest)
- **B** (Intermediate)
- **A** (Advanced)
- **S** (Expert/Highest)

### Class Ranking Order
For algorithms and comparisons, classes are ranked:
```
S = 3 (highest comfort rank)
A = 2
B = 1
C = 0 (lowest comfort rank)
```

### Usage
- Used in matchmaking balance calculations
- Players of same class are considered more compatible
- Higher-ranked players are balanced against lower-ranked players

---

## Match Suggestion Algorithm

### Overview
The application generates suggested matches that prioritize fairness in three dimensions:
1. **Class Balance** (Primary)
2. **Play Fairness** (Secondary)
3. **Arrival Time** (Tertiary)

### Algorithm Details

#### Step 1: Candidate Pool
- Only players currently in the active schedule are candidates
- Blacklisted players (skipped) are excluded
- Sorted by:
  1. Number of matches played (ascending)
  2. Skill class (comfort rank ascending)

#### Step 2: Combination Generation
The algorithm generates all possible combinations of 4 players from candidates.

**Normal Mode:**
- All combinations evaluated
- Limit: Maximum 80 suggestions before selection

**Sparring Mode:**
- Only combinations respecting team membership
- Team A candidate pool: all players assigned to Team A
- Team B candidate pool: all players assigned to Team B
- All combinations evaluated as: 2 from Team A + 2 from Team B

#### Step 3: Score Evaluation
For each 4-player combination, evaluate all possible 2v2 team divisions.

**Class Balance Score Calculation:**
```
For Normal Mode (3 possible divisions):
- Division 1: [Player 1, Player 2] vs [Player 3, Player 4]
- Division 2: [Player 1, Player 3] vs [Player 2, Player 4]
- Division 3: [Player 1, Player 4] vs [Player 2, Player 3]

For each division:
1. Extract class ranks of each team
2. Sort ranks in descending order (highest skill first)
3. Pad shorter teams with rank 10 (penalty for uneven teams)
4. Calculate pairwise difference sum: |rank[0]_A - rank[0]_B| + |rank[1]_A - rank[1]_B|
5. Lower score = better balance

Best division for this combination = lowest pairwise difference
```

**Overall Score Calculation:**
```
For Normal Mode:
overall_score = class_diff * 1000 + play_count_sum

For Sparring Mode:
overall_score = class_diff * 100 + play_count_sum

Where:
- class_diff = pairwise difference from best division
- play_count_sum = total number of matches all 4 players have played in this schedule
```

**Tertiary Tie-Breaker (Arrival Time):**
If class balance and play count are equal, prefer combination with earliest arrival times (sum of arrival timestamps).

#### Step 4: Sorting & Selection
1. Sort all combinations by overall_score ascending (lower = better)
2. Return top 3 suggestions with lowest scores

### Result Format
Each suggestion includes:
```json
{
  "suggestionNo": 1,
  "teamA": ["PlayerName1", "PlayerName2"],
  "teamB": ["PlayerName3", "PlayerName4"],
  "overallBalanceScore": 1205,
  "shuttlecockUsage": { "shuttles": 0 }
}
```

---

## Normal Mode vs Sparring Mode

### Normal Mode (Default)
- **Team Assignment:** Not pre-assigned; any 4 players from schedule can form a match
- **Match Creation:** Can use suggestions or manually pick any 4 players
- **Team Division:** Algorithm determines optimal team split
- **Typical Use:** Casual sessions where teams form naturally

### Sparring Mode
- **Team Requirement:** Organizer defines two teams upfront (e.g., "TeamA" vs "TeamB")
- **Player Assignment:** Each player added to schedule must choose a team
- **Match Constraint:** Each match must be 2v2 - exactly 2 from each team
- **Manual Picking:** When manually creating a match, must select 2 from Team A and 2 from Team B
- **Suggestions:** Only suggest combinations that respect team boundaries
- **Typical Use:** Tournament-style play or pre-determined team leagues

### Mode Selection
- Chosen when creating a new schedule
- Cannot be changed after schedule creation
- Team names (if Sparring Mode) must be specified at schedule creation time

---

## Payment Calculation Rules

### Base Fees Configuration
- **Court Fee:** Rp15,000 per player per session (default, configurable per schedule)
- **Shuttlecock Fee:** Rp4,000 per shuttlecock per player (default, configurable per schedule)

### Payment Formula
```
total_payment = court_fee + (shuttlecock_count * shuttlecock_fee)

Where:
- court_fee: amount configured for the schedule (or global default)
- shuttlecock_count: sum of all shuttles used in matches where player participated
```

### Special Player Exceptions

#### Free Players (Always Zero Payment)
Players matching regex `/^(mei|asrofi)$/i` (case-insensitive):
- Pay Rp0 regardless of shuttlecock usage
- Database entry shows: `total_payment = 0`

#### Shuttle-Only Players
Players matching regex `/^(kelvinsen|miftah|ivan)$/i` (case-insensitive):
- Do NOT pay court fee
- DO pay only shuttlecock fee
- Formula for these players: `total_payment = shuttlecock_count * shuttlecock_fee`

#### Regular Players
All other players:
- Full formula applies: `total_payment = court_fee + (shuttlecock_count * shuttlecock_fee)`

### Payment Recalculation
Payment totals are **automatically recalculated** whenever:
1. A match is added to a schedule
2. A match is cancelled
3. Shuttlecock usage is incremented or decremented
4. A new schedule is loaded

The recalculation:
- Iterates all matches in schedule
- Aggregates shuttles per player
- Recalculates total for each player payment record
- Preserves `paymentMethod` field (does not clear collected payments)

### Payment Collection Methods
After payment is calculated, organizer must record the collection method:
- **Cash:** Payment received in cash
- **TF:** Payment received via Bank Transfer

Once a method is recorded, payment is marked as "collected" and hidden from unpaid list.

---

## Match Management Rules

### Match Creation
- **Match Number:** Sequential starting from 1 for each schedule
- **Player Count:** Always exactly 4 players
- **Unique ID:** UUID generated for each match
- **Timestamp:** Creation time recorded (`createdAt`)

### Shuttlecock Usage Tracking
- **Initial Value:** Defaults to 0 (or 2 in some contexts)
- **Increment/Decrement:** Can be adjusted by ±1 at any time
- **Minimum:** Cannot go below 0
- **Impact:** Affects all player payments in that match

### Match Cancellation
When a match is cancelled:
1. Match is removed from history
2. All payments for that schedule are recalculated
3. Players' match counts are recalculated
4. Payment records are preserved (not deleted)

### Match History
- Matches persist in history until explicitly cancelled
- Match order displayed by sequential match number
- Cannot edit match details directly (only shuttlecock and cancellation)

---

## Schedule Management Rules

### Schedule Creation
- **Date:** Must be valid ISO format (YYYY-MM-DD)
- **Session Name:** Optional label for the session
- **Mode:** Choose between Normal or Sparring
- **Fees:** Custom court and shuttlecock fees per schedule
- **Team Names:** Required only for Sparring Mode
- **ID:** UUID generated for each schedule
- **Timestamps:** Creation time recorded

### Active Schedule
- **Purpose:** Designates which schedule is currently being worked on
- **Persistence:** Remembered in app state and localStorage
- **Default:** The most recently created schedule (sorted by `createdAt` descending)
- **Usage:** All operations (add players, create matches, etc.) apply to active schedule

### Player Addition to Schedule
When a player is added to a schedule:
1. **Join Record Created:**
   - `playerId`: Reference to player
   - `joinTime`: Timestamp when added (used for arrival time)
   - `team`: Team assignment (Sparring Mode only)
2. **Arrival Time:** Used as tie-breaker in match suggestions
3. **Name Matching:** If player name matches existing player by name (case-insensitive), existing player is added (preserves their class)

### Player Removal from Schedule
When a player is removed from a schedule:
1. Player ID removed from `playerIds` array
2. Join record removed
3. All matches containing that player's name are CANCELLED
4. Payments are recalculated
5. Player is NOT deleted from master roster

### Fees Per Schedule
- Each schedule can have custom court and shuttlecock fees
- Default fees: Court Rp15,000, Shuttlecock Rp4,000
- Fees apply to all payments for that schedule
- Fees can differ between schedules

---

## Data Persistence Rules

### Storage Location
- **Primary Storage:** Browser localStorage
- **Storage Format:** JSON
- **Storage Keys:**
  - `bbmm:players.json`
  - `bbmm:schedules.json`
  - `bbmm:matches.json`
  - `bbmm:payments.json`

### Automatic Saves
Every data mutation triggers automatic save:
- Adding/editing/deleting player
- Creating/closing schedule
- Adding/removing player from schedule
- Creating/cancelling match
- Updating shuttlecock usage
- Recording payment method

### Initial Seed Data
On first app launch (when localStorage is empty):
- 18 default players are seeded from `playersSeed.js`
- Empty arrays for schedules, matches, payments

### Import/Export
- **Export:** All four data files can be exported as JSON simultaneously
- **Import:** Must provide valid JSON arrays for all four files
- **Replace:** Import completely replaces existing data
- **No Merge:** Import does not merge with existing data

### Reset
- **Confirmation Required:** User must confirm before reset
- **Action:** All data cleared, seed players restored
- **Result:** Fresh start state

---

## Autocomplete Rules

### Player Name Autocomplete
- **Trigger:** After 2 characters typed in player name field
- **Source:** All existing players in system
- **Matching:** Case-insensitive substring match
- **Sorting:** By name (A-Z) after filtering
- **Limit:** 8 results displayed
- **Display Format:** "Player Name · Class"
- **Selection:** Auto-select first result on Enter key or click

### Keyboard Navigation
- **Arrow Down/Up:** Move between suggestions
- **Enter:** Select highlighted suggestion
- **Escape:** Close autocomplete menu
- **Tab:** Does NOT close autocomplete (focus moves but menu stays open)

---

## Naming & Normalization

### Player Name Normalization
- Names are trimmed (leading/trailing whitespace removed)
- Names are case-sensitive in display (e.g., "ivan" vs "Ivan")
- Names use title case in some displays via `capitalizeEachWord()`
- Duplicate detection is case-insensitive

### Class Selection
- Valid classes: C, B, A, S
- Invalid input defaults to C
- Classes stored and displayed as single uppercase letter

### Validation
- Empty names are rejected with "Player name required" toast
- Names with only whitespace are treated as empty
- Special regex matching is case-insensitive (e.g., "MEI", "mei", "Mei" all match)

---

## Time & Date Handling

### Date Format
- **ISO Date:** YYYY-MM-DD (used internally)
- **Display Format (Nice):** DD/MM/YYYY (used in UI)
- **Display Format (Indonesian):** "Hari, DD Bulan YYYY" with locale-specific formatting

### Time Tracking
- **Arrival Time:** Recorded as Unix timestamp (milliseconds since epoch)
- **Display:** Converted to HH:MM format (24-hour in schedule view, 12-hour in payments)
- **Tie-Breaker:** Microsecond precision in timestamp for sorting

### Greeting System
Used in payment collection messages:
```
Hour 4-9:   "Pagi" (Morning)
Hour 10-14: "Siang" (Afternoon)
Hour 15-18: "Sore" (Evening)
Hour 19+:   "Malam" (Night)
```

---

## Team Labeling (Sparring Mode)

### Team Label Formatting
When displaying team names, a condensed label is generated:
- Keep first letter (even if vowel)
- Remove all vowels from rest
- Trim to max 3 letters total
- Convert to uppercase

Examples:
- "Team A" → "TA"
- "Red Dragons" → "RD"
- "Blue" → "BL"
- "Eagles" → "EGL"

---

## Error Handling & User Feedback

### Toast Notifications
Short messages displayed for user actions:
- "Saved" - Player saved successfully
- "Deleted" - Player deleted successfully
- "Player added" - Player added to schedule
- "Removed" - Player removed from schedule
- "Shuttlecock updated" - Shuttlecock count changed
- "Cancelled" - Match cancelled
- "Match added" - New match created
- "Player skipped" - Player blacklisted for suggestion regeneration
- "Imported" - Data imported successfully
- "Reset" - All data reset

### Confirmation Dialogs
Actions requiring confirmation:
- Delete player
- Remove player from schedule
- Cancel match
- Reset all data
- Set payment method

### Validation Feedback
- "Player name required" - Empty player name
- "Invalid class" - Invalid skill class selected
- "Create/select schedule first" - No active schedule
- "Select a team" - Sparring mode without team selection
- "Select a schedule first" - No schedule selected
- "Both team names required for Sparring Mode" - Missing team names
- "Court Fee must be a non-negative number" - Invalid fee
- "Shuttlecock Fee must be a non-negative number" - Invalid fee

---

## Accessibility & Internationalization

### Language
- **Default Language:** Indonesian with English UI labels
- **Greeting Messages:** Indonesian (Pagi, Siang, Sore, Malam)
- **Payment Text:** Indonesian instruction text
- **Bank Details:** Specific to Indonesia

### Localization
- **Currency:** Indonesian Rupiah (Rp)
- **Date Format:** Indonesian format (DD Bulan YYYY)
- **Number Format:** Indonesian thousands separator (e.g., 1.000.000 for million)
- **Phone/Bank:** Indonesian bank details in payment messages

### Currency Formatting
- Uses `toLocaleString('id-ID')` for rupiah formatting
- Automatically adds thousand separators
- Display format: "Rp1.000.000" (space after Rp)

---

## Performance Optimization

### Suggestion Algorithm Limits
- **Candidate Combinations:** Generate up to 80 possible combinations, then stop
- **Results:** Return top 3 suggestions
- **Blacklist:** Skipped players are retained during session for quick re-suggestion

### Autocomplete Limits
- **Min Characters:** 2 characters before suggestions appear
- **Max Results:** 8 items displayed
- **Debounce:** Updates on input event (no debounce delay)

### Data Structure Considerations
- **No Database Query:** All filtering/sorting done in-memory
- **localStorage Limit:** Typically 5-10 MB per domain (sufficient for typical groups)
- **Array Operations:** Used for all collections (no indexing)

---

## Known Behavior & Edge Cases

### Edge Case: Player Exists with Different Case
- Autocomplete suggests existing player "Ivan"
- User types "ivan" and selects autocomplete result
- Existing player "Ivan" is added (class preserved)
- Result: No duplicate created

### Edge Case: All Players in One Team (Sparring Mode)
- If only Team A has players (Team B empty)
- Suggestions will fail or show no results
- Matches cannot be created manually either
- User must add players to both teams first

### Edge Case: Very Few Players (n < 4)
- Suggestions cannot generate valid combinations
- Manual match picking is disabled (cannot select 4)
- User must add more players to schedule

### Edge Case: Schedule with Zero Matches
- Payments are still created for all players
- Total payment shows Rp0 if no shuttlecock usage
- Court fee is still charged (unless exempt player)

### Edge Case: Deleted Player in Old Match History
- Match can have playerName but player doesn't exist in roster
- Display shows "Unknown" or blank
- Payments are calculated based on playerName (not ID)

---

## Future Considerations (Documented in Code)

The application mentions future enhancements but does not implement them:
- Player attendance statistics
- Season/month summaries
- Multi-court support
- Real-time synchronization
- Cloud backup
- Mobile app version

These are noted in code comments but not prioritized for current version.
