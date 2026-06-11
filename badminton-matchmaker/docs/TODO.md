# Badminton Matchmaker - TODO & Technical Debt

This document lists incomplete features, known issues, and areas marked for future work.

---

## Incomplete Implementations

### Feature: Player Match Statistics
- **Status:** Placeholder function exists but unimplemented
- **Function:** `renderPlayersForSuggestion()` in app.js
- **Purpose:** Unknown (likely planned to show player stats or suggestions context)
- **Evidence:** Function defined but empty; called nowhere
- **Priority:** Low
- **Recommendation:** Remove if unused, or implement if needed for UI context

---

## Technical Debt & Refactoring

### CSS Refactoring: Bulma-Only Migration
- **Status:** Documented in TODO.md (project root)
- **Scope:** Complete refactoring of custom CSS to Bulma equivalents
- **Items:**
  - [ ] Remove custom utility classes (`.u-*`, `.fw-900`, `.no-margin`, etc.)
  - [ ] Remove custom component overrides (`.card` customizations, custom `.table`, etc.)
  - [ ] Remove bespoke CSS where Bulma equivalent exists
  - [ ] Replace all custom classNames in app.js:
    - Replace `.btn` → `.button`
    - Replace `.btn.good` → `.button.is-success`
    - Replace `.btn.danger` → `.button.is-danger`
    - Replace `.btn.primary` → `.button.is-primary`
    - Replace `mt-#`, `mb-#` → Bulma `mt-#`, `mb-#`
    - Replace custom spacing utilities with Bulma equivalents
  - [ ] Refactor `confirmDialog.js` to use Bulma classes only
  - [ ] Update index.html to remove unnecessary custom class usage
  - [ ] Keep only essential custom CSS:
    - Drawer animation (`.open`, `.drawer-backdrop.open`)
    - View switching (`.view.active`)
    - Custom controls that Bulma lacks (`.class-radio`, `.switch`)
  - [ ] Manual verification: Test all features in browser
- **Priority:** Medium (code quality improvement, not user-facing)
- **Effort:** 2-3 hours estimated
- **Risk:** Low (mostly mechanical replacements)

---

## Known Limitations (By Design)

### No Real-Time Synchronization
- **Issue:** Only one user can operate at a time
- **Reason:** Single-device localStorage only
- **Workaround:** Export/import data between devices
- **Future:** Would require server sync
- **Impact:** Not suitable for multi-user live session management

### No Cloud Backup
- **Issue:** Data only persists in browser localStorage
- **Reason:** No backend server
- **Workaround:** Manual export and save to local file
- **Future:** Could integrate with Dropbox/Google Drive APIs
- **Impact:** Risk of data loss if browser cache cleared
- **Recommendation:** User should export regularly

### No Multi-Device Sync
- **Issue:** Each device has independent data
- **Reason:** Single-device localStorage
- **Workaround:** Manual export/import between devices
- **Future:** Cloud sync or server backend
- **Impact:** User must manually sync devices

### No Browser Compatibility Layer
- **Issue:** Requires modern browser with ES6 module support
- **Reason:** Uses vanilla ES6 without transpilation
- **Compatibility:** IE11 not supported
- **Future:** Could add build step with Babel transpiler
- **Impact:** Mobile browsers are generally OK; old desktop browsers may fail

### No URL History / Bookmarking
- **Issue:** Navigation doesn't change URL
- **Reason:** Single-page app with view switching, no routing
- **Impact:** User cannot deep-link to specific page
- **Future:** Could add history API or client-side routing
- **Recommendation:** Not critical for mobile app

---

## Known Bugs & Edge Cases

### Bug: No Validation on JSON Import
- **Issue:** Invalid JSON or malformed data can be imported silently
- **Cause:** Lenient JSON parsing
- **Workaround:** Export known-good data and verify before import
- **Fix Effort:** Low (add schema validation)
- **Priority:** Low (advanced feature, mostly for backups)

### Edge Case: All Players Assigned to One Team (Sparring Mode)
- **Issue:** Cannot generate suggestions if one team has no players
- **Cause:** Algorithm cannot form 2v2 matches
- **Workaround:** User must add players to both teams
- **Validation:** Should be added to prevent this state
- **Priority:** Medium (prevent invalid state)

### Edge Case: Very Few Players (< 4)
- **Issue:** Cannot create matches with less than 4 players
- **Cause:** Matches are always 2v2 (4 players)
- **Validation:** Could disable match creation UI
- **Priority:** Low (user should see the error naturally)

### Edge Case: Deleted Player Referenced in Old Matches
- **Issue:** Match contains deleted player's name
- **Cause:** Matches store player names, not IDs; deletion doesn't cascade
- **Impact:** Payment calculation still works (based on name)
- **Resolution:** This is by design for audit trail; not a bug
- **Note:** Could add deleted player name to warning

