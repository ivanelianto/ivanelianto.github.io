# Badminton Matchmaker - Data Structure Specification

## Overview

The application persists data in four JSON files stored in browser localStorage. Each file contains an array of objects. All data is stored synchronously with no server backend.

---

## players.json

**Storage Key:** `bbmm:players.json`

**Array of Player Objects**

### Player Object Schema

```json
{
  "id": "uuid",
  "name": "string",
  "class": "C|B|A|S",
  "note": "string"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Unique identifier for player, generated as UUID v4 string |
| `name` | String | Yes | Player display name, normalized (trimmed whitespace) |
| `class` | Enum | Yes | Skill level: C (beginner), B (intermediate), A (advanced), S (expert) |
| `note` | String | No | Optional note/description for player (e.g., "Prefers singles", "LH player") |

### Validation Rules
- `id`: Must be non-empty UUID
- `name`: Must not be empty; treated as case-sensitive for display, case-insensitive for matching
- `class`: Must be one of C, B, A, S; invalid values default to C
- `note`: Can be empty string or omitted

### Example

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Ivan",
    "class": "A",
    "note": "Plays doubles well"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Okky",
    "class": "B",
    "note": ""
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Mei",
    "class": "C",
    "note": "Beginner"
  }
]
```

### Relationships
- Referenced by `schedules.playerIds` array (store player ID)
- Referenced by `matches.playerNames` array (store player name)
- Referenced by `payments.playerName` (store player name)

---

## schedules.json

**Storage Key:** `bbmm:schedules.json`

**Array of Schedule Objects**

### Schedule Object Schema

