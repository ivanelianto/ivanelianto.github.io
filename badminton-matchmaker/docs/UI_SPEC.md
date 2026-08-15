# Badminton Matchmaker - UI Specification

## Navigation Structure

### Primary Navigation Elements

#### Header (Fixed Top)
```
┌─────────────────────────────────────────┐
│ ☰  Badminton Matchmaker  🌙             │
└─────────────────────────────────────────┘
```
- **☰ Menu:** Hamburger menu (toggles navigation drawer)
- **Title:** Application name, centered
- **🌙 Theme:** Theme toggle button (dark/light mode)

#### Navigation Drawer (Sidebar, Slide-out)
```
┌──────────────────────────┐
│ B                        │
│ Badminton Matchmaker ▼   │
├──────────────────────────┤
│ 📊 Dashboard             │
│ 👤 Manage Players        │
│ 📅 Manage Schedule       │
│ 🏸 Manage Match          │
│ 💰 Manage Payments       │
│ 📁 Import / Export       │
└──────────────────────────┘
```
- **Profile Section:** Avatar (letter "B"), app name, dropdown arrow
- **Menu Items:** 6 navigation options with icons
- **Backdrop:** Tapping outside or pressing Escape closes drawer
- **Animation:** Slide-in from left

#### Bottom Navigation Bar (Mobile Fixed)
```
┌────────────┬────────────┬────────────┬────────────┬────────────┐
│ 📊         │ 👤         │ 📅         │ 🏸         │ 💰         │
│ Dashboard  │ Players    │ Schedule   │ Match      │ Payments   │
└────────────┴────────────┴────────────┴────────────┴────────────┘
```
- **5 Quick Buttons:** Dashboard, Players, Schedule, Match, Payments
- **Position:** Fixed at bottom for thumb-reachable access
- **Active State:** Currently active view highlighted
- **No Export:** Import/Export not in bottom nav

---

## Layout Philosophy

### Mobile-First Design
- **Max Width:** 430px (typical phone viewport)
- **Padding:** 12px horizontal, 32px bottom (for nav clearance)
- **Font Size:** 16px minimum (prevents iOS auto-zoom on input)
- **Button Minimum Size:** 44px touch target

### View Container
```
┌────────────────────────┐
│   FIXED HEADER (60px)  │
├────────────────────────┤
│                        │
│   MAIN CONTENT AREA    │
│   (scrollable)         │
│                        │
├────────────────────────┤
│  FIXED BOTTOM NAV      │
│  (if mobile)           │
└────────────────────────┘
```

### Color Scheme (Dark Theme Default)
- **Background:** #0b1220 (dark blue)
- **Panel:** #111c33 (darker blue)
- **Text:** #e8eefc (light gray-blue)
- **Muted Text:** #a9b4d0 (medium gray)
- **Accent:** #4f8cff (blue)
- **Success:** #56d364 (green)
- **Danger:** #ff4d4d (red)
- **Team A:** #4f8cff (blue)
- **Team B:** #ff4d4d (red)

### Theme Variables
All colors defined as CSS custom properties (`:root`), supporting easy light theme switch.

---

## Page Layouts

### 1. Dashboard

```
┌──────────────────────────────┐
│   Total Players              │
│   ┌────────────────────────┐ │
│   │        42              │ │
│   └────────────────────────┘ │
└──────────────────────────────┘

┌──────────────────────────────┐
│   Active Players Today       │
│   ┌────────────────────────┐ │
│   │         8              │ │
│   └────────────────────────┘ │
└──────────────────────────────┘

┌──────────────────────────────┐
│   Total Matches Today        │
│   ┌────────────────────────┐ │
│   │         4              │ │
│   └────────────────────────┘ │
└──────────────────────────────┘

┌──────────────────────────────┐
│   Total Shuttlecock Usage    │
│   ┌────────────────────────┐ │
│   │        12              │ │
│   └────────────────────────┘ │
└──────────────────────────────┘

┌──────────────────────────────┐
│   Outstanding Payments       │
│   ┌────────────────────────┐ │
│   │         6              │ │
│   └────────────────────────┘ │
└──────────────────────────────┘

┌──────────────────────────────┐
│   Active Schedule            │
│   ┌────────────────────────┐ │
│   │   12/06/2024 - Today  │ │
│   └────────────────────────┘ │
└──────────────────────────────┘
```

