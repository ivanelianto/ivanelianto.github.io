# Badminton Matchmaker - Migration Guide

## Purpose

This guide enables an AI coding agent (or human developer) to completely recreate this application in a **different technology stack** while preserving all existing functionality and behavior.

---

## Critical Success Criteria for Migration

The migrated application MUST:

1. ✓ Generate fair matches using identical balancing algorithm
2. ✓ Support both Normal and Sparring modes with same rules
3. ✓ Calculate payments with exact same special player exceptions
4. ✓ Provide identical UI/UX on mobile (not just functional equivalence)
5. ✓ Store data in compatible JSON format (for export/import)
6. ✓ Work offline (or be explicitly cloud-based with sync)
7. ✓ Support PWA installation (or be installed as native app)
8. ✓ Preserve all edge cases and business logic
9. ✓ Maintain data portability (JSON import/export must work)
10. ✓ Keep same feature set (no regressions)

---

## Absolute Requirements (Non-Negotiable)

### Business Logic Constraints
- **Match Algorithm:** MUST match exactly (pairwise difference, class balance)
- **Player Classes:** MUST be C, B, A, S with same rank order
- **Payment Rules:** MUST include exact same special player exceptions
- **Dates & Times:** MUST use ISO format for dates, Unix timestamps for times
- **Currency:** MUST be Indonesian Rupiah (Rp) with proper formatting
- **Greetings:** MUST use exact same time-based greeting strings

### Data Structures
- **Player:** id, name, class, note (4 fields exactly)
- **Schedule:** All existing fields must be preserved (including team names, fees)
- **Match:** playerNames array of 4 strings, not player IDs
- **Payment:** playerName (string), not playerID (to allow historical records)
- **UUIDs:** Must be strings (can convert to numeric if database used)

### UI/UX Constraints
- **Mobile Width:** Max 430px (do not scale to desktop)
- **Bottom Navigation:** Primary on mobile (not top menu)
- **Modals:** Must close on backdrop click
- **Keyboard:** Arrow keys in autocomplete, Escape to close modals
- **Dark Theme:** Default (light theme optional)
- **Touch Targets:** Min 44px for buttons
- **Orientation:** Portrait primary (landscape should work but not required)

### Offline Requirements
- **Offline Support:** Must work after initial load (PWA or native app)
- **Sync:** Not required if moving to cloud (but must inform user if offline)
- **Data Loss Prevention:** User must not lose data due to offline state

---

## Migration Decision Trees

### Question 1: Cloud-Based or Client-Side?

**If Keeping Client-Side Only:**
- Maintain localStorage-style persistence
- Keep offline-capable design
- Recommended stacks: SPA frameworks (React, Vue, Svelte)
- Data storage: IndexedDB (better than localStorage)

**If Going Cloud-Based:**
- Design database schema (see DATA_STRUCTURE.md recommendations)
- Add backend API (Node.js, Python, Java, etc.)
- Implement real-time sync
- Add authentication/authorization
- Recommended stacks: React + Firebase, Next.js + Supabase, etc.

### Question 2: Mobile-Only or Web + Desktop?

**If Mobile-Only (Recommended):**
- Keep 430px max width
- Consider React Native or Flutter for native app
- PWA is also option (current approach)

**If Web + Desktop:**
- Responsive design for all sizes (600px, 1024px, 2560px)
- Better navigation for larger screens
- Keyboard shortcuts and desk-friendly UI
- Complexity increases significantly

### Question 3: Single Framework or Multi-Module?

**If Monolithic (Current Approach):**
- Single app.js file handling all logic
- Simpler deployment, but hard to scale
- Good for small teams, prototype
- Migration: Keep structure similar in new tech

**If Modular (Recommended for New Stack):**
- Separate components for each feature (Dashboard, Players, Schedule, etc.)
- Separate services for logic (matchmaking, payments, storage)
- Better testing, maintainability
- Migration: Natural fit for component-based frameworks

### Question 4: JavaScript or Other Language?

