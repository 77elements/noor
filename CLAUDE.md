# Noornote - High-Performance Nostr Web Client

# ═══════════════════════════════════════════════════════════════
# 🔒 CORE SYSTEM SPECIFICATIONS - NEVER MODIFY WITHOUT EXPLICIT USER REQUEST
# ═══════════════════════════════════════════════════════════════

## ⛔ STRICT DEVELOPMENT PROCESS - NEVER DEVIATE!

### General Philosophy
Treat and implement this app at an enterprise level, like an experienced senior developer would. No dirty hacks, no half-baked "quick fixes." Always pay attention to architecture with strong modularity and proper encapsulation of functionality. Do not suddenly introduce major changes to core mechanisms (such as caching). You are not just coding the current feature, you are working on a small part of an app that will grow to be very large and complex later on (for example, with an addon or extension system and multiple extensions that could fundamentally change the app's purpose). Write code that is modular, resource-efficient, and maintainable.

So, whenever you implement a function, ask yourself first: "Could this function also be useful in another component?" and "where is the right place for this function to meet modularization and encapsulation standards?".
If you are not sure, ask the user. If you do not get an answer, it is better to assume yes than no. The idea is to avoid cramming everything messily in one place instead of keeping things modular.

### Step 1: Claude Codes (Build-Ready)
- Implement feature with modular architecture and foresight
- Code must be clean, documented, and following all established patterns
- Always run `npm run build` - MUST succeed without errors
- TypeScript compilation MUST pass with zero errors

### Step 2: User Tests (Real-World Validation)
- User opens browser to localhost:3000 and thoroughly examines the feature
- User tests all functionality, edge cases, and interactions
- User provides explicit feedback on feature quality and completeness

### Step 3: User Approval (Commit Gate)
- **ONLY** when user explicitly says "feature is ok" or "commit" or similar approval
- **THEN AND ONLY THEN** may Claude create a commit
- **NO COMMITS WITHOUT EXPLICIT USER APPROVAL - EVER!**

### Step 4: Git Workflow
- Use mandatory commit format with ✅ TESTED tags
- Document what user tested and approved
- Reference user's exact approval words in commit message
- **NEVER INSERT CLAUDE CODE SIGNATURE INTO COMMIT MESSAGES!**
- If the user says "Commit," then document your latest development status in CLAUDE.md at the very bottom under "# 📝 DEVELOPMENT NOTES - CLAUDE MAY EDIT FREELY." Always commit all the changes using the format `git add . && git commit -m "[your commit message]"` in one line. And don't forget: never add a Claude signature to the commit message!

### Step 5: Research Before Guessing
- If you are not sure about something, feel free to look it up online
- I'd much rather you research first instead of guessing for hours and still not getting to the point

## Technical Notes

**Core Technology Stack:**
- **Framework:** Vanilla JavaScript (No SPA frameworks) + SimplePool + nostr-tools libraries. Use these libs whenever possible for performance purposes
- **Build:** Vite + Rollup with aggressive optimization
- **Styling:** Modern CSS3 with SASS and CSS Variables
- **Bundle Target:** < 500KB gzipped (50% smaller than competitors)

**Performance Strategy:**
- **Multi-layer Caching:** Memory + IndexedDB + Service Worker
- **SimplePool Pattern:** Optimized relay connection management
- **Client-side Search:** FlexSearch for instant search

### Screenshot Workflow
- **Default Reference**: `screenshots/screenshot.png` - current app state
- **User Commands**: "siehe Screenshot" = `screenshots/screenshot.png`

### Application Architecture

**Modular Vanilla JS Architecture:**
- **Components**: UI components with Web Components
- **Services**: Business logic and Nostr protocol handling
- **Helpers**: Pure utility functions and formatters
- **State**: Universal state management without framework
- **Progressive Enhancement**: Works without JavaScript

#### Core Architecture Principles

**🔥 CRITICAL PRINCIPLE: App.ts Stays Minimal**
- **App.ts is ONLY a coordination layer**: Glues components together, nothing more
- **All business logic belongs in components**: Each component manages its own state and behavior
- **No UI logic in App.ts**: Components handle their own rendering and user interactions
- **Example**: Authentication logic belongs in AuthComponent, not App.ts or MainLayout.ts

### UI/UX Design System

**Performance-First Design:**
- **Mobile-First**: Touch-friendly responsive design
- **Accessibility**: WCAG 2.1 AA compliance
- **Dark Mode**: System preference with manual override
- **CSS Grid**: Modern layout with progressive enhancement

---

# ═══════════════════════════════════════════════════════════════
# 📝 DEVELOPMENT NOTES - CLAUDE MAY EDIT FREELY
# ═══════════════════════════════════════════════════════════════

 Based on my analysis of your codebase, here are my modularization suggestions:

  🎯 Major Modularization Opportunities

  1. HTML Rendering Utilities (High Priority)

  - Problem: NoteUI.ts (lines 212-285) has HTML string building logic mixed with component logic
  - Solution: Extract to /src/helpers/htmlHelpers.ts or /src/helpers/renderHelpers.ts
    - renderMediaContent() → reusable media renderer
    - renderLinks() → reusable link renderer
    - renderQuotedReferences() → reusable quote renderer
  - Why: These are pure functions that could be useful in other components (comments, profiles, DMs, etc.)

  2. Content Formatting Utilities (High Priority)

  - Problem: NoteContentProcessing.ts (lines 427-484) has formatting logic buried in the class
  - Solution: Extract to /src/helpers/contentFormatters.ts
    - escapeHtml()
    - linkifyUrls()
    - formatMentions()
    - formatHashtags()
  - Why: Universal text formatting needed across the app (search, comments, profiles)

  3. Content Extraction Utilities (Medium Priority)

  - Problem: NoteContentProcessing.ts (lines 281-408) has extraction logic as private methods
  - Solution: Extract to /src/helpers/contentExtractors.ts
    - extractMedia()
    - extractLinks()
    - extractQuotedReferences()
    - extractMentions()
    - extractHashtags()
  - Why: Useful for search indexing, content analysis, notifications system

  4. Relay URL Utilities (Low Priority)

  - Problem: EventFetchService.ts:191 has shortenRelay() as private method
  - Solution: Extract to /src/helpers/relayHelpers.ts
    - shortenRelayUrl()
    - parseRelayUrl()
    - formatRelayStatus()
  - Why: Relay formatting needed in UI, logs, relay management screens

  5. Event Type Utilities (Medium Priority)

  - Problem: Reply filtering logic in TimelineLoader.ts:96-114 is tightly coupled
  - Solution: Extract to /src/helpers/eventHelpers.ts
    - isReply(event)
    - isQuote(event)
    - isRepost(event)
    - getEventType(event)
  - Why: Event classification needed in filters, search, notifications, thread views

  6. Profile Cache Management (Medium Priority)

  - Problem: NoteContentProcessing.ts has profile cache (line 89, 489-520) mixed with content processing
  - Solution: Extract to dedicated /src/services/ProfileCacheService.ts
    - Handles caching strategy
    - Background loading
    - Cache invalidation
  - Why: Profile caching should be universal, not tied to content processing

  7. Timeline State Management (Low Priority - Architectural)

  - Problem: TimelineUI.ts manages its own state (events array, loading flags, pagination)
  - Solution: Consider extracting to /src/state/TimelineState.ts
  - Why: As the app grows, you'll want centralized state management (especially for real-time updates)

  ---
  📊 Priority Ranking

  Immediate (Next Refactor):
  1. HTML Rendering Utilities
  2. Content Formatting Utilities

  Near-term (Before adding new features):
  3. Content Extraction Utilities
  4. Event Type Utilities
  5. Profile Cache Service

  Long-term (When complexity grows):
  6. Relay URL Utilities
  7. Timeline State Management

---

## Session: 2025-09-30 - Link Duplication Fix & NoteUI Refactoring

### Changes Implemented:

1. **Fixed Media URL Duplication**
   - Problem: Image/Video URLs appeared twice (in text + below media)
   - Solution: Modified `NoteContentProcessing.processContent()` to remove media URLs from cleanedText
   - Also removes quoted references from text to prevent duplication

2. **Fixed Link Duplication**
   - Problem: Normal hyperlinks appeared twice (full URL + shortened domain)
   - Solution: Removed `renderLinks()` calls from rendering flow
   - Links now only appear as clickable hyperlinks in content text
   - Removed from: `renderNoteContent()` in htmlRenderers.ts, `createQuoteElement()` and `createOriginalNoteElement()` in NoteUI.ts

3. **Major Refactoring: NoteUI Code Deduplication**
   - Problem: `createQuoteElement()` and `createOriginalNoteElement()` had ~60 lines of duplicated code
   - Solution: Created central `buildNoteStructure()` helper method
   - Eliminates duplication for:
     - NoteHeader creation
     - Long content checking
     - HTML structure assembly
     - Header mounting logic
   - Reduced both methods from ~50 lines to ~13 lines each
   - Benefits: Single source of truth, easier maintenance, fewer bugs

### Files Modified:
- `src/components/content/NoteContentProcessing.ts` - Remove media URLs from text
- `src/helpers/htmlRenderers.ts` - Remove renderLinks() from renderNoteContent()
- `src/components/ui/NoteUI.ts` - Add buildNoteStructure(), refactor createQuoteElement/createOriginalNoteElement

### User Testing:
- Build successful, TypeScript compilation passed
- Link duplication resolved (no more double links)
- Media URL duplication resolved (URLs only below media, not in text)
- Code is cleaner with no dead code (renderLinks() still exists but unused)