- **Cards Layout:** 6 metric cards stacked vertically
- **Card Style:** Dark background with border, large text
- **Tag Style:** Colored tags for numbers (is-dark is-primary)
- **Read-Only:** Dashboard is informational only

---

### 2. Manage Players

```
┌───────────────────────────────┐
│   Players                     │
├───────────────────────────────┤
│  ┌─────────────────────────┐  │
│  │  ➕ Add/Update Player  │  │
│  └─────────────────────────┘  │
└───────────────────────────────┘

┌──────────────────────────────────┐
│  [B] Arga                         │
│  Some notes about player          │
│                      [✍️] [❌]    │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  [A] Elvin                        │
│                      [✍️] [❌]    │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  [S] Hendra Lim                   │
│                      [✍️] [❌]    │
└──────────────────────────────────┘
```

- **List View:** Sorted alphabetically by name
- **Player Cards:** Muted background, class badge, name, note
- **Actions:** Edit (✍️) and Delete (❌) buttons on each card
- **Button Color:** Blue for edit, red for delete

#### Add/Edit Player Modal

```
┌─────────────────────────────┐
│  Add Player          [X]    │
├─────────────────────────────┤
│                             │
│  Name                       │
│  [________________]         │
│                             │
│  Class                      │
│  ◯ C  ◯ B  ◉ A  ◯ S        │
│                             │
│  Note                       │
│  [________________]         │
│                             │
├─────────────────────────────┤
│ Cancel | Delete | Save      │
└─────────────────────────────┘
```

- **Fields:**
  - Name: Text input, required
  - Class: Radio buttons, required
  - Note: Text input, optional
- **Buttons:** Cancel, Delete (only if editing), Save
- **Close:** X button or click backdrop

---

### 3. Manage Schedule

```
┌─────────────────────────────────┐
│  Start / Select Schedule        │
├─────────────────────────────────┤
│  Active Schedule                │
│  [▼ 12/06/2024 - 10:30AM]       │
│                                 │
│  Fees: ⛺: Rp15,000 | ⚾: Rp4,000 │
│                                 │
│  [❌ Close] [➕ New Schedule]    │
│                                 │
│  Players added will be reused   │
│  from players.json if name...   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Add Players to Schedule        │
├─────────────────────────────────┤
│  Player name                    │
│  [autocomplete ▼]               │
│                                 │
│  Class (used if new)            │
│  ◯ C  ◯ B  ◉ A  ◯ S            │
│                                 │
│  Note (optional)                │
│  [________________]             │
│                                 │
│  [🟢 Add Player]                │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Players in Active Schedule     │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ [B] Okky - arrive 18:30     │ │
│ │                         [X] │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [A] Ivan - arrive 18:45     │ │
│ │                         [X] │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

- **Schedule Selector:** Dropdown with all schedules
- **Fee Display:** Show court and shuttlecock fees
- **Player Input:** Autocomplete with class selection
- **Player List:** Cards with class badge, name, arrival time, remove button
- **New Schedule:** Modal for creating new session

#### New Schedule Modal

```
┌──────────────────────────────┐
│  Create New Schedule    [X]  │
├──────────────────────────────┤
│                              │
│  Schedule Date               │
│  [2024-06-12]                │
│                              │
│  Session Name (Optional)     │
│  [________________]          │
│                              │
│  Options                     │
│  ☐ Sparring Mode             │
│                              │
│  Court Fee                   │
│  [15000_____]                │
│                              │
│  Shuttlecock Fee             │
│  [4000______]                │
│                              │
│  [hidden until sparring]     │
│  Team A [____________]       │
│  Team B [____________]       │
│                              │
├──────────────────────────────┤
│ Cancel | Create New Schedule │
└──────────────────────────────┘
```

- **Date Input:** ISO date picker
- **Sparring Checkbox:** Toggle team fields visibility
- **Fee Inputs:** Numeric, non-negative

#### Sparring Mode Team Filter

```
┌──────────────────────────────┐
│  Team A            Team B   │
│  [🔵 All]  [TA]     [TB]    │
│                              │
│  Team A                      │
│  ┌──────────────────────────┐│
│  │ [B] Okky - arrive 18:30  ││
│  │ [A] Ivan - arrive 18:45  ││
│  └──────────────────────────┘│
│                              │
│  Team B                      │
│  ┌──────────────────────────┐│
│  │ [S] Saputra - arrive 19:00││
│  │                      [X]  ││
│  └──────────────────────────┘│
└──────────────────────────────┘
```

- **Team Badges:** Color-coded (blue for Team A, red for Team B)
- **Team Headers:** "Team A" with colored accent bar
- **Filter Buttons:** "All", "Team A", "Team B" to toggle visibility

---

### 4. Manage Match

```
┌──────────────────────────────┐
│  Schedule Selection          │
├──────────────────────────────┤
│  Active Schedule             │
│  [▼ 12/06/2024 - 10:30AM]    │
│                              │
│  ────────────────────────────│
│  [🟦 Primary] [⭐ Suggestions]│
└──────────────────────────────┘