**If Staying JavaScript:**
- React, Vue, Svelte (web)
- React Native, Expo (mobile)
- Electron (desktop)
- Easier migration from vanilla JS

**If Changing Language:**
- Python + Django/Flask (web backend)
- Java/Kotlin (mobile, web backend)
- C# + .NET (web backend)
- Go (fast API server)
- Rust (performance-critical services)
- Major learning curve, need to completely reimplement logic

---

## Step-by-Step Migration Path

### Phase 1: Architecture & Technology Selection

```
Decision: Client-side only or cloud-based?
    ↓
Decision: Mobile-only or responsive?
    ↓
Decision: Framework choice (React, Vue, Flutter, etc.)?
    ↓
Decision: Database (if backend) - SQL, NoSQL, document?
    ↓
Create project scaffold in new framework
```

### Phase 2: Data Layer

```
Define database schema (use recommendations from DATA_STRUCTURE.md)
    ↓
Implement CRUD operations for:
    ├─ Players
    ├─ Schedules
    ├─ Matches
    └─ Payments
    ↓
Add import/export JSON functionality
    ↓
Test data persistence & consistency
```

### Phase 3: Business Logic Layer

```
Implement utility functions:
    ├─ Date formatting (todayISO, formatDateNice, etc.)
    ├─ String utilities (capitalizeEachWord, normalizeName)
    ├─ UUID generation
    └─ Currency formatting

Implement match algorithm:
    ├─ getPlayerComfortRank()
    ├─ balanceScoreForTeams()
    ├─ suggestMatchesForSchedule()
    └─ Test extensively against reference output

Implement payment logic:
    ├─ computeTotalPayment()
    ├─ autoEnsurePaymentsForSchedule()
    ├─ updatePaymentsTotalsForSchedule()
    └─ Handle special player exceptions

Test all business logic with unit tests
```

### Phase 4: UI Layer

```
Implement layouts:
    ├─ Navigation (drawer + bottom nav)
    ├─ Dashboard (6 metrics cards)
    ├─ Players (CRUD + autocomplete)
    ├─ Schedule (creation, player add, team view)
    ├─ Matches (suggest + manual + history)
    ├─ Payments (list + collection message)
    └─ Import/Export

Implement modals:
    ├─ Add/Edit Player
    ├─ Create Schedule
    ├─ Add Match (manual)
    ├─ View Suggestions
    ├─ Set Payment Method
    ├─ Collect Payment Message
    └─ Confirmation dialogs

Implement interactions:
    ├─ Autocomplete functionality
    ├─ Theme toggle
    ├─ Form validation
    ├─ Toast notifications
    ├─ Keyboard navigation
    └─ Touch-friendly controls

Test UI on multiple devices & screen sizes
```

### Phase 5: Integration & Testing

```
Integration tests:
    ├─ Create schedule → Add players → Suggest matches
    ├─ Add match → Update shuttlecock → Check payments
    ├─ Export → Import → Verify data integrity
    └─ End-to-end workflows

Acceptance tests:
    ├─ All features work
    ├─ All workflows complete
    ├─ No data loss scenarios
    └─ Performance acceptable

Browser/device testing:
    ├─ Chrome, Firefox, Safari, Edge
    ├─ iOS, Android
    ├─ Tablets
    └─ Offline capability
```

### Phase 6: Deployment & Migration

```
Deploy to production
    ↓
Setup data migration (export old → import new)
    ↓
Beta test with real users
    ↓
Gather feedback & fix issues
    ↓
Official launch
```

---

## Recommended Target Stacks

### Option A: Web-Based (Client-Side Focus)

**Tech Stack:**
- Frontend: React 18+ / Vue 3 / Svelte
- State: Context API / Pinia / Svelte stores
- Storage: IndexedDB with idb library
- Styling: Tailwind CSS / Material-UI
- Build: Vite / Parcel
- Deployment: Vercel / Netlify / Cloudflare Pages

**Advantages:**
- Easiest migration from current vanilla JS
- Proven ecosystem
- Large community
- Offline-capable
- PWA support

