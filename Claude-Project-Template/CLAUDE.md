# [PROJECT NAME] - [PROJECT DESCRIPTION]

# ═══════════════════════════════════════════════════════════════
# 🔒 CORE SYSTEM SPECIFICATIONS - NEVER MODIFY WITHOUT EXPLICIT USER REQUEST
# ═══════════════════════════════════════════════════════════════

## Project Overview & Mission

**[PROJECT NAME]** is [project description and purpose].

**Mission:** [Project mission statement]

**Target Users:** [Target user descriptions]

## Technical Architecture Overview

**Core Technology Stack:**
- **Framework:** [Framework choice and rationale]
- **Build:** [Build system and tools]
- **Styling:** [Styling approach]
- **Bundle Target:** [Performance targets]

**Performance Strategy:**
- **[Strategy 1]:** [Description]
- **[Strategy 2]:** [Description]
- **[Strategy 3]:** [Description]
- **[Strategy 4]:** [Description]

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
- **Bundle Size**: [Size requirements]
- **Performance**: [Performance targets]
- **Compatibility**: [Browser support requirements]
- **Testing**: [Test coverage requirements]

**Detailed Workflow Documentation:**
- **Complete Workflow:** See `context/workflow.md`
- **Git Standards:** See `context/workflow.md#git-workflow`
- **Testing Strategy:** See `context/workflow.md#testing`

## Security & Privacy Standards

**Security Model:**
- **[Security Requirement 1]** - [Description]
- **[Security Requirement 2]** - [Description]
- **[Security Requirement 3]** - [Description]
- **[Security Requirement 4]** - [Description]

**Detailed Security Documentation:**
- **Complete Security Model:** See `context/security.md`
- **Privacy Implementation:** See `context/security.md#privacy`
- **VPN Support:** See `context/security.md#vpn-tor`

## Application Architecture

**Architecture Pattern:**
- **Components**: [Component architecture]
- **Services**: [Service layer description]
- **Helpers**: [Utility layer description]
- **State**: [State management approach]
- **Progressive Enhancement**: [Enhancement strategy]

**Detailed Architecture Documentation:**
- **Complete Architecture:** See `context/architecture.md`
- **Component System:** See `context/architecture.md#components`
- **State Management:** See `context/architecture.md#state`

## UI/UX Design System

**Design Approach:**
- **Mobile-First**: [Mobile strategy]
- **Accessibility**: [Accessibility requirements]
- **Dark Mode**: [Theme strategy]
- **Layout**: [Layout approach]

**Detailed UI Documentation:**
- **Complete Design System:** See `context/frontend-ui.md`
- **Component Library:** See `context/frontend-ui.md#components`
- **Theming System:** See `context/frontend-ui.md#theming`

## Deployment & Production

**Deployment Strategy:**
- **Hosting**: [Hosting solution]
- **Progressive Web App**: [PWA strategy]
- **Performance Monitoring**: [Monitoring approach]
- **Dependencies**: [Dependency strategy]

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

### ✅ **Completed ([DATE]):**
1. **[Completed Task 1]**: [Description]
2. **[Completed Task 2]**: [Description]
3. **[Completed Task 3]**: [Description]
   - `context/[file].md` - [Description]
   - `context/[file].md` - [Description]
   - `context/[file].md` - [Description]
   - `context/[file].md` - [Description]
   - `context/[file].md` - [Description]
   - `context/[file].md` - [Description]
   - `context/[file].md` - [Description]
   - `context/[file].md` - [Description]
4. **[Completed Task 4]**: [Description]

### 🎯 **Next Session Goals:**
1. **[Next Goal 1]**: [Description]
2. **[Next Goal 2]**: [Description]
3. **[Next Goal 3]**: [Description]
4. **[Next Goal 4]**: [Description]
5. **[Next Goal 5]**: [Description]

### 📋 **Technical Preparation Complete:**
- **[Preparation 1]**: [Description]
- **[Preparation 2]**: [Description]
- **[Preparation 3]**: [Description]
- **[Preparation 4]**: [Description]

---

*Project Status: [Current status]*
*Next: [Next phase description]*