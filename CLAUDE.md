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

## Current Session Development Status (2025-09-23)

### ✅ **Infinite Scroll Performance Fix + Bundle Size Analysis (2025-09-23)**

**Performance Fix Completed:**
- **Problem**: 10-20+ second loading times in infinite scroll
- **Solution**: Non-blocking profile loading in NoteContentProcessing
- **Result**: Consistent 1-2 second loading times
- **User Feedback**: "Ok, jeder Nachladevorgang jetzt bei 1-2 Sekunden. Scheint was gebrahct zu haben"

**Bundle Size Growth Analysis:**
- **Previous**: ~60kB total bundle
- **Current**: 75.65kB main + 32.01kB vendor = 107.66kB total (33.44kB gzipped)
- **Growth**: +15kB for complete Rich Content System (25% size increase)

**Feature Density Justification:**
- ✅ Professional repost display like Jumble ("🔄 User reposted")
- ✅ Note-in-Note verschachtelung (5-level depth with NoteNesting)
- ✅ Media embeds (images, videos, YouTube thumbnails)
- ✅ Rich text formatting (links, mentions, hashtags)
- ✅ Performance-optimized profile caching
- ✅ Enterprise-level Atomic Design architecture

**Bundle Size Concerns:**
- **Current**: 20% of 500kB target after only 2-3 days development
- **Risk**: Many more features planned, bundle growth trajectory concerning
- **Need**: Performance and bundle size optimization strategy

**Next Session Priorities:**
1. **Bundle Analysis**: Identify optimization opportunities
2. **Tree Shaking**: Eliminate dead code and redundant imports
3. **Code Splitting**: Strategic lazy loading where possible
4. **CSS Optimization**: 31kB CSS chunk review
5. **Tech Stack Evaluation**: Consider VanillaJS → SPA framework migration
6. **Performance Strategy**: Sustainable growth for future features

**Tech Stack Migration Consideration:**
- **Current Challenge**: VanillaJS bundle growth (20% after 2-3 days)
- **SPA Framework Benefits**: Better tree shaking, optimized bundling, component reuse
- **Primary Candidate**: **Svelte** (compiles to VanillaJS, minimal runtime)
- **Alternative**: Preact (React-like, smaller than Vue)
- **Rejected**: Vue (bloated according to user preference)
- **Trade-offs**: Framework overhead vs. manual DOM manipulation bloat
- **Decision Point**: Evaluate if Svelte bundle + features < current trajectory

**Technical Debt Items:**
- Debug log cleanup completed (removed verbose processing logs)
- SASS deprecation warnings (lighten/darken functions) - cosmetic only
- Bundle growth monitoring needed for future development

### ✅ **Infinite Scroll Architecture Refactor + Debug Cleanup (2025-09-23)**

**Problem Solved:**
- **Issue**: Infinite scroll stopped after 2 triggers due to poor architecture and hasMore logic
- **Root Cause 1**: Spaghetti code in TimelineUI.ts with IntersectionObserver logic mixed with UI
- **Root Cause 2**: LoadMore service stopped at <20 events, ignoring sparse timelines (night, few followings)

**Architecture Refactor:**
- **Created InfiniteScroll.ts**: Dedicated component for intersection observation
  - Single responsibility: Detect scroll position and emit events
  - Configurable debouncing (300ms default), rootMargin (50px), threshold
  - Clean API: `observe()`, `disconnect()`, `pause()`, `resume()`
- **Cleaned TimelineUI.ts**: Removed intersection observer spaghetti
  - Now only coordinates: InfiniteScroll + LoadMore + UI rendering
  - Proper separation of concerns, modular design

**Infinite Scroll Logic Fix:**
- **timeWindowHours**: Increased from 1h to 3h (more events per fetch)
- **hasMore Logic**: Changed from `events.length >= 20` to `hasMore = true`
- **Never Give Up Philosophy**: Always continue loading backward through Nostr history
- **Sparse Timeline Support**: Works with 1 note per night, few followings

**Debug Log Cleanup:**
- Removed all verbose intersection observer logs
- Removed reply filtering debug messages
- Removed note processing debug messages
- Clean console output for production use

**Bundle Impact:**
- Bundle size: 75.68kB (minimal increase for InfiniteScroll component)
- Architecture: Enterprise-level modular design
- Performance: Debounced scroll detection, efficient API usage

**User Testing Results:**
- ✅ Infinite scroll now works continuously without stopping
- ✅ Handles sparse timelines (1 note scenarios)
- ✅ Clean console output without debug spam
- ✅ Proper modular architecture following "each component solves one problem"

**Technical Excellence:**
- InfiniteScroll component is reusable for any list/timeline
- TimelineUI.ts is now a clean aggregator as intended
- LoadMore service focused purely on API strategy
- Never-give-up mentality perfect for Nostr's distributed nature

