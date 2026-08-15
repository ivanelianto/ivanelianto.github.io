# Badminton Matchmaker - User Workflows

This document describes the complete user workflows and typical session flows through the application.

---

## Workflow 1: Getting Started (First Time User)

```
User Opens App
    ↓
App Seeds 18 Default Players
    ↓
User Views Dashboard
    │
    ├─→ See 18 total players
    ├─→ See 0 active players (no schedule)
    └─→ See all metrics empty
    ↓
User Creates First Schedule
    ├─→ Navigate to "Manage Schedule"
    ├─→ Click "➕ New Schedule"
    ├─→ Set date = today
    ├─→ Set session name = "Test Session"
    ├─→ Leave as Normal Mode
    ├─→ Set court fee = 15000, shuttle fee = 4000
    └─→ Click "Create New Schedule"
    ↓
Schedule is Created & Active
    ├─→ Dropdown now shows new schedule
    └─→ Ready to add players
```

---

## Workflow 2: Normal Mode Session (Standard Badminton Play)

```
User Has Active Schedule (Normal Mode)
    ↓
[PHASE 1: Add Players]
    ├─→ Navigate to "Manage Schedule"
    ├─→ Schedule already selected/active
    ├─→ User types "Ivan" in player name field
    ├─→ Autocomplete shows "Ivan · A"
    ├─→ User selects from autocomplete
    ├─→ System adds Ivan to schedule (records join time: 18:30)
    ├─→ User repeats for 3 more players (Okky, Christy, Arga)
    └─→ Total 4 players in schedule
    ↓
[PHASE 2: Generate First Match Suggestion]
    ├─→ Navigate to "Manage Match"
    ├─→ Active schedule already selected
    ├─→ Click "⭐ See Suggestions"
    ├─→ System evaluates all 4-player combinations
    ├─→ System applies balancing algorithm:
    │   ├─→ Priority 1: Class balance (fairly distribute S/A/B/C)
    │   ├─→ Priority 2: Play fairness (all have 0 matches, so equal)
    │   └─→ Priority 3: Arrival time (prefer earlier arrivals)
    ├─→ System shows top 3 suggestions
    ├─→ User views suggestion #1:
    │   ├─→ Team A: Ivan (A) + Christy (C)
    │   └─→ Team B: Okky (B) + Arga (B)
    │   └─→ Balance: Perfectly balanced (A+C vs B+B)
    └─→ User clicks \"Select This Match\"
    ↓
[PHASE 3: Add More Players & Matches]
    ├─→ User adds 4 more players to schedule
    ├─→ First match is now in history
    ├─→ User returns to \"Manage Match\"
    ├─→ Sees Match #1 in history
    ├─→ Clicks \"⭐ See Suggestions\"
    ├─→ System now considers:
    │   ├─→ 4 unused players (haven't played yet)
    │   └─→ 4 players with 1 match each
    │   └─→ Prioritizes players with 0 matches
    ├─→ User selects suggestion for Match #2
    └─→ Repeats for Match #3, #4, etc.
    ↓
[PHASE 4: Track Shuttlecock Usage]
    ├─→ During matches, user tracks shuttlecock breakage
    ├─→ After each match, user clicks \"+1 ⚾\" to increment
    ├─→ Example: Match #1 breaks 2 shuttles (+2)
    ├─→ System updates match record
    └─→ Payments auto-recalculate (Ivan, Okky, Christy, Arga each owe more)
    ↓
[PHASE 5: End Session & Process Payments]
    ├─→ All matches completed
    ├─→ Navigate to \"Manage Payments\"
    ├─→ View unpaid payments list:
    │   ├─→ Ivan: Rp27,000 (15k court + 3 × 4k shuttles)
    │   ├─→ Okky: Rp23,000
    │   ├─→ Christy: Rp23,000
    │   └─→ Arga: Rp23,000
    ├─→ For each unpaid payment:
    │   ├─→ Click \"Pay\" button
    │   ├─→ Choose payment method (Cash or TF)
    │   └─→ Payment marked as collected (hidden from unpaid list)
    └─→ All payments processed
    ↓
[PHASE 6: Backup & Archive]
    ├─→ Navigate to \"Import / Export\"
    ├─→ Copy all 4 JSON files (export)
    ├─→ Save to file or cloud backup
    └─→ Done!
```