### Edge Case: Orphaned Payments
- **Issue:** Payment record for player who no longer exists
- **Cause:** Player deleted but payment record persists
- **Impact:** Can still mark payment as collected; works fine
- **Resolution:** Could add cleanup in payment list

---

## Performance Concerns

### Match Suggestion Algorithm
- **Issue:** Generates up to 80 combinations, then stops
- **Limit:** 80 combinations for normal mode, limited by sparring mode teams
- **Problem:** If > ~50 players, could take noticeable time
- **Assumption:** Max 20-30 players per session (typical badminton group)
- **Solution:** Could add pagination or cancel button
- **Priority:** Low (not a current issue)

### Autocomplete Performance
- **Issue:** No debounce on input; updates on every keystroke
- **Problem:** Could be slow with 1000s of players
- **Assumption:** Max ~100 players in system
- **Solution:** Add debounce (e.g., 100ms) if becomes issue
- **Priority:** Very low

### localStorage Access Time
- **Issue:** Syncs all data to localStorage on every change
- **Problem:** With 1000+ matches, could be slow
- **Assumption:** Typical size is < 1 MB (well under 5MB limit)
- **Solution:** Could implement incremental saves or server sync
- **Priority:** Very low

---

## Accessibility Improvements (Nice to Have)

### Missing Features
- [ ] Keyboard shortcuts (e.g., Ctrl+P for players, Ctrl+S for schedule)
- [ ] Voice input for player names (mobile accessibility)
- [ ] High contrast mode (separate CSS)
- [ ] Font size adjustment (browser zoom is available)
- [ ] Screen reader optimized descriptions for suggestions

### Improvements to Make
- [ ] Add skip links for navigation
- [ ] Improve focus management in modals
- [ ] Add descriptions to icon-only buttons
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)

---

## Internationalization (i18n)

### Current State
- **Language:** Hardcoded Indonesian text in some places, English in most UI
- **Locales:** Only Indonesian (id-ID) for formatting

### Potential Work
- [ ] Extract hardcoded strings to translation file
- [ ] Support multiple languages (English, Indonesian, more)
- [ ] Implement i18n library (e.g., i18next)
- [ ] Allow user to select language

### Priority:** Low (primarily Indonesian user base)

---

## Testing & QA

### Test Coverage Status
- **Unit Tests:** None
- **Integration Tests:** None
- **E2E Tests:** None
- **Manual Testing:** Assumed (no evidence of QA process)

### Recommended Test Strategy
- [ ] Unit tests for algorithms (matchmaking, payment calculation)
- [ ] Integration tests for user workflows (add player → add match → settle payment)
- [ ] E2E tests for full session flow
- [ ] Browser compatibility testing

### Estimated Effort:** 1-2 weeks for comprehensive test suite

---

## Deployment & DevOps

### Current Deployment
- **Hosted on:** GitHub Pages (ivanelianto.github.io)
- **Process:** Manual push to repository
- **No CI/CD:** Builds automatically via GitHub Pages

### Potential Improvements
- [ ] Add GitHub Actions for automated testing
- [ ] Add pre-commit hooks for linting
- [ ] Add build step for minification/bundling
- [ ] Add staging environment for testing

---

## Feature Requests / Future Enhancements

### Low Priority
- [ ] Export to CSV (for Excel analysis)
- [ ] Statistics dashboard (player stats, trends over time)
- [ ] Undo/Redo functionality
- [ ] Drag-and-drop player reordering in match picker
- [ ] Photo/avatar for each player
- [ ] Player notes visibility in suggestions
- [ ] Dark/light theme auto-detect based on OS preference

### Medium Priority
- [ ] Multiple courts support (track which court each match used)
- [ ] Match score tracking (who won)
- [ ] Player ratings based on wins/losses
- [ ] Notification for payment collection (push/email)
- [ ] Calendar view of sessions
- [ ] Monthly/yearly reports

### High Priority (If Scaling)
- [ ] Backend server for cloud sync
- [ ] User authentication / accounts
- [ ] Multi-user support (real-time sync)
- [ ] Mobile app (React Native / Flutter)
- [ ] Payment integration (online payment processing)
- [ ] SMS/WhatsApp API for payment notifications

---

## Browser Support & Testing

### Tested Browsers
- **Chrome:** Assumed to work (primary development browser)
- **Firefox:** Assumed to work
- **Safari:** Assumed to work (iOS browsers required for PWA)
- **Edge:** Assumed to work

### Known Issues
- **IE11:** Not supported (no ES6 module support)
- **Older Safari:** Possible issue with service worker

### To Test
- [ ] Test on actual iOS device (Safari)
- [ ] Test on actual Android devices (Chrome, Firefox)
- [ ] Test on iPad (larger screen)
- [ ] Test offline mode (disable network, verify service worker)

