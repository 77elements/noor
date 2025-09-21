# Development Workflow & Standards - Noornote Web Client

## ⛔ STRICT DEVELOPMENT PROCESS - NEVER DEVIATE!

### General Philosophy
Treat and implement this app at an enterprise level, like an experienced senior developer would. No dirty hacks, no half-baked "quick fixes." Always pay attention to architecture with strong modularity and proper encapsulation of functionality. Do not suddenly introduce major changes to core mechanisms (such as caching). You are not just coding the current feature, you are working on a small part of an app that will grow to be very large and complex later on (for example, with an addon or extension system and multiple extensions that could fundamentally change the app's purpose). Write code that is modular, resource-efficient, and maintainable.

So, whenever you implement a function, ask yourself first: "Could this function also be useful in another component?" If you are not sure, ask the user. If you do not get an answer, it is better to assume yes than no. The idea is to avoid cramming everything messily in one place instead of keeping things modular.

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

## Visual Development Standards

### Screenshot Workflow
- **Default Reference**: `screenshots/screenshot.png` - current app state
- **User Commands**: "siehe Screenshot" = `screenshots/screenshot.png`
- **Naming**: `[feature]-[state].png`, `[page]-[variant].png`

### Color Usage Rules
**NEVER use color variants without explicit user request:**
- Base colors only: $color-1, $color-2, $color-3, $color-4, $color-5
- $color-1, $color-2: Background colors only
- $color-5: Default text color
- $color-4: Interactive elements only (clickable recognition)
- $color-3: Accent color (sparingly used)

## Git Workflow & Quality Control

### Branch Strategy
```
main → develop → feature/xyz
              → hotfix/abc
              → release/v1.x
```

### Commit Standards
**Mandatory Format:**
```
<type>: <description>
✅ TESTED: <user confirmation>
- <changes>
User approval: "<exact quote>"
```

**Critical Rules:**
- Use mandatory commit format with ✅ TESTED tags
- Document what user tested and approved
- Reference user's exact approval words in commit message
- **NEVER INSERT CLAUDE CODE SIGNATURE INTO COMMIT MESSAGES!**
- If user says "Commit," document development status in CLAUDE.md first
- Use format: `git add . && git commit -m "[message]"` in one line

**Types:** feat, fix, perf, refactor, style, test, docs, build, ci

### Quality Gates
**Pre-commit Requirements:**
- TypeScript compilation, ESLint, 90%+ test coverage
- Production build success, bundle <500KB

**User Testing Required:**
- Browser testing (Chrome, Firefox, Safari)
- Feature & regression testing
- Performance & accessibility validation
- Explicit user approval with exact quotes

## Development Environment & Testing

### Required Stack
- **Node**: >=18.0.0, **npm**: >=9.0.0
- **Core**: TypeScript + Vite + Vitest + Sass

### Testing Strategy
**Testing Pyramid:**
- **Unit Tests**: Many fast tests (co-located with code)
- **Integration Tests**: Moderate service integration tests
- **E2E Tests**: Few high-value Playwright tests

**Quality Standards:**
- Test naming: `should [behavior] when [condition]`
- 90%+ code coverage requirement
- Arrange-Act-Assert pattern
- Mock external dependencies

## Performance & Code Quality

### Bundle Optimization
- **JS Limit**: 400KB gzipped
- **CSS Limit**: 50KB gzipped

### TypeScript Configuration
- **Strict mode** with extra safety checks
- **Path mapping**: `@/*` → `src/*`
- **Zero errors** requirement

### ESLint Rules
- **Performance**: `prefer-const`, `no-var`
- **Type safety**: No `any`, prefer nullish coalescing
- **Code quality**: Max complexity 10, max function lines 50
- **Security**: No `eval`

## CI/CD & Deployment

### CI/CD Pipeline
- **Test Flow**: type-check → lint → test → build → size-check → e2e
- **Deploy**: On main branch to Netlify
- **Performance**: Lighthouse 90+ score requirement

## Documentation Standards

### Documentation Requirements
- **JSDoc**: Function descriptions with examples and parameter types
- **TypeScript**: Complete interfaces for Nostr events and relay configs

---

*Optimized for: Code Quality > User Satisfaction > Development Speed > Automation*