---

## Workflow 3: Sparring Mode Session (Team-Based Play)

```
User Creates Schedule with Sparring Mode Enabled
    ├─→ Navigate to \"Manage Schedule\"
    ├─→ Click \"➕ New Schedule\"
    ├─→ Set date, name, **ENABLE SPARRING MODE**
    ├─→ System shows hidden team fields
    ├─→ Set Team A = \"Red Dragons\"
    ├─→ Set Team B = \"Blue Eagles\"
    ├─→ Set court fee = 20000, shuttle fee = 5000
    └─→ Click \"Create New Schedule\"
    ↓
[PHASE 1: Add Players to Teams]
    ├─→ Schedule active and in Sparring Mode
    ├─→ \"Add Players\" section shows team radios:
    │   ├─→ ◉ Red Dragons ◯ Blue Eagles
    ├─→ User types \"Ivan\"
    ├─→ User selects \"Red Dragons\" radio
    ├─→ User clicks \"Add Player\"
    ├─→ Ivan added to Red Dragons
    ├─→ Repeat with Okky → Red Dragons
    ├─→ Repeat with Christy → Blue Eagles
    ├─→ Repeat with Arga → Blue Eagles
    └─→ Total: 2 Red Dragons, 2 Blue Eagles
    ↓
[PHASE 2: View Players by Team]
    ├─→ Players list grouped by team:
    │   ├─→ Red Dragons:
    │   │   ├─→ [A] Ivan - arrive 18:30 [X]
    │   │   └─→ [B] Okky - arrive 18:35 [X]
    │   └─→ Blue Eagles:
    │       ├─→ [C] Christy - arrive 18:40 [X]
    │       └─→ [B] Arga - arrive 18:45 [X]
    ├─→ Team filter buttons (All/Red Dragons/Blue Eagles)
    └─→ User can filter team visibility
    ↓
[PHASE 3: Generate Suggestions (Team-Aware)]
    ├─→ Navigate to \"Manage Match\"
    ├─→ Click \"⭐ See Suggestions\"
    ├─→ System generates only valid combinations:
    │   ├─→ Must select 2 from Red Dragons
    │   ├─→ Must select 2 from Blue Eagles
    │   └─→ Only 1 possible combination (all 4 players)
    ├─→ Suggestion shows:
    │   ├─→ Red Dragons: Ivan + Okky
    │   └─→ Blue Eagles: Christy + Arga
    ├─→ Algorithm still applies balancing within teams
    └─→ User clicks \"Select This Match\"
    ↓
[PHASE 4: Manual Match Creation (Sparring Mode)]
    ├─→ Add more players to both teams (e.g., 4 per team total)
    ├─→ Click \"+ Add Match\"
    ├─→ Manual picker shows team filter:
    │   ├─→ [🔵 Red Dragons] [Blue Eagles] [All]
    ├─→ User clicks \"Red Dragons\" filter
    ├─→ Only Red Dragons candidates shown
    ├─→ User picks 2 from Red Dragons (buttons turn red)
    ├─→ User clicks \"Blue Eagles\" filter
    ├─→ User picks 2 from Blue Eagles (buttons turn red)
    ├─→ \"+ Add Match\" button ENABLED (2v2 distribution correct)
    ├─→ User clicks \"+ Add Match\"
    └─→ Match added with correct team distribution
    ↓
[PHASE 5: Same Payment Flow as Normal Mode]
    ├─→ Shuttlecock usage tracked per match
    ├─→ Payments auto-calculated
    ├─→ Collection processed
    └─→ Session ends
```

---

## Workflow 4: Skip & Regenerate Suggestions