```json
{
  "id": "uuid",
  "dateISO": "YYYY-MM-DD",
  "sessionName": "string",
  "isSparringMode": "boolean",
  "teamA": "string",
  "teamB": "string",
  "createdAt": "timestamp",
  "courtFee": "number",
  "shuttleFeePer": "number",
  "playerIds": ["uuid", ...],
  "joins": [
    {
      "playerId": "uuid",
      "joinTime": "timestamp",
      "team": "string or null"
    },
    ...
  ]
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Unique identifier for schedule |
| `dateISO` | String (YYYY-MM-DD) | Yes | Session date in ISO format |
| `sessionName` | String | No | Optional label for session (e.g., "Friday Night League") |
| `isSparringMode` | Boolean | Yes | True if sparring mode (teams predefined), false for normal mode |
| `teamA` | String | Conditional | Team A name (required if isSparringMode=true, empty otherwise) |
| `teamB` | String | Conditional | Team B name (required if isSparringMode=true, empty otherwise) |
| `createdAt` | Timestamp | Yes | Unix timestamp (ms) when schedule created |
| `courtFee` | Number | Yes | Fee per player in Rp (e.g., 15000) |
| `shuttleFeePer` | Number | Yes | Fee per shuttlecock in Rp (e.g., 4000) |
| `playerIds` | Array<UUID> | Yes | List of player IDs added to this schedule (can be empty) |
| `joins` | Array<JoinRecord> | Yes | Join records tracking arrival time and team assignment |

### Join Record Schema

```json
{
  "playerId": "uuid",
  "joinTime": "timestamp",
  "team": "string or null"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `playerId` | UUID | Yes | Reference to player |
| `joinTime` | Timestamp | Yes | Unix timestamp (ms) when player added to schedule |
| `team` | String or Null | Conditional | Team name if Sparring Mode (null in Normal Mode) |

### Validation Rules
- `dateISO`: Must be valid ISO format (YYYY-MM-DD)
- `isSparringMode`: Boolean (true/false)
- If Sparring Mode: teamA and teamB must be non-empty strings
- `courtFee`, `shuttleFeePer`: Must be non-negative numbers
- `playerIds`: Must be array of valid UUIDs (can be empty)
- `joins`: Must be array; one join per playerId

### Example

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440100",
    "dateISO": "2024-06-12",
    "sessionName": "Friday Night Session",
    "isSparringMode": false,
    "teamA": "",
    "teamB": "",
    "createdAt": 1718169600000,
    "courtFee": 15000,
    "shuttleFeePer": 4000,
    "playerIds": [
      "550e8400-e29b-41d4-a716-446655440000",
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002",
      "550e8400-e29b-41d4-a716-446655440003"
    ],
    "joins": [
      {
        "playerId": "550e8400-e29b-41d4-a716-446655440000",
        "joinTime": 1718169900000,
        "team": null
      },
      {
        "playerId": "550e8400-e29b-41d4-a716-446655440001",
        "joinTime": 1718170200000,
        "team": null
      }
    ]
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440101",
    "dateISO": "2024-06-19",
    "sessionName": "League Match",
    "isSparringMode": true,
    "teamA": "Red Dragons",
    "teamB": "Blue Eagles",
    "createdAt": 1718774400000,
    "courtFee": 20000,
    "shuttleFeePer": 5000,
    "playerIds": [
      "550e8400-e29b-41d4-a716-446655440000",
      "550e8400-e29b-41d4-a716-446655440001"
    ],
    "joins": [
      {
        "playerId": "550e8400-e29b-41d4-a716-446655440000",
        "joinTime": 1718774700000,
        "team": "Red Dragons"
      },
      {
        "playerId": "550e8400-e29b-41d4-a716-446655440001",
        "joinTime": 1718774800000,
        "team": "Blue Eagles"
      }
    ]
  }
]
```

### Relationships
- References `players` by ID (playerIds array)
- Referenced by `matches` (scheduleId)
- Referenced by `payments` (scheduleId)

---

## matches.json

**Storage Key:** `bbmm:matches.json`

**Array of Match Objects**

### Match Object Schema

```json
{
  "id": "uuid",
  "scheduleId": "uuid",
  "matchNumber": "number",
  "playerNames": ["string", "string", "string", "string"],
  "shuttlecockUsage": {
    "shuttles": "number"
  },
  "createdAt": "timestamp"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Unique identifier for match |
| `scheduleId` | UUID | Yes | Reference to schedule this match belongs to |
| `matchNumber` | Number | Yes | Sequential match number within schedule (1, 2, 3, ...) |
| `playerNames` | Array<String> | Yes | Array of exactly 4 player names: [Team A player 1, Team A player 2, Team B player 1, Team B player 2] |
| `shuttlecockUsage` | Object | Yes | Object with `shuttles` property |
| `shuttlecockUsage.shuttles` | Number | Yes | Number of shuttles used (≥0) |
| `createdAt` | Timestamp | Yes | Unix timestamp (ms) when match was created |

### Validation Rules
- `playerNames`: Must be array of exactly 4 non-empty strings
- `matchNumber`: Must be positive integer, unique per schedule
- `shuttles`: Must be non-negative integer (≥0)
- All 4 player names must refer to existing or historical players

### Example

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440200",
    "scheduleId": "550e8400-e29b-41d4-a716-446655440100",
    "matchNumber": 1,
    "playerNames": ["Ivan", "Okky", "Christy", "Mei"],
    "shuttlecockUsage": {
      "shuttles": 2
    },
    "createdAt": 1718170500000
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440201",
    "scheduleId": "550e8400-e29b-41d4-a716-446655440100",
    "matchNumber": 2,
    "playerNames": ["Arga", "Elvin", "Ricky V.", "Hendra Lim"],
    "shuttlecockUsage": {
      "shuttles": 3
    },
    "createdAt": 1718171400000
  }
]
```

### Relationships
- References `schedules` by ID (scheduleId)
- Player names match `players` roster (but stored as names, not IDs)
- Used by `payments` to calculate shuttlecock aggregation

---

## payments.json

**Storage Key:** `bbmm:payments.json`

**Array of Payment Objects**

### Payment Object Schema

```json
{
  "id": "uuid",
  "playerName": "string",
  "scheduleId": "uuid",
  "scheduleDateISO": "YYYY-MM-DD",
  "shuttlecockUsage": {
    "shuttles": "number"
  },
  "totalPayment": "number",
  "paymentMethod": "string or empty",
  "createdAt": "timestamp"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Unique identifier for payment record |
| `playerName` | String | Yes | Player name (reference, stored as name not ID) |
| `scheduleId` | UUID | Yes | Reference to schedule this payment belongs to |
| `scheduleDateISO` | String (YYYY-MM-DD) | Yes | Schedule date in ISO format (denormalized for display) |
| `shuttlecockUsage` | Object | Yes | Object with `shuttles` property |
| `shuttlecockUsage.shuttles` | Number | Yes | Total shuttles used by this player in this schedule |
| `totalPayment` | Number | Yes | Total payment owed in Rp (recalculated dynamically) |
| `paymentMethod` | String | No | "Cash" or "TF" (Bank Transfer); empty string if unpaid |
| `createdAt` | Timestamp | Yes | Unix timestamp (ms) when payment record created |

### Payment Calculation (Denormalized)
- **Recalculated** whenever matches are added/removed or shuttlecock usage changes
- **Not Persisted:** Only `paymentMethod` persists; `totalPayment` is computed
- **Formula:** Depends on player special rules (see BUSINESS_RULES.md)

### Validation Rules
- `playerName`: Must reference player in roster (or historical player)
- `paymentMethod`: Must be empty string, "Cash", or "TF"
- `totalPayment`: Must be non-negative number

### Example

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440300",
    "playerName": "Ivan",
    "scheduleId": "550e8400-e29b-41d4-a716-446655440100",
    "scheduleDateISO": "2024-06-12",
    "shuttlecockUsage": {
      "shuttles": 3
    },
    "totalPayment": 27000,
    "paymentMethod": "TF",
    "createdAt": 1718170500000
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440301",
    "playerName": "Okky",
    "scheduleId": "550e8400-e29b-41d4-a716-446655440100",
    "scheduleDateISO": "2024-06-12",
    "shuttlecockUsage": {
      "shuttles": 2
    },
    "totalPayment": 23000,
    "paymentMethod": "",
    "createdAt": 1718170500000
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440302",
    "playerName": "Mei",
    "scheduleId": "550e8400-e29b-41d4-a716-446655440100",
    "scheduleDateISO": "2024-06-12",
    "shuttlecockUsage": {
      "shuttles": 1
    },
    "totalPayment": 0,
    "paymentMethod": "Cash",
    "createdAt": 1718170500000
  }
]
```

### Relationships
- References `schedules` by ID
- References `players` by name (not ID)
- Records created automatically when matches are added
- Multiple payments per schedule (one per player per schedule)

---

## Data Relationships Diagram

```
┌──────────────┐
│   Players    │
└──────────────┘
      ▲
      │ referenced by
      │ playerIds[]
      │