┌──────────────────────────────┐
│  Match History               │
├──────────────────────────────┤
│ ┌────────────────────────────┤
│ │ Match #1                   │
│ │ Okky & Elvin ⚔ Arga & Ivan│
│ │ ⚾: 2                       │
│ │ [-1⚾] [+1⚾] [❌ Cancel]  │
│ └────────────────────────────┤
│ ┌────────────────────────────┤
│ │ Match #2                   │
│ │ Christy & Mei ⚔ Ricky & ...│
│ │ ⚾: 1                       │
│ │ [-1⚾] [+1⚾] [❌ Cancel]  │
│ └────────────────────────────┤
└──────────────────────────────┘
```

- **Schedule Selector:** Select which schedule to manage
- **Actions:** Add Match, See Suggestions buttons
- **Match Cards:** Show match number, players (Team A ⚔ Team B), shuttles
- **Buttons:** -1 shuttle, +1 shuttle, cancel

#### Add Match Modal (Manual)

```
┌──────────────────────────────┐
│  Add Match (Manual)     [X]  │
├──────────────────────────────┤
│  Pick 4 players from the     │
│  current active schedule...  │
│                              │
│  [🔵 Team A] [Team B] [All]  │
│                              │
│  ┌──────────────────────────┐│
│  │ [B] Okky                 ││
│  │ 3 played                 ││
│  │ Arrive: 18:30            ││
│  │            [✓ Pick]      ││
│  └──────────────────────────┘│
│  ┌──────────────────────────┐│
│  │ [A] Ivan                 ││
│  │ 2 played                 ││
│  │ Arrive: 18:45            ││
│  │            [✓ Pick]      ││
│  └──────────────────────────┘│
│  ... more players ...        │
│                              │
├──────────────────────────────┤
│ Cancel           + Add Match │
└──────────────────────────────┘
```

- **Filter:** Team filter buttons (Sparring Mode)
- **Candidate Cards:** Show class, name, match count, arrival time
- **Pick Button:** Color changes and text changes when picked
- **Disabled:** Disabled if 4 players selected or team limit reached
- **Save Button:** Disabled until exactly 4 picked (or 2v2 in Sparring)

#### Suggestions Modal

```
┌──────────────────────────────┐
│  Match Suggestions      [X]  │
├──────────────────────────────┤
│  Suggestion #1               │
│                              │
│  Team A                      │
│  [B] Okky + [A] Ivan         │
│  [B] Okky ❌  [A] Ivan ❌    │
│                              │
│  Team B                      │
│  [S] Saputra + [C] Christy   │
│  [S] Saputra ❌  [C] Christy│
│                              │
│        [✓ Select This Match] │
│                              │
│  Suggestion #2 ...          │
│  Suggestion #3 ...          │
│                              │
├──────────────────────────────┤
│ Close                        │
└──────────────────────────────┘
```

- **Suggestion Cards:** Display team A and B players
- **Skip Buttons:** ❌ next to each player to skip and regenerate
- **Select Button:** To confirm this suggestion
- **Display:** Up to 3 suggestions

---

### 5. Manage Payments

```
┌──────────────────────────────┐
│  Unpaid Payment List         │
├──────────────────────────────┤
│  [________________]          │ (search by player name)
│                              │
│  ┌────────────────────────┐  │
│  │ Okky - 12/06/2024      │  │
│  │                        │  │
│  │ ⚾: 2 (Rp8.000)        │  │
│  │                        │  │
│  │ [🟩 Pay] [Collect]     │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ Ivan - 12/06/2024      │  │
│  │                        │  │
│  │ ⚾: 1 (Rp19.000)       │  │
│  │ [🟩 Pay] [Collect]     │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

- **Search:** Filter unpaid by player name (case-insensitive)
- **Payment Cards:** Player name, date, shuttlecock count, total in Rp
- **Buttons:** "Pay" (set method), "Collect Payment" (view message)