**Estimated Effort:** 1-2 weeks for experienced dev

---

### Option B: Full Stack (Cloud-Based)

**Tech Stack:**
- Frontend: React / Vue / Flutter
- Backend: Node.js/Express, Python/FastAPI, or Go
- Database: PostgreSQL / MongoDB / Supabase
- Authentication: Auth0 / Firebase Auth
- API: REST or GraphQL
- Deployment: Heroku / AWS / Google Cloud / DigitalOcean

**Advantages:**
- Real-time multi-user support
- Persistent cloud storage
- Easy mobile app
- Better scalability
- Analytics built-in

**Disadvantages:**
- More complex architecture
- Requires backend ops
- Ongoing hosting costs
- More security concerns

**Estimated Effort:** 3-4 weeks for experienced full-stack dev

---

### Option C: Native Mobile

**Tech Stack:**
- Frontend: React Native / Flutter / SwiftUI (iOS) / Kotlin (Android)
- Backend: Optional (can use Firebase or custom API)
- Storage: SQLite / Realm / Firebase Firestore
- Deployment: App Store / Google Play

**Advantages:**
- Better mobile performance
- Access to phone features (notifications, etc.)
- Can work offline easily
- App store presence

**Disadvantages:**
- Requires mobile development expertise
- Longer development time
- App store review process

**Estimated Effort:** 2-3 weeks for mobile expert, 4-6 weeks for web dev

---

### Option D: Flutter (Recommended for Cross-Platform)

**Tech Stack:**
- Frontend: Flutter
- Backend: Firebase or custom API
- Storage: SQLite / Hive
- Deployment: App Store / Google Play / Web

**Advantages:**
- Single codebase for iOS, Android, Web
- Great mobile performance
- Built-in offline support (SQLite)
- Hot reload development
- Growing ecosystem

**Disadvantages:**
- Less mature than React Native
- Smaller community
- Dart learning curve

**Estimated Effort:** 2-3 weeks for Flutter expert

---

## Critical Algorithms to Preserve Exactly

### Algorithm 1: Match Balancing Score

**MUST Implement Identically:**

```
Function: balanceScoreForTeams(teamA, teamB)
  Input: Two arrays of player objects with class property
  Output: Numeric score (lower is better balanced)

Algorithm:
1. Extract class ranks: [S=3, A=2, B=1, C=0]
2. Sort each team's ranks descending (highest skill first)
3. Pad shorter team with rank=10 (uneven penalty)
4. Sum absolute differences per position:
   score = |rank_A[0] - rank_B[0]| + |rank_A[1] - rank_B[1]|
5. Return score (0 = perfect balance, higher = worse)

Examples:
- Team A: [S(3), C(0)] = [3, 0] vs Team B: [A(2), B(1)] = [2, 1]
  Score = |3-2| + |0-1| = 1 + 1 = 2 ✓ Balanced

- Team A: [S(3), C(0)] = [3, 0] vs Team B: [A(2), A(2)] = [2, 2]
  Score = |3-2| + |0-2| = 1 + 2 = 3 ✗ Unbalanced

- Uneven teams: [S(3), A(2), C(0)] vs [B(1)]
  Pad second: [3, 2, 0] vs [1, 10, 10]
  Score = |3-1| + |2-10| + |0-10| = 2 + 8 + 10 = 20 (heavily penalized)
```

**Critical:** Exact implementation required - algorithm affects all suggestions

---

### Algorithm 2: Suggestion Generation Priority

**MUST Implement Exactly:**

```
Priority 1: Class Balance (Primary)
  - Sort suggestions by balanceScoreForTeams()
  - Lower score is better

Priority 2: Play Frequency (Secondary)
  - For suggestions with equal class balance
  - Sum total matches played by all 4 players
  - Lower sum = players have played less = prioritized

Priority 3: Arrival Time (Tertiary)
  - For suggestions with equal class balance AND play count
  - Sum arrival timestamps of all 4 players
  - Lower sum = earlier arrivals = prioritized

Result: Top 3 suggestions with lowest combined score

Formula:
overall_score = (classDiff * 1000) + playedSum + arrivalSum
(Note: Different coefficient in sparring mode: classDiff * 100)
```

