# Badminton Matchmaker - Product Requirement Document

## Application Overview

**Name:** Badminton Matchmaker

**Type:** Progressive Web App (PWA)

**Target Platform:** Mobile-first responsive web application

**Technology Stack:** Vanilla JavaScript (ES6 modules), HTML5, CSS3, Bulma CSS framework

**Storage:** Browser localStorage (with JSON import/export support)

---

## Purpose & Problem Statement

Badminton Matchmaker is a specialized match management tool for badminton session organizers. It solves the following problems:

1. **Fair Match Generation:** Manually pairing players for fair, balanced matches is time-consuming and subjective. This app uses an algorithm to generate suggestions based on player skill level and match frequency.

2. **Player Management:** Managing a roster of players with different skill levels and tracking who has played how many matches.

3. **Session Organization:** Creating and managing badminton sessions, tracking player attendance, and managing multiple sessions.

4. **Payment Collection:** Calculating and tracking payment collection from players for court rental and shuttlecock usage, including automated message generation for collection.

5. **Data Portability:** Users need to backup their data and migrate between devices. The app provides JSON import/export functionality.

---

## Core Features - High Level

### 1. Player Management
- Create and maintain a roster of players
- Assign skill levels to each player (Classes: C, B, A, S)
- Add optional notes for each player
- Edit and delete players

### 2. Schedule Management
- Create badminton sessions (schedules) with specific dates
- Support two match formats: **Normal Mode** and **Sparring Mode**
- Add players to a schedule
- Track player arrival times automatically
- Support custom court and shuttlecock fees per schedule

### 3. Sparring Mode (Optional)
- Define two teams explicitly (e.g., "Team A" vs "Team B")
- Matches must consist of 2 players from each team
- Players must select their team when joining the schedule

### 4. Match Suggestions Engine
- Generate fair match suggestions automatically
- Prioritize players who have played fewer matches
- Balance team skill levels using a class-based algorithm
- Allow manual player picking for custom matches
- Support skipping players to regenerate suggestions

### 5. Match Management
- Manually create matches by selecting 4 players
- Use AI-generated suggestions to select matches
- Track shuttlecock usage per match
- View match history per session
- Cancel matches if needed

### 6. Payment Management
- Automatically calculate payment owed by each player
- Support special pricing for specific players
- Generate pre-formatted messages for payment collection
- Track payment method (Cash or Bank Transfer)
- Mark payments as collected

### 7. Dashboard
- Display key metrics:
  - Total players
  - Active players in current session
  - Total matches in current session
  - Shuttlecock usage
  - Outstanding payment count
  - Active session date

### 8. Import / Export
- Export all data as JSON files (players, schedules, matches, payments)
- Import JSON data to restore or migrate data
- Reset all data with confirmation

### 9. Data Persistence
- All data stored in browser localStorage
- Automatic save on every action
- PWA support with service worker for offline capability

---

## Intended Users

- **Primary User:** Badminton session organizer/facilitator
- **Secondary Users:** Players checking their match history and payment status
- **Assumed Audience:** Small to medium-sized badminton groups (10-20 players)
- **Region:** Indonesia (Indonesian language text and currency in payments)

---

## Intended Use Cases

1. Weekly badminton organizer sets up a schedule for Friday night session
2. Players arrive and are added to the schedule via name autocomplete
3. Organizer generates match suggestions to create balanced teams
4. Matches are selected from suggestions or created manually
5. Shuttlecock usage is tracked per match
6. Payment collection is initiated with automated messages
7. Data is exported at month-end for backup and record-keeping

---

## Storage Approach

The application uses **browser localStorage** as the primary storage mechanism:

- **Storage Format:** JSON
- **Storage Keys:** 
  - `bbmm:players.json` - Player roster
  - `bbmm:schedules.json` - Session schedules
  - `bbmm:matches.json` - Match history
  - `bbmm:payments.json` - Payment records

- **Data Initialization:** On first run, seed data is provided with default players
- **Backup/Restore:** Full JSON export/import for data portability
- **No Cloud Sync:** Application is fully offline-capable; no server required

---

## Mobile-First Philosophy

1. **Viewport Constraints:** App is designed for mobile width (max 430px, typical phone size)
2. **Touch-Friendly:** Large buttons and spacing for finger input
3. **Bottom Navigation:** Primary navigation is bottom-nav for thumb reachability
4. **Drawer Navigation:** Secondary navigation accessible via hamburger menu
5. **Responsive Forms:** Input fields sized for mobile keyboards
6. **Dark Theme Default:** Reduces eye strain in typical usage contexts (indoor badminton courts)
7. **PWA Support:** Can be installed as app on mobile home screen
8. **Offline Capability:** Works fully offline after initial load (via service worker)

---

## Technical Constraints

- **Framework:** Vanilla JavaScript (no React, Vue, or external frameworks)
- **Build Process:** None - single-file ES6 modules served directly
- **Browser Compatibility:** Modern browsers with ES6 module support
- **Accessibility:** ARIA labels for screen readers, semantic HTML
- **CSS Framework:** Bulma CSS (v1.0.4) with custom overrides in styles.css

---

## Key Metrics & Success Criteria

The application is deemed successful if users can:

1. Create a schedule and add players in under 2 minutes
2. Generate and select a fair match in under 1 minute
3. Track shuttlecock usage and payments without manual calculation
4. Export/restore all data via JSON without data loss

---

## Non-Goals

- Real-time multiplayer synchronization
- Player authentication or user accounts
- Server-side data storage
- Mobile app (native iOS/Android)
- Video streaming or court booking integration
- Payment processing (only calculation and message generation)