#### Payment Method Modal

```
┌──────────────────────────────┐
│  Set Payment Method     [X]  │
├──────────────────────────────┤
│  Choose method               │
│                              │
│  [🟦 Cash] [🟦 Transfer]     │
│                              │
│  Player: Okky                │
│                              │
├──────────────────────────────┤
│ Close                        │
└──────────────────────────────┘
```

- **Two Buttons:** Cash or TF (Bank Transfer)
- **Player Context:** Display player name

#### Collect Payment Message Modal

```
┌──────────────────────────────┐
│  Collect Payment Message [X] │
├──────────────────────────────┤
│  Message                     │
│  ┌────────────────────────┐  │
│  │ Siang Okky,            │  │
│  │                        │  │
│  │ Yang main hari Rabu,   │  │
│  │ 12 Juni kemarin,       │  │
│  │                        │  │
│  │ Totalnya *Rp8.000*     │  │
│  │                        │  │
│  │ Pembayaran bisa melalui│  │
│  │ transfer bank ke:      │  │
│  │ BCA 5271595931         │  │
│  │ a/n Ivan Favian Elianto│  │
│  └────────────────────────┘  │
│                              │
│  [Copy to Clipboard] [Close] │
└──────────────────────────────┘
```

- **Textarea:** Read-only pre-formatted message
- **Copy Button:** Copies to clipboard, shows "Copied" toast
- **Message Format:**
  - Time-of-day greeting
  - Player name
  - Session date in Indonesian
  - Total in Rp with formatting
  - Bank details

---

### 6. Import / Export

```
┌────────────────────────────┐
│  Export JSON               │
├────────────────────────────┤
│  Copy each JSON file...    │
│                            │
│  players.json              │
│  ┌──────────────────────┐  │
│  │ [                    │  │
│  │   {...}              │  │
│  │ ]                    │  │
│  └──────────────────────┘  │
│                            │
│  schedules.json            │
│  ┌──────────────────────┐  │
│  │ [...]                │  │
│  └──────────────────────┘  │
│                            │
│  matches.json              │
│  ┌──────────────────────┐  │
│  │ [...]                │  │
│  └──────────────────────┘  │
│                            │
│  payments.json             │
│  ┌──────────────────────┐  │
│  │ [...]                │  │
│  └──────────────────────┘  │
└────────────────────────────┘

┌────────────────────────────┐
│  Import JSON               │
├────────────────────────────┤
│  Paste JSON arrays...      │
│                            │
│  players.json              │
│  ┌──────────────────────┐  │
│  │ [paste here...]      │  │
│  └──────────────────────┘  │
│                            │
│  schedules.json            │
│  ┌──────────────────────┐  │
│  │ [paste here...]      │  │
│  └──────────────────────┘  │
│                            │
│  matches.json              │
│  ┌──────────────────────┐  │
│  │ [paste here...]      │  │
│  └──────────────────────┘  │
│                            │
│  payments.json             │
│  ┌──────────────────────┐  │
│  │ [paste here...]      │  │
│  └──────────────────────┘  │
│                            │
│  [🔴 Reset All] [🟦 Import]│
└────────────────────────────┘
```

- **Two Columns:** Export (left) and Import (right)
- **Textareas:** Formatted JSON, read-only (export), writable (import)
- **Buttons:** "Reset All" (danger red), "Import" (primary blue)

---

## Common UI Components

### Class Badge
```
[C] - displays player skill class
[B]
[A]
[S]
```
- Background: Dark
- Text: Class letter
- Size: Compact

### Team Badge (Sparring Mode)
```
[TA] - condensed team label
[TB]
```
- Color coded: Blue for Team A, Red for Team B

### Radio Button Group (Class Selection)
```
◯ C  ◯ B  ◯ A  ◉ S
```
- Horizontal layout
- Selected indicated by filled circle
- Label text aligned right of radio

### Autocomplete Menu
```
Player Name · A
Player Name · B
Player Name · S
```
- Dropdown below input
- Keyboard navigable (Up/Down arrows)
- Highlighted with "active" state
- Styled buttons within dropdown

### Toast Notification
```
┌────────────────────┐
│ Player added ✓     │
└────────────────────┘
```
- Bottom of screen (or top-right)
- Auto-hide after 2.6 seconds
- White/light text on dark background
- Slide-in/fade animation

