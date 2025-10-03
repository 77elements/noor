# Noornote - High-Performance Nostr Web Client

# ═══════════════════════════════════════════════════════════════
# 📖 ABBREVIATIONS
# ═══════════════════════════════════════════════════════════════

- **TV** - Timeline View
- **SNV** - Single Note View
- **ISL** - Interaction Status Line (Likes, Reposts, Zaps, Analytics)
- **CSM** - Central State Management

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
- User starts server with 'npm run dev' in another terminal window and opens browser to localhost:3000 and thoroughly examines the feature
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

###  🎯 Modularität: NPM-PACKAGE-READY Kriterien

  Jeder Helper muss haben:
  - ✅ Eine einzige Funktion (Single Responsibility)
  - ✅ Keine Seiteneffekte (Pure Function, außer explizit wie cacheSet)
  - ✅ Klare TypeScript-Interfaces für Input/Output
  - ✅ JSDoc-Dokumentation mit Beispielen
  - ✅ Keine lokalen Imports (nur externe libs wie nostr-tools)
  - ✅ Export als named export (nicht default)

#### 📦 NPM-READY HELPER (33) - src/helpers/

**Nostr (4):** npubToHex, hexToNpub, shortenNpub, npubToUsername (3 modes: simple string, html-single, html-multi)
**Cache (4):** cacheGet, cacheSet, isCacheValid, cleanOldCacheEntries
**Storage (1):** getStorageSize
**Fallback (2):** generateFallbackAvatar, generateFallbackUsername
**Profile (2):** extractDisplayName, getProfilePicture
**Extract (4):** extractHashtags, extractLinks, extractQuotedReferences, extractMedia
**Format (5):** escapeHtml, linkifyUrls, convertLineBreaks, formatHashtags, formatQuotedReferences
**Time (3):** formatTimestamp, formatTimeAgo, getRelativeTime
**Render (3):** renderMediaContent, renderQuotedReferencesPlaceholder, renderNoteContent
**Skeleton (3):** createMediaSkeleton, createNoteSkeleton, createProfileSkeleton
**Fetch (2):** fetchNostrEvents, subscribeNostrEvents

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

### Screenshot and Console Log Workflow
- **Default Reference**: `screenshots/screenshot.png` - current app state
- **User Commands**: "siehe Screenshot" = `screenshots/screenshot.png`
- **Console Logs**: If you need an actual console log, tell the User so. He will then save it unter console.log for you to examine.

### Coding Principles

- No TODOs in the code. Address TODOs immediately, don't leave them as TODO comments in the code.
- Never use deprecated SASS functions like darken or lighten (use color.adjust instead in this case).

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

## 🏗️ ORCHESTRATOR ARCHITECTURE

**Based on Gossip pattern (code.png/code1.png). All Nostr events flow:**
```
Components → Orchestrators → Router → Transport → Relays
```

**Absolute Rules:**
- ❌ Components NEVER call SimplePool directly
- ❌ NEVER import SimplePool in any Component
- ✅ One subscription per type in Router, distributed to Orchestrators
- ✅ All Orchestrators extend `Orchestrator` base class (like Gossip)
- ✅ Before creating new Orchestrator: Ask user first

**File Structure:**
```
src/services/
├── EventBus.ts                      ← UI events (user:login, etc)
├── transport/NostrTransport.ts      ← SimplePool wrapper (ONLY place to use SimplePool)
└── orchestration/
    ├── Orchestrator.ts              ← Abstract base
    ├── OrchestrationsRouter.ts      ← Central hub
    ├── FeedOrchestrator.ts          ← Timeline feed (kind:1, kind:6)
    ├── ReactionsOrchestrator.ts     ← ISL stats (kind:7, kind:6, kind:9735)
    ├── ThreadOrchestrator.ts        ← SNV replies (kind:1 with #e tag)
    └── ProfileOrchestrator.ts       ← User profiles (kind:0)
```

**Existing Orchestrators (Use these first!):**
1. **FeedOrchestrator** - Timeline feed loading (initial, load more, polling)
   - Used by: TimelineUI
   - Methods: `loadInitialFeed()`, `loadMoreFeed()`, `startPolling()`

2. **ReactionsOrchestrator** - Interaction stats (reactions, reposts, zaps, replies)
   - Used by: InteractionStatusLine (wrapper: InteractionStatsService)
   - Methods: `getStats()`, `subscribeToStats()`

3. **ThreadOrchestrator** - Reply fetching for SNV
   - Used by: SingleNoteView
   - Methods: `fetchReplies()`, `clearCache()`

4. **ProfileOrchestrator** - User profile metadata
   - Used by: UserProfileService (wrapper)
   - Methods: `fetchProfile()`, `fetchMultipleProfiles()`

**Cache TTLs:**
- Notes (kind:1): Permanent (in FeedOrchestrator)
- Profiles (kind:0): 7 days (in UserProfileService, fetched via ProfileOrchestrator)
- Reactions (kind:7): 5min (in ReactionsOrchestrator)
- Replies (kind:1): 5min (in ThreadOrchestrator)