**Critical:** Suggestion quality depends on exact implementation

---

### Algorithm 3: Payment Calculation with Exceptions

**MUST Implement Exactly:**

```
Function: computeTotalPayment(shuttlecockUsage, playerName, courtFee, shuttleFeePer)

Step 1: Check player exceptions (CASE-INSENSITIVE)
  if playerName matches /^(mei|asrofi)$/i:
    return 0 (free player)

Step 2: Check if shuttle-only
  if playerName matches /^(kelvinsen|miftah|ivan)$/i:
    return shuttles * shuttleFeePer (no court fee)

Step 3: Regular calculation
  shuttles = Number(shuttlecockUsage?.shuttles ?? 0)
  shuttleFee = shuttles * shuttleFeePer
  total = shuttleFee + courtFee
  return total

Examples:
- Mei, 3 shuttles: 0 (always)
- Ivan, 3 shuttles: 3 * 4000 = 12000 (no court fee)
- Okky, 3 shuttles: 3 * 4000 + 15000 = 27000 (full fee)
```

**Critical:** Special pricing must be exact - affects revenue fairness

---

## Data Import/Export Compatibility

### Export Format

```json
{
  "players": [...],
  "schedules": [...],
  "matches": [...],
  "payments": [...]
}
```

Each array contains objects with exact schema defined in DATA_STRUCTURE.md

### Import Validation

**MUST validate:**
- All fields are present (or have sensible defaults)
- UUIDs are valid format (or generate new ones)
- Dates are ISO format
- Numbers are non-negative
- Enums (class, paymentMethod) are valid

**MUST preserve:**
- Exact field names (case-sensitive)
- Data types (strings, numbers, arrays)
- Relationships (playerIds references valid players)

### Import/Export Testing

```
Test Matrix:
1. Export old app → Import new app → Verify all data present
2. Modify data in new app → Export → Compare with original
3. Round-trip: Old → New → Export → Old → Verify match
```

---

## Special Cases & Edge Cases to Preserve

### Edge Case 1: Deleted Player in Match History
**Current Behavior:** Match persists; player removed from roster; payment still calculates
**Must Preserve:** Matches show deleted player name; payments calculated by name, not ID

### Edge Case 2: Special Player Added to Schedule Twice
**Current Behavior:** Duplicate joins create duplicate payment records
**Must Preserve:** Allow duplicates; show all in payment list

### Edge Case 3: Sparring Mode with Uneven Teams
**Current Behavior:** Cannot generate suggestions (algorithm fails gracefully)
**Must Preserve:** UI should show no suggestions; prevent match creation

### Edge Case 4: Zero Matches in Schedule
**Current Behavior:** Payments created for players but show Rp0 (if no shuttles)
**Must Preserve:** Players still appear in payment list even with zero balance

### Edge Case 5: Schedule Created, Never Used
**Current Behavior:** Schedule persists; no matches; no payments
**Must Preserve:** Schedule appears in dropdown; can add players later

---

## Performance Targets for Migration

**Must Meet These Minimums:**

| Operation | Target | Notes |
|-----------|--------|-------|
| Dashboard load | < 500ms | Display metrics |
| Suggestion generation | < 1s | 20-player group |
| Add player to schedule | < 100ms | Autocomplete + add |
| Save match | < 200ms | Persist to storage |
| Payment calculation | < 100ms | Recalc all payments |
| Data export | < 500ms | JSON generation |
| Data import | < 1s | Parse + validate + save |

**Assumption:** Typical deployment (20 players, 50 sessions, 500 matches)

---

## Testing Checklist for Migration

### Functionality Tests

