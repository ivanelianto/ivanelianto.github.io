# Badminton Matchmaker - Features List

## Dashboard

### Description
Displays key metrics and quick links to all major features.

### Metrics Displayed
- **Total Players:** Count of all players in the system
- **Active Players Today:** Count of players added to the current active schedule
- **Total Matches Today:** Count of matches in the active schedule
- **Shuttlecock Usage:** Total shuttles used across all matches in active schedule
- **Outstanding Payments:** Count of unpaid payment records
- **Active Schedule Date:** Current schedule date formatted nicely

### User Actions
- View all metrics at a glance
- Navigation links to all other views

### Validation
- None (read-only view)

### Dependencies
- Requires active schedule for some metrics (displays "-" if none)

---

## Manage Players

### Description
Create, edit, and delete players from the roster.

### Implemented Features
- **Add Player:** Create new player with name, skill class (C/B/A/S), and optional note
- **Edit Player:** Update player class or note
- **Delete Player:** Remove player from roster (also removes from all schedules)
- **List All Players:** Sorted alphabetically by name
- **Autocomplete:** Player names auto-suggest when adding to schedules

### User Actions
- Click "➕ Add / Update Player" button to open modal
- Enter player name, select skill class, add optional note
- Click "Save" to create or update
- Click "Delete" button on player card to remove player
- Edit and delete buttons available for each player

### Validation Rules
- Player name is required and must not be empty after trim
- Skill class must be one of: C, B, A, S (defaults to C if invalid)
- Player names are normalized (whitespace trimmed)
- Duplicate prevention: If a player with the same name exists, autocomplete picks the existing one

### Special Logic
- When a player is deleted, they are removed from:
  - All schedules they were added to
  - They are **NOT** removed from match history (to preserve historical records)
- **Note Field:** Optional player note (e.g., "Plays doubles well", "Beginner")

### Dependencies
- `playersSeed.js` - Initial seed data on first run
- Storage system for persistence

---

## Manage Schedule

### Description
Create and manage badminton session schedules. Add players to schedules and track their arrival times.

### Implemented Features

#### Schedule Creation
- **Create New Schedule:** Modal to set:
  - Date (ISO format, defaults to today)
  - Session name (optional, e.g., "Friday Night Session")
  - Mode selection: Normal or Sparring
  - Court fee (Rp per player, default 15000)
  - Shuttlecock fee (Rp per shuttlecock, default 4000)
  - Team names (only for Sparring Mode)

#### Schedule Selection
- **Active Schedule Dropdown:** Select from all existing schedules
- **Close Schedule:** Clear active schedule (does not delete it)
- **Fee Display:** Show current court and shuttlecock fees

#### Add Players to Schedule
- **Autocomplete Input:** Type player name to add
- **Class Selection:** For new players, select skill class
- **Arrival Time Tracking:** Automatically recorded when player is added
- **Sparring Mode:** If enabled, must select team when adding player
- **Team Filter:** View players grouped by team (Sparring Mode only)

#### Player List Display
- **Normal Mode:** Simple list of all players in schedule with arrival times
- **Sparring Mode:** Players grouped by team with filter buttons (All/Team A/Team B)
- **Remove Player:** Button to remove player from schedule
- Confirmation dialog before removal

### User Actions
- Select or create a schedule
- Type player name into autocomplete input
- Click "Add Player" or press Enter
- (Sparring Mode) Select team before adding
- Click "Remove" (X) to remove player
- Click "Close" to clear active schedule

### Validation Rules
- Schedule date must be valid ISO date format (YYYY-MM-DD)
- Court fee and shuttlecock fee must be non-negative numbers
- For Sparring Mode: Both team names are required and must be non-empty
- Player names must not be empty
- When adding to Sparring Mode: Team selection is mandatory

### Special Logic
- **Player Reuse:** If a player name matches existing player, their existing class is preserved
- **Team Assignment:** In Sparring Mode, team assignment is stored with join record
- **Arrival Time:** Timestamp of when player was added to schedule
- **Schedule Fees:** Custom fees per schedule (allows different courts/rates)

### Dependencies
- Players must exist before adding to schedule
- Storage system for persistence
- Config file for default fees

---

## Manage Match

### Description
Create and manage matches within a session. Generate AI-suggested matches or manually pick players.

### Implemented Features

#### Match Suggestions
- **Generate Suggestions:** Click "⭐ See Suggestions" to generate up to 3 match suggestions
- **Suggestion Algorithm:** Based on:
  - Class balance (fair skill distribution)
  - Play frequency (prioritize players who played less)
  - Arrival time (tie-breaker: prefer earlier arrivals)
- **Skip Player:** Exclude a player to regenerate suggestions
- **Select Match:** Confirm a suggestion to add match to history