```
User Viewing Match Suggestions
    ├─→ Has 3 suggestions displayed
    ├─→ Doesn't like Suggestion #1 (Ivan looks tired)
    ├─→ Clicks \"❌\" next to \"Ivan\" in Suggestion #1
    │   └─→ Ivan added to blacklist for this session
    ↓
System Regenerates Suggestions
    ├─→ Removes Ivan from candidate pool
    ├─→ Re-evaluates all combinations without Ivan
    ├─→ Shows new top 3 suggestions
    ├─→ User now sees different combinations
    └─→ Ivan still available if user skips different player
    ↓
User Can Skip Multiple Players
    ├─→ Skip Okky next
    ├─→ Skip Christy next
    ├─→ System progressively narrows candidate pool
    └─→ Eventually very few combinations remain
    ↓
User Finds Acceptable Suggestion
    ├─→ Clicks \"Select This Match\"
    └─→ Match added
```

---

## Workflow 5: Manual Player Management During Session

```
User Realizes New Player Arrived
    ├─→ Already in schedule view
    ├─→ New player: \"Miftah\" (not in roster)
    ├─→ User types \"Miftah\" in add player field
    ├─→ Autocomplete finds nothing (new player)
    ├─→ User presses Enter or clicks \"Add Player\"
    ├─→ System creates new player \"Miftah\"
    ├─→ Assigns class from radio selection (e.g., \"B\")
    ├─→ Miftah added to active schedule
    └─→ Miftah now available for matches
    ↓
User Wants to Edit Player Class
    ├─→ Navigate to \"Manage Players\"
    ├─→ Find \"Miftah\" in list
    ├─→ Click ✍️ button
    ├─→ Modal opens showing:
    │   ├─→ Name: Miftah
    │   ├─→ Class: ◯ C ◯ B ◉ A ◯ S
    │   └─→ Note: [empty]
    ├─→ User realizes Miftah is actually Class \"A\"
    ├─→ Clicks \"A\" radio
    ├─→ Clicks \"Save\"
    ├─→ Miftah's class updated for all future use
    └─→ Matches already created still have old class (historical)
    ↓
User Wants to Delete Player
    ├─→ Find unwanted player in roster
    ├─→ Click ❌ button
    ├─→ Confirmation dialog appears
    ├─→ User confirms deletion
    ├─→ Player removed from:
    │   ├─→ Master roster
    │   └─→ All active schedules
    ├─→ Matches containing this player are CANCELLED
    ├─→ Payments recalculated
    └─→ Player cannot be added to schedules anymore
```

---

## Workflow 6: Troubleshooting & Recovery

```
User's Browser Clears (Lost Local Data)
    ├─→ Opens app
    ├─→ localStorage is empty
    ├─→ App detects first run
    ├─→ App seeds 18 default players
    └─→ All schedules/matches/payments are LOST
    ↓
User Had Backup JSON
    ├─→ Navigate to \"Import / Export\"
    ├─→ Click in each import textarea
    ├─→ Paste players.json content
    ├─→ Paste schedules.json content
    ├─→ Paste matches.json content
    ├─→ Paste payments.json content
    ├─→ Click \"Import\"
    ├─→ All data restored
    └─→ Backup recovery complete
    ↓
User Made Mistake & Wants to Reset
    ├─→ Navigate to \"Import / Export\"
    ├─→ Click \"Reset All\"
    ├─→ Confirmation dialog appears
    ├─→ User confirms
    ├─→ All data cleared
    ├─→ Default 18 players re-seeded
    ├─→ Ready for fresh start
    └─→ Cannot undo (no trash)
```

---

## Workflow 7: Payment Collection Message

```
User Wants to Collect Payment from Player
    ├─→ Navigate to \"Manage Payments\"
    ├─→ See unpaid payment for \"Ivan\"
    ├─→ Total: Rp27,000
    ├─→ Click \"Collect Payment\" button
    │   └─→ Modal appears with pre-formatted message:
    │       ├─→ \"Siang Ivan,\"
    │       ├─→ \"Yang main hari Rabu, 12 Juni kemarin,\"
    │       ├─→ \"Totalnya *Rp27.000* 🙏\"
    │       ├─→ \"Pembayaran bisa melalui transfer bank ke:\"
    │       ├─→ \"BCA 5271595931\"
    │       └─→ \"a/n Ivan Favian Elianto\"
    ├─→ Click \"Copy to Clipboard\"
    ├─→ System copies message to clipboard
    ├─→ Toast shows \"Copied\"
    ├─→ User opens WhatsApp/Telegram
    ├─→ Pastes message to Ivan
    ├─→ Ivan responds with payment confirmation
    ├─→ User returns to app
    ├─→ Clicks \"Pay\" button
    ├─→ Chooses payment method (\"TF\" = transfer)
    └─→ Payment marked as collected & hidden
```

