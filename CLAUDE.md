# Noor - High-Performance Nostr Web Client

# ═══════════════════════════════════════════════════════════════
# 🔒 CORE SYSTEM SPECIFICATIONS - NEVER MODIFY WITHOUT EXPLICIT USER REQUEST
# ═══════════════════════════════════════════════════════════════

## Project Overview & Mission

**Noor** (Arabic: نور, meaning "light") is a high-performance, enterprise-grade Nostr web client designed to combine the best performance patterns from existing clients while delivering superior UX, security, and global accessibility.

**Mission:** Create the fastest, most secure, and most user-friendly Nostr client on the web.

**Target Users:** Nostr power users, newcomers needing smooth onboarding, privacy-conscious users, global users behind VPNs/firewalls.

## Technical Architecture Overview

**Core Technology Stack:**
- **Framework:** Vanilla JavaScript (Zero framework overhead)
- **Build:** Vite + Rollup with aggressive optimization
- **Styling:** Modern CSS3 with CSS Variables
- **Bundle Target:** < 500KB gzipped (50% smaller than competitors)

**Performance Strategy:**
- **Multi-layer Caching:** Memory + IndexedDB + Service Worker
- **SimplePool Pattern:** Optimized relay connection management
- **Client-side Search:** FlexSearch for instant search
- **VPN Optimization:** Global accessibility and privacy focus

**Detailed Technical Documentation:**
- **Tech Stack Details:** See `context/tech-stack.md`
- **Performance Strategy:** See `context/performance.md`
- **Competitive Analysis:** See `context/competitors.md`

## Development Workflow & Standards

**Strict 5-Phase Development Process:**
1. **Code Implementation** - Clean, documented, TypeScript-compliant code
2. **Real-World Testing** - User browser testing across platforms
3. **User Approval Gate** - Explicit user approval required
4. **Commit Process** - Mandatory format with ✅ TESTED tags
5. **Research First** - Look up standards before implementation
6. **Commit Rules** - If the user says "Commit," then document your latest development status in the progress-blog.md . Always commit all the changes using the 'format git add . && git commit -m "[your commit message]"' in one line. And don’t forget: never add a Claude signature to the commit message!

**Quality Requirements:**
- **Bundle Size**: < 500KB gzipped
- **Performance**: 95+ Lighthouse score
- **Compatibility**: Modern browsers with progressive enhancement
- **Testing**: 90%+ code coverage

**Detailed Workflow Documentation:**
- **Complete Workflow:** See `context/workflow.md`
- **Git Standards:** See `context/workflow.md#git-workflow`
- **Testing Strategy:** See `context/workflow.md#testing`

## Security & Privacy Standards

**Client-Side Security Model:**
- **Zero Server Dependencies** - All processing client-side
- **No User Tracking** - Complete privacy by design
- **Browser Extension Integration** - nos2x, Alby, Flamingo support
- **VPN & Tor Optimization** - Global accessibility and privacy

**Detailed Security Documentation:**
- **Complete Security Model:** See `context/security.md`
- **Privacy Implementation:** See `context/security.md#privacy`
- **VPN Support:** See `context/security.md#vpn-tor`

## Application Architecture

**Modular Vanilla JS Architecture:**
- **Components**: UI components with Web Components
- **Services**: Business logic and Nostr protocol handling
- **Helpers**: Pure utility functions and formatters
- **State**: Universal state management without framework
- **Progressive Enhancement**: Works without JavaScript

**Detailed Architecture Documentation:**
- **Complete Architecture:** See `context/architecture.md`
- **Component System:** See `context/architecture.md#components`
- **State Management:** See `context/architecture.md#state`

## UI/UX Design System

**Performance-First Design:**
- **Mobile-First**: Touch-friendly responsive design
- **Accessibility**: WCAG 2.1 AA compliance
- **Dark Mode**: System preference with manual override
- **CSS Grid**: Modern layout with progressive enhancement

**Detailed UI Documentation:**
- **Complete Design System:** See `context/frontend-ui.md`
- **Component Library:** See `context/frontend-ui.md#components`
- **Theming System:** See `context/frontend-ui.md#theming`

## Deployment & Production

**Static Site Strategy:**
- **Hosting**: Netlify/Vercel with global CDN
- **Progressive Web App**: Service Worker for offline functionality
- **Performance Monitoring**: Core Web Vitals tracking
- **Zero Server Dependencies**: Complete client-side operation

**Detailed Deployment Documentation:**
- **Server Technology:** See `context/server-tech.md`
- **Deployment Strategy:** See `context/server-tech.md#deployment`
- **Performance Monitoring:** See `context/server-tech.md#monitoring`