```
Players:
  [ ] Create player
  [ ] Edit player class/note
  [ ] Delete player (cascade to schedules)
  [ ] Autocomplete works
  [ ] Name normalization works

Schedules:
  [ ] Create normal mode schedule
  [ ] Create sparring mode schedule
  [ ] Add player to schedule
  [ ] Remove player from schedule
  [ ] Switch active schedule
  [ ] Close schedule (clear active)
  [ ] Display correct fees
  [ ] Team filter works (sparring mode)

Matches:
  [ ] Generate suggestions
  [ ] Skip player → regenerate
  [ ] Manually pick 4 players
  [ ] Sparring mode enforces 2v2
  [ ] Create match from suggestion
  [ ] Update shuttlecock +1/-1
  [ ] Cancel match
  [ ] Match history displays correctly

Payments:
  [ ] Auto-create when match added
  [ ] Calculate court + shuttle fees
  [ ] Apply special pricing rules
  [ ] Recalculate when shuttle changes
  [ ] Display unpaid list
  [ ] Set payment method
  [ ] Generate collection message
  [ ] Message format correct (locale)

Data:
  [ ] Export generates valid JSON
  [ ] Import accepts valid JSON
  [ ] Round-trip export → import
  [ ] Reset clears data
  [ ] Seed players restore on reset
```

### Edge Case Tests

```
  [ ] < 4 players (cannot create match)
  [ ] All players in one team (sparring mode)
  [ ] Deleted player in match history
  [ ] Special player calculations
  [ ] Duplicate joins in schedule
  [ ] Very large datasets (500+ matches)
  [ ] Offline then online (if applicable)
```

### UI/UX Tests

```
  [ ] Mobile layout (430px width)
  [ ] Touch targets min 44px
  [ ] Keyboard navigation (Escape, Arrows)
  [ ] Theme toggle works
  [ ] Modals close on backdrop
  [ ] Autocomplete keyboard nav
  [ ] Confirmation dialogs
  [ ] Toast notifications
  [ ] Form validation messages
  [ ] Empty states display
  [ ] Long names/text wrap correctly
```

### Accessibility Tests

```
  [ ] ARIA labels present
  [ ] Semantic HTML
  [ ] Keyboard navigation possible
  [ ] Color contrast sufficient
  [ ] Focus management in modals
  [ ] Tab order logical
  [ ] Screen reader friendly
  [ ] Icons have labels
  [ ] Form labels associated
```

---

## Gotchas & Common Pitfalls

### Gotcha 1: UUID Generation
**Issue:** UUIDs must be strings, not objects
**Solution:** Generate as string format immediately, never parse

### Gotcha 2: Timestamp Precision
**Issue:** JavaScript timestamps are milliseconds; some systems use seconds
**Solution:** Always use milliseconds; be explicit in comments

### Gotcha 3: Player Name Matching
**Issue:** Matches store player NAMES, not IDs; deleted players leave orphans
**Solution:** This is intentional (audit trail); don't try to fix

### Gotcha 4: Special Player Regex
**Issue:** Case-insensitive regex matching for special pricing
**Solution:** Use `.toLowerCase()` before regex match; test with various cases

### Gotcha 5: Team Assignment in Sparring Mode
**Issue:** Players can be in only one team; join records track team
**Solution:** Validate team assignment; prevent cross-team picks in manual mode

### Gotcha 6: Shuttlecock Aggregation
**Issue:** Must sum shuttles across all matches player participated in
**Solution:** Iterate all matches; check playerNames array; sum per player

### Gotcha 7: Payment Recalculation Timing
**Issue:** Payments must recalculate when matches/shuttles change
**Solution:** Call recalc function after every match modification

### Gotcha 8: Suggestion Limit
**Issue:** Algorithm limits to 3 suggestions; limiting too early breaks algorithm
**Solution:** Generate all combinations first, then sort & take top 3

### Gotcha 9: Sparring Mode Match Validation
**Issue:** Manual match creation must enforce 2 from each team
**Solution:** Validate BEFORE adding match; count picks by team