---

## Workflow 8: Comparing Team Balance

```
Suggestion #1:
├─→ Team A: [S] Saputra + [C] Christy = S+C = 4+1 = 5 points
├─→ Team B: [A] Ivan + [B] Okky = A+B = 3+2 = 5 points
└─→ Difference: |5-5| = 0 ✓ Perfect balance

Suggestion #2:
├─→ Team A: [S] Saputra + [B] Okky = S+B = 4+2 = 6 points
├─→ Team B: [A] Ivan + [C] Christy = A+C = 3+1 = 4 points
└─→ Difference: |6-4| = 2 ✗ Unbalanced

System Prioritizes Suggestion #1
    └─→ Offers it as first suggestion (best balance)
```

---

## Workflow 9: Data Export for External Analysis

```
User Wants to Analyze Data Elsewhere
    ├─→ Navigate to \"Import / Export\"
    ├─→ Copy players.json content
    ├─→ Paste into text editor, save as \"players.json\"
    ├─→ Repeat for schedules.json, matches.json, payments.json
    ├─→ Creates folder \"badminton-2024-06-12\"
    ├─→ Saves all 4 JSON files to folder
    ├─→ Opens in Excel/Google Sheets via JSON import
    ├─→ Analyzes:
    │   ├─→ Player stats (total matches, average payment)
    │   ├─→ Session stats (total revenue, average match duration)
    │   ├─→ Payment trends
    │   └─→ Team balance metrics
    └─→ Exports analysis report
```

---

## Workflow 10: Multi-Session Workflow (Advanced)

```
Session 1: Friday 12 June 2024
    ├─→ Create schedule
    ├─→ Add 8 players
    ├─→ Run 4 matches
    ├─→ Settle payments
    └─→ Export/backup

Session 2: Friday 19 June 2024
    ├─→ Create new schedule
    ├─→ Same 8 players (autocomplete reuses them)
    ├─→ Run 4 matches
    ├─→ Notice different play patterns
    ├─→ Algorithm balances considering play frequency:
    │   ├─→ Each player has 4 matches in Session 1
    │   └─→ All have equal play count
    │   └─→ Falls back to class balance & arrival time
    └─→ Settle payments

Multiple Session Metrics
    ├─→ Dashboard shows total 16 matches across sessions
    ├─→ Payments show multiple entries per player
    ├─→ Can export and analyze trends
    └─→ See who plays most consistently
```

---

## Key Decision Points in Workflows

### Decision 1: Normal Mode vs Sparring Mode
- **When to Use Normal Mode:** Casual pickup games, any 4 players can play
- **When to Use Sparring Mode:** League play, tournament, pre-determined teams

### Decision 2: Suggestion vs Manual
- **Use Suggestions:** When fairness is important, algorithm handles balance
- **Use Manual:** When organizer has specific preferences or constraints

### Decision 3: Skip & Regenerate
- **Use Skip:** Player injured, not available, or tired
- **Impact:** Removes player from suggestions for current session
- **Reset:** Close and reopen suggestions to clear blacklist

### Decision 4: Special Player Cases
- **Free Players (Mei, Asrofi):** No payment needed (volunteer umpires?)
- **Shuttle-Only (Ivan, Kelvinsen, Miftah):** Pay only for shuttles, not court
- **Regular Players:** Pay full court + shuttle fees

---

## Typical Session Duration

From Start to Finish:

```
Setup Phase: 10 minutes
├─→ Create schedule
├─→ Add players
└─→ Generate first match

Play Phase: 120 minutes (3-4 hours)
├─→ Multiple matches
├─→ Update shuttlecock usage
└─→ Continuous suggestions

Settlement Phase: 5 minutes
├─→ View payments
├─→ Record collection methods
└─→ Done
```

Total typical session: **135-145 minutes** (2.25-2.5 hours)
