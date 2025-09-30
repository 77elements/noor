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

###  🎯 Modularität: NPM-PACKAGE-READY Kriterien

  Jeder Helper muss haben:
  - ✅ Eine einzige Funktion (Single Responsibility)
  - ✅ Keine Seiteneffekte (Pure Function, außer explizit wie cacheSet)
  - ✅ Klare TypeScript-Interfaces für Input/Output
  - ✅ JSDoc-Dokumentation mit Beispielen
  - ✅ Keine lokalen Imports (nur externe libs wie nostr-tools)
  - ✅ Export als named export (nicht default)

#### 📦 NPM-READY HELPER (29) - src/helpers/

**Nostr (3):** npubToHex, hexToNpub, shortenPubkey
**Cache (4):** cacheGet, cacheSet, isCacheValid, cleanOldCacheEntries
**Storage (1):** getStorageSize
**Fallback (2):** generateFallbackAvatar, generateFallbackUsername
**Profile (1):** extractDisplayName
**Extract (5):** extractHashtags, extractNpubMentions, extractLinks, extractQuotedReferences, extractMedia
**Format (7):** escapeHtml, linkifyUrls, convertLineBreaks, formatHashtags, formatQuotedReferences, formatMentions, formatContent
**Time (3):** formatTimestamp, formatTimeAgo, getRelativeTime
**Render (3):** renderMediaContent, renderQuotedReferencesPlaceholder, renderNoteContent


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