**Logging Philosophy:**
- **NostrTransport**: Silent (only errors)
- **Orchestrators**: Minimal, user-friendly (e.g., "🔔 3 new notes")
- **Wrapper Services**: Silent (delegated to Orchestrators)
- **Goal**: Clean system log for end users

**JSDoc Required:**
```typescript
/** @orchestrator Name | @purpose What | @used-by Who */
```

**Anti-Chaos Checklist (Before any Nostr feature):**
1. ✅ Which Orchestrator handles this? (Feed, Reactions, Thread, Profile)
2. ✅ Does it already exist? Check `src/services/orchestration/`
3. ✅ If yes: Use existing Orchestrator. If no: Ask user before creating new one
4. ✅ NEVER call SimplePool directly from Component
5. ✅ Use NostrTransport if you need relay communication

## ABSOLUTE RULE - NO EXCEPTIONS

1. **HEX pubkeys**: NEVER visible in Frontend UI - internal use only
2. **NPUB**: ONLY in URLs (e.g. `/profile/{npub}`) - NEVER displayed to user
3. **USERNAME**: The ONLY legitimate user representation in the UI

**Implementation:**
- ✅ Have username? → Display it
- ✅ No username? → Fetch profile OR show placeholder/loading state
- ❌ NEVER "shorten" hex/npub for display (e.g. "npub1abc...xyz")
- ❌ NEVER show raw technical IDs to users

**Why this rule exists:**
Claude repeatedly built "shortening" helpers (shortenPubkey, shortenNpub, etc.) WITHOUT being asked, then stumbled over them constantly. Hex and npub are TECHNICAL IDENTIFIERS, not user-facing data. The ONLY valid "shortened" representation of a user is their ACTUAL USERNAME.

**If you catch yourself:**
- Writing a `shorten*` helper
- Showing hex/npub in UI (outside URLs)
- Using `slice()` or `substring()` on pubkeys for display

→ **STOP. You're doing it wrong. Use usernames or fetch them.**

## Nostr projects to draw inspiration from:

- Jumble.social | Web Client | Github: https://github.com/CodyTseng/jumble
- Gossip | Desktop Client | Github: https://github.com/mikedilger/gossip

Whenever you (the AI agent) don't know how to implement something, it's worth looking at how they did it. When you browse the repositories, browse like a human would do: starting at the front page, clicking through. Otherwise, if you doo it your way, you'll run into multiple 404's.

## Chaos Mode

This refers to you. That you're in absolute chaos mode. This usually means:

- That you're only producing crap
- That you've forgotten too much (context, where we were, modularity or coding principles described in the context file CLAUDE.md)
- That you need 10 or more rounds to fix a simple bug
- That while debugging, you break other features because you're too narrow-minded and autistic in your approach.
- That you're guessing again instead of researching online using current examples, such as Jumble's GitHub repository, to see how it's done. 

This mode requires an immediate stop of development, a reset of the entire branch to the last state of a working commit (only the user does this! Never you), a complete restart of the feature, and a re-reading of the context file CLAUDE.md on your part.

Then we'll take 1-2 steps back from the whole thing and consider more architectural measures before tackling the feature again.

## 📋 TODO: Future Improvements

### Thread Context & Deep Quote Chains (Priority: Critical)
Nostr frequently has deep quote chains (6+ levels). Currently no thread awareness exists.

**Scenario to support:**
```
Iteration 0: Original Post (with media processing)
Iteration 1: Quote Repost of It.0 (with processing)
Iteration 2: Quote Repost of It.1 (with processing)
Iteration 3: Quote Repost of It.2 (with processing)
Iteration 4: Quote Repost of It.3 (with processing)
Iteration 5: Quote Repost of It.4 (with processing)
Iteration 6: Repost of It.5
```

**Requirements:**
- Every iteration must render correctly with full content processing
- Every iteration must be openable in SNV
- SNV at Iteration 3 should show:
  - Thread view: Iteration 2 (parent) and Iteration 4 (child)
  - "Show More" links for: 0, 1, 5, 6 (not in immediate context)
- ONE unified implementation for Timeline and SNV

**Architecture Solution:**
```typescript
ThreadContext {
  currentNoteId: string
  parentChain: Event[]      // [It.2, It.1, It.0] - reverse order
  childChain: Event[]       // [It.4, It.5, It.6]
  displayDepth: number      // how many parent/child to show
}
```

**SNV Flow:**
1. Fetch current note
2. Fetch parent (via 'q' or 'e' tags)
3. Fetch children (who quoted ME?)
4. Render: Parent (-1) → Current (0) → Child (+1)
5. "Show More" links for rest of chain

**Files to create/modify:**
- `src/services/ThreadContext.ts` - Thread navigation service
- Refactor NoteUI/SNV to share rendering logic
- Add parent/child fetching to SNV

