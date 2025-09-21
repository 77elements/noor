# Noornote - High-Performance Nostr Web Client

# ═══════════════════════════════════════════════════════════════
# 🔒 CORE SYSTEM SPECIFICATIONS - NEVER MODIFY WITHOUT EXPLICIT USER REQUEST
# ═══════════════════════════════════════════════════════════════

## Project Overview & Mission

**Noornote** (Arabic: نور, meaning "light") is a high-performance, enterprise-grade Nostr web client designed to combine the best performance patterns from existing clients while delivering superior UX, security, and global accessibility.

**Mission:** Create the fastest, most secure, and most user-friendly Nostr client on the web.

**Target Users:** Nostr power users, newcomers needing smooth onboarding, privacy-conscious users, global users behind VPNs/firewalls.

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

### Project Repository

**GitHub Repository:** https://github.com/77elements/noornote
**License:** MIT License (chosen for maximum adoption and Nostr ecosystem compatibility)
**Development Server:** http://localhost:3000/ (Vite dev server)

### Screenshot Workflow
- **Default Reference**: `screenshots/screenshot.png` - current app state
- **User Commands**: "siehe Screenshot" = `screenshots/screenshot.png`

### Devblog

At the end of every session, we add a daily entry into the devblog/ about our progress. It's organized in monthly md-Files. Keep those entry short and on-point.

### Security & Privacy Standards

**Client-Side Security Model:**
- **Zero Server Dependencies** - All processing client-side
- **No User Tracking** - Complete privacy by design
- **Browser Extension Integration** - nos2x, Alby, Flamingo support
- **VPN & Tor Optimization** - Global accessibility and privacy

**Detailed Security Documentation:**
- **Complete Security Model:** See `context/security.md`
- **Privacy Implementation:** See `context/security.md#privacy`
- **VPN Support:** See `context/security.md#vpn-tor`

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

#### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Environment                       │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │   UI Layer    │  │  State Layer  │  │  Service Layer  │  │
│  │               │  │               │  │                 │  │
│  │ - Components  │  │ - Stores      │  │ - Nostr Client  │  │
│  │ - Views       │←→│ - Actions     │←→│ - Relay Manager │  │
│  │ - Events      │  │ - Selectors   │  │ - Cache Manager │  │
│  └───────────────┘  └───────────────┘  └─────────────────┘  │
│           ↑                   ↑                    ↓        │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ Helper Layer  │  │  Types Layer  │  │ External APIs   │  │
│  │               │  │               │  │                 │  │
│  │ - Utilities   │  │ - Interfaces  │  │ - Nostr Relays  │  │
│  │ - Formatters  │  │ - Models      │  │ - Media APIs    │  │
│  │ - Validators  │  │ - Enums       │  │ - Extension APIs│  │
│  └───────────────┘  └───────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Layer Architecture

##### 1. UI Layer (Presentation)
```
src/components/
├── common/           # Reusable UI components
│   ├── Button.js
│   ├── Modal.js
│   ├── Input.js
│   └── LoadingSpinner.js
├── timeline/         # Timeline-specific components
│   ├── TimelineView.js
│   ├── TimelineItem.js
│   └── TimelineFilters.js
├── compose/          # Note composition
│   ├── ComposeView.js
│   ├── ComposeEditor.js
│   └── ComposeActions.js
├── profile/          # User profile components
│   ├── ProfileView.js
│   ├── ProfileHeader.js
│   └── ProfilePosts.js
└── settings/         # Application settings
    ├── SettingsView.js
    ├── RelaySettings.js
    └── PrivacySettings.js
```

##### 2. State Layer (Data Management)
```
src/state/
├── stores/           # Individual state stores
│   ├── TimelineStore.js
│   ├── ProfileStore.js
│   ├── RelayStore.js
│   └── SettingsStore.js
├── actions/          # State modification actions
│   ├── TimelineActions.js
│   ├── ProfileActions.js
│   └── RelayActions.js
├── selectors/        # State selection helpers
│   ├── TimelineSelectors.js
│   └── ProfileSelectors.js
└── StateManager.js   # Core state management
```

##### 3. Service Layer (Business Logic)
```
src/services/
├── nostr/            # Nostr protocol handling
│   ├── NostrClient.js
│   ├── EventValidator.js
│   └── KeyManager.js
├── relay/            # Relay communication
│   ├── RelayManager.js
│   ├── RelayPool.js
│   └── RelayMonitor.js
├── cache/            # Caching strategies
│   ├── CacheManager.js
│   ├── IndexedDBCache.js
│   └── MemoryCache.js
└── search/           # Search functionality
    ├── SearchService.js
    ├── SearchIndex.js
    └── SearchFilters.js
```

##### 4. Helper Layer (Utilities)
```
src/helpers/
├── validation/       # Input validation
├── formatting/       # Content formatting
├── crypto/           # Cryptographic utilities
├── performance/      # Performance monitoring
└── browser/          # Browser API wrappers
```

### UI/UX Design System

**Performance-First Design:**
- **Mobile-First**: Touch-friendly responsive design
- **Accessibility**: WCAG 2.1 AA compliance
- **Dark Mode**: System preference with manual override
- **CSS Grid**: Modern layout with progressive enhancement

#### Performance-First Design
**Every UI decision optimized for speed and efficiency**
- **Minimal DOM**: Reduce element count for faster rendering
- **CSS-only Animations**: No JavaScript animation libraries
- **Lazy Loading**: Load UI components only when needed
- **Virtual Scrolling**: Handle large timelines efficiently
- **Critical Path**: Inline critical CSS, defer non-essential styles

#### Accessibility-First Approach
**WCAG 2.1 AA compliance as minimum standard**
- **Semantic HTML**: Proper element structure for screen readers
- **Keyboard Navigation**: Full functionality without mouse
- **Focus Management**: Visible focus indicators and logical tab order
- **Color Contrast**: 4.5:1 minimum for normal text, 3:1 for large text
- **Motion Preferences**: Respect prefers-reduced-motion

#### Mobile-First Responsive Design
**Progressive enhancement from mobile to desktop**
- **Touch-Friendly**: 44px minimum touch targets
- **Thumb Navigation**: Critical actions within thumb reach
- **One-Handed Use**: Primary functions accessible with one hand
- **Network Awareness**: Graceful degradation on slow connections

### Deployment & Production

**Static Site Strategy:**
- **Hosting**: Netlify/Vercel with global CDN
- **Progressive Web App**: Service Worker for offline functionality
- **Performance Monitoring**: Core Web Vitals tracking
- **Zero Server Dependencies**: Complete client-side operation

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
**Next Priority:** Address remaining profile loading cache issues