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

---

# ═══════════════════════════════════════════════════════════════
# 📝 DEVELOPMENT NOTES - CLAUDE MAY EDIT FREELY
# ═══════════════════════════════════════════════════════════════

## 🚨 CRITICAL: USER IDENTITY DISPLAY RULES (2025-10-01)

**ABSOLUTE RULE - NO EXCEPTIONS:**

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

## 🚧 IN PROGRESS: Single Note View (SNV) - Started 2025-10-02

**Feature Specification:**

**Route & Navigation:**
- URL format: `/note/nevent1qqszhj9dhg7fp3kra5hvqljwud0s6rnl54ektfdg7a6lp2ez7pn9hsgqwtc2l`
- Click handler: Click on note body (excluding links, images, videos, quoted notes, buttons) → navigate to SNV
- Loads in `main.primary-content` (same container as Timeline View)

**Display Requirements:**
1. **Full Note Display**: Always show complete note content, NO "Show More" button/truncation
2. **Note Header**: Identical to Timeline View (must be componentized - shared between TV and SNV)
3. **Interaction Status Line (ISZ)**: Below note content, shows:
   - Likes count
   - Reposts count
   - Quoted Reposts count
   - Zaps count
   - Analytics
4. **Reply List**: Below ISZ, displays all replies to this note

**Technical Questions to Answer:**
1. Router system: Exists or build new?
2. nevent decoding: Use `nip19.decode()` from nostr-tools (contains note ID + relay hints)
3. ISZ data fetching: Which relay queries needed? (kind 7 for likes, kind 6 for reposts, kind 9735 for zaps)
4. Reply depth: Direct replies only or full thread tree?
5. Back navigation: Browser history or dedicated back button?

**Implementation Steps:**
- [ ] Step 1: Setup router system (if needed)
- [ ] Step 2: Componentize note header (extract from Timeline, make reusable)
- [ ] Step 3: Create SingleNoteView component (basic note display)
- [ ] Step 4: Implement ISZ component (interaction stats)
- [ ] Step 5: Implement reply fetching and rendering
- [ ] Step 6: Add click handlers to timeline notes
- [ ] Step 7: Test & polish

**Current Status:** Planning phase

## ✅ FIXED: Repost Username Display (2025-10-01)

**Problem:** Repost headers showed hex pubkeys instead of usernames (e.g. "e0921d610ee655396... reposted")

**Root Cause:**
- `npubToUsername()` called `UserProfileService.getUsername(hexPubkey)`
- When no profile in cache, returned `generateFallbackUsername(hexPubkey)` = hex pubkey itself
- Check `!cachedUsername.includes('...')` was wrong - hex has no '...', so it passed through

**Solution:**
1. Fixed fallback detection: `cachedUsername !== hexPubkey` (not contains '...')
2. Refactored `npubToUsername()` to support dual modes via function overloading:
   - Simple mode: `npubToUsername(npub)` → returns username string
   - Legacy HTML mode: `npubToUsername(html, profileResolver)` → processes HTML text
3. Added async profile fetching in simple mode (fire and forget)
4. Subscribe to profile updates in `createRepostElement()` to refresh DOM when profile loads

**Progressive Enhancement Flow:**
1. Display npub as initial fallback (not hex!)
2. Trigger `getUserProfile()` async
3. Subscribe to profile updates
4. Update DOM when profile arrives: npub → username

**Files Changed:**
- src/helpers/npubToUsername.ts - function overloading + async fetch trigger
- src/components/ui/NoteUI.ts - profile subscription for repost header
- src/helpers/shortenPubkey.ts - DELETED
- src/helpers/generateFallbackUsername.ts - removed shortening
- src/helpers/shortenNpub.ts - removed shortening

**Result:** Reposts now show "@username reposted" with progressive enhancement (npub → username).
