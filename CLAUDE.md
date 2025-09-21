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

### Step 4: Commit (After Approval Only)
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

## Current Session Development Status (2025-09-21)

### ✅ **SimplePool + nostr-tools Integration Complete (2025-09-21)**

**Major Architecture Fix:**
- **Problem**: Was using custom WebSocket implementation instead of documented SimplePool
- **Solution**: Complete rewrite of NostrClient using SimplePool from nostr-tools
- **Impact**: Timeline loads significantly faster, proper profile loading architecture

**Technical Changes:**
- **NostrClient.ts**: Completely rewritten with SimplePool and nostr-tools types
- **TimelineComponent.ts**: Updated method calls (connectToRelays, getUserFollowing)
- **Cleanup**: Removed old WebSocket directories (/relay, /nostr)
- **Bundle**: Now properly includes 32KB nostr-tools vendor chunk

**Current Status:**
- ✅ Timeline loads much faster with SimplePool
- ✅ Most profile pictures load correctly (~80%+ success rate)
- ⚠️ Some profiles still show DiceBear fallbacks despite having real images
- ⚠️ Profile cache issues remain unresolved

**User Feedback:** "Timeline loads much faster, most profile pictures work"

### ✅ **Infinite Scroll Implementation Fixed (2025-09-21)**

**Major Bug Fix:**
- **Problem**: Infinite scroll was fetching events but not displaying them in UI
- **Root Cause**: Two issues found through comprehensive debugging:
  1. NostrClient used 'since' parameter instead of 'until' for fetching older events
  2. renderEvents() limited display to only 40 events despite loading 109 events
- **Solution**: Fixed Nostr protocol compliance and removed display limitations

**Technical Changes:**
- **NostrClient.ts**: Changed fetchTimelineEvents parameter from 'since' to 'until' for proper pagination
- **TimelineComponent.ts**: Fixed loadMoreEvents() timestamp logic (until = oldestEvent.created_at)
- **TimelineComponent.ts**: Removed renderEvents() slice limit that prevented new events from showing
- **Debug logging**: Added comprehensive infinite scroll diagnostics

**Performance Results:**
- ✅ Infinite scroll works very fast and smoothly
- ✅ Events load properly when scrolling to bottom
- ✅ Correct Nostr protocol compliance with 'until' parameter
- ✅ All loaded events now display in timeline

**User Feedback:** "Sehr gut, funktioniert sehr schnell. Commit."
**Next Priority:** Clean up debug logs and continue with next features