### Confirmation Dialog
```
┌────────────────────────────┐
│ Delete Player?      [X]    │
├────────────────────────────┤
│                            │
│ Are you sure?              │
│                            │
├────────────────────────────┤
│ Cancel          OK (danger)│
└────────────────────────────┘
```
- Modal overlay
- Confirmation text
- Two buttons: Cancel and OK (danger style for destructive)

### Empty State
```
No players yet.
```
- Muted text color
- Centered message
- Appears when list is empty

---

## Form Inputs

### Text Input
```
┌─────────────────────┐
│ Enter text here...  │
└─────────────────────┘
```
- Min height: 44px for touch
- Font size: 16px (prevents auto-zoom)
- Padding: Comfortable margin

### Number Input
```
┌──────────────┐
│ 15000        │
└──────────────┘
```
- Min/max constraints
- Right-aligned text

### Date Input
```
┌──────────────┐
│ 2024-06-12   │
└──────────────┘
```
- ISO format
- Browser date picker on mobile

### Select Dropdown
```
┌────────────────────────┐
│ 12/06/2024 - 10:30AM ▼ │
└────────────────────────┘
```
- Native select on mobile
- Options sorted

### Textarea
```
┌──────────────────┐
│ Multi-line text  │
│ goes here...     │
│                  │
└──────────────────┘
```
- Monospace font for JSON
- Sufficient height for content preview
- Read-only for export
- Writable for import

---

## Button Styles

### Primary Button (Blue)
```
┌─────────────────────┐
│ 🟦 Primary Action   │
└─────────────────────┘
```
- Accent color background
- Used for main actions (Save, Create, Select)

### Success Button (Green)
```
┌─────────────────────┐
│ 🟩 Add Player       │
└─────────────────────┘
```
- Green background
- Used for positive/add actions

### Danger Button (Red)
```
┌─────────────────────┐
│ 🔴 Delete/Cancel    │
└─────────────────────┘
```
- Red background
- Used for destructive actions

### Secondary Button (Gray)
```
┌─────────────────────┐
│ Cancel              │
└─────────────────────┘
```
- Muted background
- Used for non-primary actions

### Full-Width Button
```
┌──────────────────────────┐
│ Fill entire container    │
└──────────────────────────┘
```
- Width: 100% of container
- Used in forms and lists

---

## Spacing & Typography

### Margin & Padding
- Small gap: 0.5em (8px)
- Default gap: 1em (16px)
- Large gap: 2em (32px)

### Font Sizes
- Body: 16px (1rem)
- Small: 14px (0.875rem, .is-size-7)
- Large: 18px (1.125rem, .is-size-6)
- Title: 20px+ (1.25rem+, h2)

### Typography
- **Sans-serif:** System UI font stack
- **Line height:** 1.5
- **Headings:** Bold weight (fw-900)
- **Muted text:** Gray color (#a9b4d0)

---

## Responsive Behavior

### Viewport Sizes
- Mobile: < 430px (primary target)
- Tablet: 430px - 768px (scaled up)
- Desktop: 768px+ (limited optimization)

### Mobile-Specific Adjustments
- Bottom nav: Fixed at bottom for thumb access
- Stack columns: Cards stack vertically
- Modals: Full-width minus margins
- Touch targets: Min 44px for buttons

---

## Accessibility Features

### ARIA Labels
- Navigation drawer toggle: `aria-expanded`
- Links: `aria-label` descriptions
- Live regions: `aria-live="polite"` on view sections
- Modal: `aria-modal="true"`
- Autocomplete: `aria-autocomplete="list"`, `aria-expanded`

### Semantic HTML
- `<main>` for content
- `<nav>` for navigation
- `<section>` for view containers
- `<header>` for top bar
- `<aside>` for drawer
- Proper heading hierarchy (h1, h2)

### Keyboard Navigation
- Tab: Move between interactive elements
- Enter: Activate buttons/select items
- Escape: Close modals/drawers
- Arrow Up/Down: Navigate autocomplete

### Color Contrast
- Text on background: ≥4.5:1 ratio
- Sufficient luminosity for readability

---

## Known UI Limitations

1. **Vertical Scrolling Only:** Horizontal scroll is disabled (mobile app behavior)
2. **No Native App Bar Indicators:** Uses simple emoji for theme toggle
3. **Limited Print Support:** Not designed for printing
4. **Small Screen Only:** Max width 430px (desktop may appear narrow)
5. **Single Language:** No localization UI (hardcoded Indonesian text)