#### Manual Match Creation
- **Pick Players:** Click "+ Add Match" to open manual selection modal
- **4-Player Picking:** Select exactly 4 players from current schedule
- **Sparring Mode Constraint:** If enabled, exactly 2 must be from each team
- **Team Filter:** Filter candidates by team in Sparring Mode
- **Play Count Display:** Shows how many matches each player has participated in

#### Match History / History View
- **Match List:** All matches for current schedule sorted by match number
- **Match Display:**
  - Match number
  - Player names (Team A vs Team B format)
  - Shuttlecock usage count
- **Shuttlecock Tracking:** +1/-1 buttons to increment/decrement shuttles per match
- **Cancel Match:** Delete match from history with confirmation

#### Schedule Selection
- **Switch Schedule:** Dropdown to view/manage matches in different schedules
- **Active Schedule Persistence:** Selected schedule is remembered

### User Actions
- Click "⭐ See Suggestions" to view up to 3 suggestions
- Click "Select This Match" on a suggestion to add it
- Click "❌" next to a player name in suggestion to skip and regenerate
- Click "+ Add Match" to manually pick players
- Use team filter in Sparring Mode
- Click "Pick" or "Unpick" to select/deselect players
- Click "+1 ⚾" / "-1 ⚾" to adjust shuttlecock usage
- Click "❌ Cancel" to remove match

### Validation Rules
- Active schedule required
- Exactly 4 players must be selected for manual match creation
- In Sparring Mode: Exactly 2 from Team A and 2 from Team B
- Cannot pick more than 4 players total
- In Sparring Mode: Cannot pick more than 2 from the same team
- Shuttlecock count cannot go below 0

### Special Logic
- **Suggestion Limit:** Max 3 suggestions displayed
- **Suggestion Candidates:** Limited to players in active schedule only
- **Blacklist:** Skipped players are temporarily blacklisted for regeneration
- **Match Numbering:** Sequential starting from 1 per schedule
- **Auto-Payment:** Creating a match automatically ensures payment records exist

### Dependencies
- Schedule must be active
- Players must be added to schedule
- Config file for algorithm tuning

---

## Manage Payments

### Description
Track and manage payment collection from players.

### Implemented Features

#### Payment Calculation
- **Auto-Creation:** Payment records created automatically when matches are added
- **Per-Schedule:** Each schedule has independent payment calculations
- **Shuttlecock Aggregation:** Total shuttles per player across all matches
- **Payment Computation:**
  - Court fee: Rp15,000 per player (unless exempt)
  - Shuttlecock fee: Rp4,000 × total shuttles per player
  - Special exceptions for some players (see Business Rules)

#### Payment List
- **Unpaid Payments:** Display only records where `paymentMethod` is empty
- **Sortable:** Sort by date (ISO) in reverse chronological order
- **Search:** Filter by player name

#### Payment Methods
- **Set Payment Method:** Choose between "Cash" or "TF" (Bank Transfer)
- **Mark Collected:** Once method is set, payment is marked as collected
- **Payment Status:** Payments shown only in unpaid list until method is set

#### Payment Collection Message
- **Message Generation:** Pre-formatted message for collecting payment
- **Format:**
  - Greeting based on time of day (Pagi/Siang/Sore/Malam)
  - Player name
  - Schedule date in Indonesian format
  - Total payment amount in Rp with thousand separators
  - Bank transfer details (if configured)
- **Copy to Clipboard:** Easily copy message for WhatsApp/SMS

### User Actions
- Search unpaid payments by player name
- Click "Pay" button to set payment method
- Click "Collect Payment" button to view and copy collection message
- Select payment method (Cash or TF)
- Copy message and send via messaging app

### Validation Rules
- Payment method must be selected from valid options (Cash or TF)
- All payment calculations must be recalculated when shuttlecock usage changes

### Special Logic
- **Auto-Recalculation:** When shuttlecock usage is updated, all payments for that schedule are recalculated
- **Persistent Payment Records:** Payments are never deleted, only marked with method
- **Schedule Context:** Payments linked to specific schedules and dates
- **Exceptional Players:** Some players have special pricing rules (see Business Rules)

### Dependencies
- Matches must exist to generate payments
- Config file for fees and bank details
- Schedule information for date and fee reference

---

## Import / Export

### Description
Backup and restore all application data via JSON files.

### Implemented Features

#### Export
- **Export All Data:** Four textarea fields showing JSON for:
  - `players.json` - Player roster
  - `schedules.json` - All schedules
  - `matches.json` - All matches
  - `payments.json` - All payments
- **Copy-Friendly:** Pre-formatted JSON with indentation (2 spaces)
- **Manual Copy:** User manually copies each textarea content to save