---

## Data Migration Strategy

### If Migrating to Backend
- [ ] Design database schema (see DATA_STRUCTURE.md for recommendations)
- [ ] Create migration script (export localStorage → database)
- [ ] Implement API endpoints (CRUD for each resource)
- [ ] Update frontend to use API instead of localStorage
- [ ] Add user authentication
- [ ] Add data validation at backend

### If Migrating to Different Framework
- [ ] Preserve data structure (same field names, types)
- [ ] Preserve business logic (matchmaking algorithm, payment calculation)
- [ ] Preserve UI/UX (mobile-first, dark theme)
- [ ] Preserve offline capability (if not going server-only)

---

## Security Considerations

### Current State
- **No Authentication:** Anyone can edit all data
- **No Authorization:** No permission model
- **No Encryption:** Data stored in plaintext localStorage
- **No Audit Log:** Cannot track who changed what

### If Moving to Backend
- [ ] Implement user authentication (OAuth/JWT)
- [ ] Add role-based access control (organizer, player, admin)
- [ ] Add audit logging for all changes
- [ ] Encrypt sensitive data (payment info, bank details)
- [ ] Add HTTPS enforcement
- [ ] Regular security audits

---

## Code Quality

### Current State
- **Linting:** No linter configured
- **Formatting:** Manual (inconsistent)
- **Documentation:** This project!
- **Comments:** Minimal in code

### Improvements
- [ ] Add ESLint with standard rules
- [ ] Add Prettier for automatic formatting
- [ ] Add JSDoc comments for all functions
- [ ] Add TypeScript for type safety
- [ ] Reduce file sizes (consider splitting app.js)

### Effort:** 1 day of setup, ongoing minor improvements

---

## Monitoring & Analytics (Not Implemented)

### Could Add
- [ ] Google Analytics for usage tracking
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] User feedback form

### Priority:** Low for personal/small-group tool

---

## Documentation

### Current Status
- [x] PRD (Product Requirement Document)
- [x] FEATURES list
- [x] BUSINESS_RULES detailed
- [x] UI_SPEC with wireframes
- [x] DATA_STRUCTURE comprehensive
- [x] USER_FLOW workflows
- [ ] API documentation (not applicable for clientside-only)
- [ ] Developer setup guide
- [ ] Architecture diagrams
- [ ] Deployment guide

### To Complete
- [ ] Create DEVELOPER.md (setup, testing, deployment)
- [ ] Create ARCHITECTURE.md (system design)
- [ ] Create CONTRIBUTING.md (code standards)
- [ ] Create SUPPORT.md (troubleshooting, FAQ)

---

## Summary of Work by Priority

### Critical (Blocking Issues)
- None identified

### High (Should Do Soon)
- [ ] CSS refactoring to Bulma-only
- [ ] Add JSON validation on import
- [ ] Test on real mobile devices
- [ ] Handle edge case (< 4 players)

### Medium (Should Do Eventually)
- [ ] Add automated testing
- [ ] Improve accessibility
- [ ] Add ESLint/Prettier
- [ ] TypeScript migration
- [ ] i18n support

### Low (Nice to Have)
- [ ] Player statistics
- [ ] Calendar view
- [ ] Export to CSV
- [ ] Advanced reporting

---

## Tracking & Maintenance

### Version History
- **Current Version:** 1.0 (Initial release)
- **Last Updated:** 2024-06-12
- **Maintenance Status:** Active (assuming creator maintains)

### Suggested Maintenance Cadence
- **Weekly:** Monitor for critical issues
- **Monthly:** Review analytics, user feedback
- **Quarterly:** Feature planning, priority reassessment
- **Annually:** Major version planning, architecture review

---

## Notes for Future Developers

1. **Code is Functional but Not Optimized:** Focus is on features, not code elegance
2. **No Framework Used:** Pure vanilla JavaScript - good for learning, harder to scale
3. **localStorage Dependency:** Core assumption - changing this requires major refactoring
4. **Algorithm Complexity:** Match suggestion algorithm is the most complex part
5. **Mobile First:** Design philosophy - test on mobile always
6. **Offline First:** Service worker supports offline - important to maintain
7. **Single User:** App assumes single operator per device - not multi-user aware

---

## Conclusion

The application is **functionally complete** for its intended purpose (small group badminton session management). The main areas for improvement are:

1. **Code Quality:** Refactoring to Bulma-only CSS, adding tests
2. **Scalability:** If user base grows, consider backend + real-time sync
3. **Features:** Statistics, reporting, multi-user support are natural next steps
4. **Operations:** Monitoring, error tracking, support processes

**Recommendation:** Current version is suitable for personal/small group use. Before major scaling, implement authentication and backend sync.