┌─────┴──────────┐
│  Schedules     │
│  - playerIds[] │◄──────┐
│  - joins[]     │       │
└─────┬──────────┘       │
      │ referenced by    │
      │ scheduleId       │
      │                  │
  ┌───┴────────┬─────────┴──┐
  │            │            │
┌─┴──────┐ ┌──┴────┐ ┌────┴─┐
│Matches │ │Payments     │
│ - playerNames │ - playerName  │
└────────┘ └─────────┘
```

---

## Storage Limits & Constraints

### Storage Capacity
- **Browser localStorage:** Typically 5-10 MB per domain
- **Typical Usage:** 18 players + 50 schedules + 500 matches + 1000 payments ≈ 500 KB
- **Growth Rate:** Each match adds ~0.5 KB, each payment adds ~0.2 KB

### Index Constraints (Performance Considerations)
- No database indexes
- Filtering/sorting done in-memory (JavaScript arrays)
- Linear search O(n) for all queries
- Assumed max 100 players, 50 schedules, 1000 matches

### Data Consistency
- **No Transaction Support:** No atomic updates across files
- **Manual Consistency:** App logic ensures consistency (e.g., when match deleted, payments recalculated)
- **No Referential Integrity Constraints:** Can have orphaned references if data corrupted

---

## Import/Export Format

### Export Process
All four files exported simultaneously as separate JSON arrays (as-is from storage).

### Import Process
- Each file must be valid JSON array
- No merge logic - completely replaces existing data
- Validation is lenient (some invalid records may be imported)

### Backup Strategy
- Manual export and save to local file
- No automatic backups
- User responsible for versioning

---

## Data Migration Notes

When migrating to a new technology stack:

1. **Rename Fields:** Keep field names identical if possible
2. **Data Types:** Ensure timestamps remain milliseconds (not seconds)
3. **Unique IDs:** UUIDs stored as strings; can migrate to numeric IDs if desired
4. **Array Storage:** Consider denormalization if moving to traditional database
5. **Normalization:** Consider moving player names in matches to player IDs for referential integrity
6. **Soft Delete:** Consider adding `deletedAt` timestamp for audit trail instead of hard delete

---

## Known Data Issues & Workarounds

### Issue: Deleted Player Still in Match History
**Cause:** Matches store player names, not IDs; deletion doesn't cascade
**Workaround:** Keep deleted player names in history for record-keeping; don't delete players lightly

### Issue: Payment Totals Out of Sync
**Cause:** Complex recalculation logic with special player exceptions
**Workaround:** Re-save all matches for schedule to trigger recalculation

### Issue: Schedule Fees Cannot Be Changed
**Cause:** Fees are per-schedule but not editable after creation
**Workaround:** Create new schedule with correct fees; old payments retain original fees

---

## Future Database Schema Recommendations

If migrating to a real database:

```sql
-- Players
CREATE TABLE players (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  class CHAR(1) NOT NULL,
  note TEXT,
  created_at TIMESTAMP,
  deleted_at TIMESTAMP  -- soft delete
);