#### Import
- **Paste JSON:** Four textarea fields to paste JSON arrays
- **Validation:** Only accepts valid JSON arrays
- **Replace Data:** Imports completely replace existing data
- **Format Check:** Each field must be a valid JSON array

#### Reset All
- **Dangerous Action:** Button to reset all data to seed state
- **Confirmation Required:** User must confirm reset
- **Re-Seed:** After reset, default players seed is restored

### User Actions
- Copy JSON content from export textareas
- Paste JSON into import textareas
- Click "Import" to load new data
- Click "Reset All" to clear all data and restore seed

### Validation Rules
- Each import field must contain valid JSON array format
- All four fields are required (can be empty arrays `[]`)
- Must be parseable JSON or import will fail

### Dependencies
- Storage system for save/load
- Seed data for reset functionality

---

## Theme Toggle

### Description
Switch between dark and light themes.

### Implemented Features
- **Theme Button:** Located in top-right corner (top-right of header)
- **Toggle:** Click to switch between themes
- **Visual Indicator:** 🌙 for dark mode, ☀️ for light mode
- **Persistence:** Theme preference saved to localStorage

### User Actions
- Click theme toggle button to switch
- Theme persists across sessions

### Dependencies
- localStorage for persistence
- CSS theme variables (`--bg`, `--panel`, `--text`, etc.)

---

## Navigation

### Description
Primary and secondary navigation for mobile app.

### Implemented Features

#### Top Navigation Bar (Header)
- **Hamburger Menu:** Opens/closes navigation drawer
- **App Title:** "Badminton Matchmaker"
- **Theme Toggle:** Dark/light mode toggle button
- **Fixed Position:** Stays at top on scroll

#### Navigation Drawer (Sidebar)
- **Menu Items:**
  1. Dashboard
  2. Manage Players
  3. Manage Schedule
  4. Manage Match
  5. Manage Payments
  6. Import / Export
- **Icons:** Emoji icons for each section
- **Backdrop:** Tapping outside closes drawer
- **Mobile-Optimized:** Slide-out drawer animation

#### Bottom Navigation (Mobile)
- **Quick Access:** 5 quick-access buttons at bottom
  1. Dashboard
  2. Manage Players
  3. Manage Schedule
  4. Manage Match
  5. Manage Payments
- **Persistent:** Visible at all times
- **Thumb-Friendly:** Sized for easy mobile access

#### View Switching
- **Single-Page App:** All content rendered in single HTML, views switch via JavaScript
- **ARIA Current:** Current view marked with `aria-current="page"`
- **History:** No URL change on navigation (future enhancement)

### User Actions
- Tap hamburger to open drawer
- Tap menu item to navigate
- Tap backdrop or Escape to close drawer
- Tap bottom nav buttons for quick access

### Dependencies
- DOM manipulation via `dom.js`
- Navigation setup in `navigationDrawer.js`

---

## Unfinished / Placeholder Features

The following areas have placeholder code or incomplete implementation:

### Render Players For Suggestion
- **Status:** Placeholder function `renderPlayersForSuggestion()` exists but does nothing
- **Purpose:** Unclear - may have been planned for future enhancement
- **Evidence:** Function is defined but empty in app.js

### CSS/Styling Migration
- **Status:** Incomplete - TODO.md indicates migration to Bulma-only styling
- **Current State:** Application uses custom CSS classes mixed with Bulma
- **Planned Work:** Strip custom CSS and consolidate to Bulma equivalents
- **Evidence:** TODO.md in project root documents this technical debt

---

## Feature Dependencies Matrix

```
Dashboard
├─ Players data
├─ Schedules data
├─ Matches data
└─ Payments data

Manage Players
└─ None (base feature)

Manage Schedule
├─ Players (must exist)
├─ Time tracking
└─ Storage

Manage Match
├─ Schedule (must be active)
├─ Players (must be in schedule)
├─ Matchmaking algorithm
└─ Auto payment creation

Manage Payments
├─ Matches (must exist)
├─ Player info
└─ Config (fees)

Import / Export
├─ All data
└─ JSON parsing
```

---

## Quality Notes

### Tested Features
- Player CRUD operations
- Schedule creation and player addition
- Match suggestion generation
- Payment calculation
- Data import/export
- Theme toggle

### Known Issues
- None documented in code comments
- TODO items are limited to CSS refactoring

### Accessibility
- ARIA labels on interactive elements
- Semantic HTML5 structure
- Color contrast suitable for dark theme
- Keyboard navigation supported (Escape to close, Arrow keys in autocomplete)

### Performance Considerations
- Match suggestion algorithm limits to 80 candidates max before selection
- Autocomplete limits results to 8 items
- No virtual scrolling (assumes <100 players)
- localStorage used for all persistence (no database)