---

### Event Bus System (Priority: High)
Currently using `window.location.reload()` after login to reinitialize Timeline with user data. This is a hack.

**Problem:**
- AuthComponent authenticates user → saves to localStorage → calls `window.location.reload()`
- Full page reload is inefficient and loses app state

**Solution:**
- Build Event Bus for app-wide communication
- Events: `user:login`, `user:logout`, `view:change`, etc.
- Components subscribe to events and react accordingly
- Timeline subscribes to `user:login` → creates itself with new pubkey
- No page reload needed

**Files to create:**
- `src/services/EventBus.ts` - Singleton event bus with pub/sub pattern
- Update AuthComponent to emit `user:login` event instead of reload
- Update App.ts to listen for `user:login` and recreate Timeline

---

### Long-form Content Support (NIP-23) (Priority: Medium)
Currently `naddr` references (addressable events) are ignored. These are used for long-form articles, blogs, live streams, etc.

**Test Case:**
```
nostr:naddr1qvzqqqr4gupzq9eemymaerqvwdc25f6ctyuvzx0zt3qld3zp5hf5cmfc2qlrzdh0qyv8wumn8ghj7enfd36x2u3wdehhxarj9emkjmn99uq36amnwvaz7tmfdejx27r9wghxxmmjv93kcefwwdhkx6tpdshsqvtfde68ymmyw43kjmn894kkzundda6z6argv5kkvat5w4ex2tt0vckhxetrw4ex2ttdv4ehxct8d9hxw09cvnl
```
(Found in Marmot article repost - "Introducing Marmot: The Future of Secure Messaging")

**Implementation:**
1. Decode naddr (extract kind, pubkey, d-tag)
2. Fetch addressable event with filter: `{ kinds: [kind], authors: [pubkey], "#d": [dtag] }`
3. Parse NIP-23 tags: `title`, `image`, `summary`, `published_at`
4. Render quote box with title + author (clickable)
5. Create Article View with markdown rendering (use `marked` library)
6. Style article typography (headers, images, code blocks, lists, etc.)

**Estimated Time:**
- Minimal (quote box + basic article view): 45-60 min
- Full-featured (like Jumble with proper styling): 2-3 hours

**Files to create:**
- `src/components/views/ArticleView.ts` - Long-form content display
- `src/helpers/renderArticleContent.ts` - NIP-23 markdown processor

---

# ═══════════════════════════════════════════════════════════════
# 📝 DEVELOPMENT NOTES - CLAUDE MAY EDIT FREELY
# ═══════════════════════════════════════════════════════════════

## Current Development Status

**Branch:** `orchestrator` (merged to main: pending)
**Last Migration:** Orchestrator Architecture (completed 2025-10-03)
**Architecture:** Components → Orchestrators → Router → Transport → Relays ✅

---

## Quick Reference: When to Use Which Orchestrator

| Feature Needed | Use This Orchestrator | Methods |
|---------------|----------------------|---------|
| Timeline feed loading | FeedOrchestrator | `loadInitialFeed()`, `loadMoreFeed()`, `startPolling()` |
| Like/Repost/Zap counts | ReactionsOrchestrator | `getStats()`, `subscribeToStats()` (via InteractionStatsService) |
| SNV replies | ThreadOrchestrator | `fetchReplies()`, `clearCache()` |
| User profile/avatar | ProfileOrchestrator | `fetchProfile()`, `fetchMultipleProfiles()` (via UserProfileService) |

**If your feature doesn't fit above:** Ask user before creating new Orchestrator!

---

## Common Pitfalls to Avoid

**❌ NEVER DO THIS:**
```typescript
import { SimplePool } from 'nostr-tools'; // ← WRONG! Only NostrTransport uses SimplePool
const pool = new SimplePool(); // ← WRONG!
```

**✅ DO THIS INSTEAD:**
```typescript
// In Component:
const orchestrator = FeedOrchestrator.getInstance();
const result = await orchestrator.loadInitialFeed({...});

// OR if you absolutely need relay fetch (rare):
const transport = NostrTransport.getInstance();
const events = await transport.fetch(relays, filters);
```

**❌ DON'T cache in Transport layer** → ✅ Cache in Orchestrator
**❌ DON'T log everything** → ✅ Log minimal, user-friendly messages (see "Logging Philosophy" in Core Specs)
**❌ DON'T break existing patterns** → ✅ Ask user if unsure

---

## When Starting New Feature

1. **Read:** "🏗️ ORCHESTRATOR ARCHITECTURE" in Core Specs section above
2. **Check:** Does Orchestrator for this exist? See table above
3. **Ask:** User before creating new Orchestrator or major architecture change
4. **Build:** `npm run build` MUST succeed before commit
5. **Test:** User tests, gives approval ("ok", "commit"), THEN commit

**Remember Chaos Mode trigger:** If you need 10+ rounds for simple bug, STOP. Re-read CLAUDE.md.