---

# ═══════════════════════════════════════════════════════════════
# 📝 DEVELOPMENT NOTES - CLAUDE MAY EDIT FREELY
# ═══════════════════════════════════════════════════════════════

## Project Status & Development Progress

### ✅ **Planning Phase Completed (2025-09-20)**
- **Competitor Analysis**: Comprehensive analysis of 4 major Nostr clients (`context/competitors.md`)
- **Architecture Design**: Modular vanilla JS architecture defined (`context/architecture.md`)
- **Tech Stack**: Performance-optimized stack selected (`context/tech-stack.md`)
- **Workflow Standards**: Enterprise development process established (`context/workflow.md`)
- **Context System**: Modular documentation system created for maintainability

### 🎯 **Next Development Priorities**

#### Immediate (Next Session):
1. **Project Initialization**: package.json, Vite, TypeScript configuration
2. **Development Environment**: ESLint, Prettier, testing setup
3. **Basic Foundation**: HTML structure, core utilities, basic components
4. **Performance Framework**: Bundle monitoring, build optimization
5. **Relay Foundation**: SimplePool + DataLoader implementation

#### Development Phases:
- **Phase 1 (Weeks 1-4)**: Core infrastructure and basic timeline
- **Phase 2 (Weeks 5-8)**: Advanced features and optimization
- **Phase 3 (Weeks 9-12)**: Polish, testing, and deployment preparation

**Detailed roadmap available in individual context files.**

### 🔧 **Key Technical Insights**

**Performance Architecture:**
- **SimplePool + DataLoader**: Optimized relay management pattern from Jumble analysis
- **Multi-layer Caching**: Memory + IndexedDB + Service Worker strategy
- **Bundle Optimization**: Tree-shaking, code splitting, dynamic imports
- **Safari WebSocket Fix**: Connection pooling to prevent performance issues

**Competitive Advantages:**
- **Bundle Size**: Target <500KB vs competitors' 600-1200KB
- **Load Performance**: <2s vs competitors' 2-5s
- **Zero Framework Overhead**: Vanilla JS vs React/SolidJS
- **VPN Optimization**: Global accessibility focus

**Detailed technical specifications available in context files:**
- **Performance Strategy**: `context/performance.md`
- **Architecture Details**: `context/architecture.md`
- **Competitive Analysis**: `context/competitors.md`
- **Development Progress**: `context/progress-blog.md`

### 📝 **Development Standards**

**Quality Gates:**
1. Build success + TypeScript compliance
2. ESLint + testing requirements
3. Bundle size < 500KB enforcement
4. User testing and explicit approval

**Commit Standards:**
- Mandatory ✅ TESTED format with user approval quotes
- No Claude Code signatures in commits
- Explicit user approval required before any commits

**Complete workflow documentation in `context/workflow.md`**
**Session continuity tracking in `context/progress-blog.md`**

---

## Current Session Action Items

### ✅ **Completed (2025-09-20):**
1. **Competitor Analysis**: Comprehensive research of 4 major Nostr clients
2. **Project Structure**: Created `/Users/jev/projects/noor` with modular architecture
3. **Context System**: Modular documentation system for maintainability
   - `context/competitors.md` - Competitive analysis and benchmarks
   - `context/tech-stack.md` - Technology decisions and rationale
   - `context/performance.md` - Performance optimization strategies
   - `context/security.md` - Security and privacy implementation
   - `context/architecture.md` - Software architecture patterns
   - `context/frontend-ui.md` - UI/UX design system
   - `context/server-tech.md` - Deployment and hosting strategy
   - `context/workflow.md` - Development workflow and standards
4. **CLAUDE.md Optimization**: Streamlined main documentation with context references

### 🎯 **Next Session Goals:**
1. **Development Environment Setup**: package.json, Vite, TypeScript, ESLint configuration
2. **Performance Framework**: Bundle monitoring, size limits, build optimization
3. **Core Foundation**: HTML structure, basic components, state management skeleton
4. **Relay Foundation**: SimplePool + DataLoader pattern implementation
5. **Testing Setup**: Vitest, Playwright, accessibility testing framework

### 📋 **Technical Preparation Complete:**
- **Architecture**: Vanilla JS modular architecture defined
- **Performance Targets**: <500KB bundle, <2s load time established
- **Development Process**: Strict 5-phase workflow with user approval gates
- **Technology Stack**: Optimized for performance and maintainability

---

*Project Status: Planning complete - Ready for development implementation*
*Next: Initialize development environment and begin core infrastructure*