-- Schedules
CREATE TABLE schedules (
  id UUID PRIMARY KEY,
  date_iso DATE NOT NULL,
  session_name VARCHAR(255),
  is_sparring_mode BOOLEAN DEFAULT FALSE,
  team_a VARCHAR(255),
  team_b VARCHAR(255),
  court_fee INTEGER,
  shuttle_fee_per INTEGER,
  created_at TIMESTAMP
);

-- Schedule Players (Join Table)
CREATE TABLE schedule_players (
  id UUID PRIMARY KEY,
  schedule_id UUID REFERENCES schedules(id),
  player_id UUID REFERENCES players(id),
  join_time TIMESTAMP,
  team VARCHAR(255),  -- NULL if normal mode
  UNIQUE(schedule_id, player_id)
);

-- Matches
CREATE TABLE matches (
  id UUID PRIMARY KEY,
  schedule_id UUID REFERENCES schedules(id),
  match_number INTEGER NOT NULL,
  created_at TIMESTAMP,
  UNIQUE(schedule_id, match_number)
);

-- Match Players (Join Table for M:N)
CREATE TABLE match_players (
  id UUID PRIMARY KEY,
  match_id UUID REFERENCES matches(id),
  player_id UUID REFERENCES players(id),
  team_side INTEGER  -- 0=Team A, 1=Team B
);

-- Match Shuttlecock Usage
CREATE TABLE match_shuttlecock (
  match_id UUID PRIMARY KEY REFERENCES matches(id),
  shuttles INTEGER DEFAULT 0
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  schedule_id UUID REFERENCES schedules(id),
  player_id UUID REFERENCES players(id),
  total_payment INTEGER,
  payment_method VARCHAR(10),  -- 'Cash', 'TF', NULL
  created_at TIMESTAMP,
  UNIQUE(schedule_id, player_id)
);

-- Indexes
CREATE INDEX idx_schedules_date ON schedules(date_iso);
CREATE INDEX idx_matches_schedule ON matches(schedule_id);
CREATE INDEX idx_payments_schedule ON payments(schedule_id);
```