### Gotcha 10: Indonesia-Specific Formatting
**Issue:** Dates and currency use Indonesian locale
**Solution:** Use `toLocaleString('id-ID')` for formatting; include locale in code comments

---

## Data Schema Differences

### If Migrating to SQL Database

```sql
-- Use exact field names and types
-- UUIDs can stay as VARCHAR(36) or convert to BIGINT
-- Timestamps: use BIGINT (milliseconds) or TIMESTAMP
-- Enums: use VARCHAR(1) with CHECK constraint
-- Arrays: use separate junction tables

Example Migration:
Old: playerIds: ["uuid1", "uuid2", "uuid3"]
New: scheduleId -< (many) schedule_players
     schedule_players(schedule_id, player_id, join_time, team)
```

### If Migrating to NoSQL (MongoDB/Firestore)

```javascript
// Keep document structure similar
// playerIds can stay as array of UUIDs
// joins can stay as nested array
// No schema enforcement needed (but validate in app)

Example Structure:
{
  _id: ObjectId,
  dateISO: "2024-06-12",
  sessionName: "Friday",
  isSparringMode: false,
  playerIds: ["uuid1", "uuid2"],
  joins: [{playerId: "uuid1", joinTime: 1234567890, team: null}],
  // ...
}
```

---

## Rollout & User Migration Strategy

### Phase 1: Beta Testing (1-2 weeks)
- Deploy new version to staging
- Test all workflows end-to-end
- Import actual user data from old app
- Verify all payments calculate correctly
- Fix bugs

### Phase 2: Parallel Running (1 week optional)
- Run both old and new versions
- Users can export from old, import to new
- Verify feature parity
- Gather feedback

### Phase 3: User Communication
- Announce sunset of old version
- Provide migration instructions
- Offer export template & import guide
- Support Q&A period

### Phase 4: Cutover (1 day)
- Retire old version
- Make new version primary
- Monitor for issues
- Have rollback plan ready

### Phase 5: Post-Launch (2-4 weeks)
- Monitor user feedback
- Fix issues quickly
- Gather improvement suggestions
- Plan v2 features

---

## Success Metrics After Migration

**The migration is successful if:**

1. ✓ All users can migrate their data (export/import works)
2. ✓ All existing features work identically
3. ✓ No data loss during migration
4. ✓ Performance is at least equal (suggest better)
5. ✓ User feedback is positive or neutral
6. ✓ No regression in features
7. ✓ Offline capability maintained (if was required)
8. ✓ Mobile experience equal or better

**Red Flags After Migration:**

- ✗ Users report data loss
- ✗ Suggestions appear different
- ✗ Payments calculate differently
- ✗ Performance regression > 20%
- ✗ Offline capability lost
- ✗ More than 5 bugs reported in first week

---

## Documentation for Future Maintainers

**When Migrating, Create:**

1. **MIGRATION_LOG.md** - Document all decisions made during migration
2. **TECH_STACK.md** - List all technologies, versions, and why chosen
3. **ARCHITECTURE.md** - New system architecture, data flow
4. **DATABASE_SCHEMA.md** - If using database, document schema
5. **API_DOCS.md** - If using backend API, document endpoints
6. **DEPLOYMENT.md** - How to build, test, deploy
7. **TROUBLESHOOTING.md** - Common issues and solutions

---

## Conclusion

The Badminton Matchmaker application is **self-contained and well-specified**, making migration to other stacks feasible with careful attention to:

1. **Business Logic Fidelity:** Exact algorithm implementation
2. **Data Compatibility:** JSON import/export must work
3. **UX Consistency:** Mobile-first design must be preserved
4. **Edge Case Handling:** All special cases must behave identically
5. **Special Pricing Rules:** Exact regex matching required

**Recommended:** React/Vue for web, Flutter for mobile, Node.js + PostgreSQL for full-stack

**Estimated Total Migration Effort:** 2-4 weeks for experienced developer in chosen stack

**Risk Level:** Low (application is well-documented and business logic is explicit)

**Success Probability:** 90%+ if checklists followed and testing done thoroughly
