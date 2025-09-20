# Development Workflow & Standards - Noor Web Client

## Development Philosophy: Quality First, Ship Fast

### Core Workflow Principles

**Quality Gates Approach:**
- **Build Success**: All code must compile and build without errors
- **Type Safety**: Zero TypeScript errors or warnings
- **Test Coverage**: 90%+ code coverage requirement
- **Performance Budget**: Bundle size and speed requirements enforced
- **User Approval**: Explicit user testing and approval required

**Rapid Iteration Cycle:**
- **Small Commits**: Feature increments that can be tested quickly
- **Fast Feedback**: Build and test results within seconds
- **User-Centric**: Real browser testing over automated testing
- **Rollback Ready**: Every commit must be potentially deployable

## Git Workflow & Branch Strategy

### Branch Structure

```
main                    # Production-ready code only
├── develop            # Integration branch for testing
├── feature/xyz        # Feature development branches
├── hotfix/abc         # Emergency production fixes
└── release/v1.x       # Release preparation branches
```

### Commit Standards

**Mandatory Commit Format:**
```
<type>: <description>

✅ TESTED: <user testing confirmation>
- <detailed changes>
- <implementation notes>
- <performance impact>

User approval: "<exact user approval quote>"

[Optional additional context]
```

**Commit Types:**
```
feat:     New feature implementation
fix:      Bug fix or issue resolution
perf:     Performance optimization
refactor: Code restructuring without feature changes
style:    Code formatting, CSS, UI changes
test:     Adding or updating tests
docs:     Documentation updates
build:    Build system or dependency changes
ci:       CI/CD pipeline changes
```

**Example Commit:**
```
feat: implement virtual scrolling for timeline

✅ TESTED: User confirmed "timeline scrolling is smooth on mobile"
- Added VirtualScrollTimeline component with 60fps performance
- Implemented intersection observer for efficient rendering
- Reduced memory usage from 80MB to 45MB for 1000+ events
- Added comprehensive test coverage for scroll edge cases

User approval: "perfect performance, ship it!"

Fixes performance issue with large timelines causing browser lag.
Bundle size impact: +12KB for virtual scrolling library.
```

### Pre-Commit Quality Gates

**Automated Checks (Must Pass):**
```bash
# Pre-commit hook script
#!/bin/sh

echo "🔍 Running quality checks..."

# 1. TypeScript compilation
npm run type-check
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors found"
  exit 1
fi

# 2. ESLint code quality
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting errors found"
  exit 1
fi

# 3. Unit tests
npm run test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed"
  exit 1
fi

# 4. Build production bundle
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

# 5. Bundle size check
npm run size-limit
if [ $? -ne 0 ]; then
  echo "❌ Bundle size exceeds budget"
  exit 1
fi

echo "✅ All quality checks passed"
```

### User Testing Protocol

**Required Testing Steps:**
1. **Browser Testing**: Chrome, Firefox, Safari on desktop + mobile
2. **Feature Testing**: All new functionality thoroughly tested
3. **Regression Testing**: Existing features still work correctly
4. **Performance Testing**: Load times, memory usage, responsiveness
5. **Accessibility Testing**: Keyboard navigation, screen reader compatibility

**User Approval Requirements:**
- **Explicit Approval**: User must explicitly say "approved", "ship it", "looks good", etc.
- **No Assumption**: Build success ≠ approval, test passing ≠ approval
- **Documentation**: Exact approval quote must be included in commit message
- **Rollback Plan**: User must be able to easily identify what to rollback if issues arise

## Development Environment Setup

### Required Tools & Versions

```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "prettier": "^3.0.0",
    "husky": "^8.0.0",
    "lint-staged": "^15.0.0",
    "size-limit": "^8.0.0"
  }
}
```

### IDE Configuration

**VS Code Settings (.vscode/settings.json):**
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.preferences.includePackageJsonAutoImports": "off",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.js": "javascript",
    "*.ts": "typescript"
  },
  "editor.rulers": [80, 120],
  "editor.tabSize": 2,
  "editor.insertSpaces": true
}
```

**Recommended VS Code Extensions:**
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "@typescript-eslint/eslint-plugin",
    "ms-vscode.vscode-typescript-next",
    "github.copilot",
    "ms-playwright.playwright"
  ]
}
```

## Testing Strategy & Standards

### Testing Pyramid

```
                /\
               /  \
              /    \
             / E2E  \    <- Few, high-value end-to-end tests
            /________\
           /          \
          / Integration \  <- Moderate integration tests
         /______________\
        /                \
       /      Unit        \  <- Many fast unit tests
      /____________________\
```

### Unit Testing Standards

**Test File Structure:**
```
src/
├── components/
│   ├── Timeline.js
│   └── Timeline.test.js      # Co-located test files
├── services/
│   ├── RelayManager.js
│   └── RelayManager.test.js
└── helpers/
    ├── validation.js
    └── validation.test.js
```

**Test Naming Convention:**
```javascript
// describe: Component/Service name
// test: should + expected behavior + when condition

describe('TimelineComponent', () => {
  test('should render loading state when events are being fetched', () => {
    // Test implementation
  });

  test('should display events when loading completes successfully', () => {
    // Test implementation
  });

  test('should show error message when event fetching fails', () => {
    // Test implementation
  });
});
```

**Test Quality Standards:**
```javascript
// ✅ Good test example
test('should format timestamp as relative time for recent events', () => {
  // Arrange
  const timestamp = Date.now() - (5 * 60 * 1000); // 5 minutes ago
  const formatter = new TimestampFormatter();

  // Act
  const result = formatter.formatRelative(timestamp);

  // Assert
  expect(result).toBe('5 minutes ago');
});

// ❌ Poor test example (vague, no clear expectation)
test('should work correctly', () => {
  const component = new TimelineComponent();
  expect(component).toBeDefined();
});
```

### Integration Testing

**Service Integration Tests:**
```javascript
describe('NostrClient Integration', () => {
  test('should connect to relay and fetch events', async () => {
    // Use test relay or mock WebSocket
    const client = new NostrClient(['ws://localhost:7777']);
    await client.connect();

    const events = await client.fetchEvents({ kinds: [1], limit: 10 });

    expect(events).toBeInstanceOf(Array);
    expect(events.length).toBeLessThanOrEqual(10);
    expect(events.every(event => event.kind === 1)).toBe(true);
  });
});
```

### End-to-End Testing with Playwright

**E2E Test Examples:**
```javascript
// tests/e2e/timeline.spec.js
import { test, expect } from '@playwright/test';

test('timeline loads and displays events', async ({ page }) => {
  await page.goto('/');

  // Wait for timeline to load
  await expect(page.locator('.timeline-container')).toBeVisible();

  // Check that events are displayed
  const events = page.locator('.timeline-item');
  await expect(events).toHaveCountGreaterThan(0);

  // Verify event structure
  const firstEvent = events.first();
  await expect(firstEvent.locator('.author')).toBeVisible();
  await expect(firstEvent.locator('.timestamp')).toBeVisible();
  await expect(firstEvent.locator('.content')).toBeVisible();
});

test('user can compose and publish a note', async ({ page }) => {
  await page.goto('/');

  // Open compose dialog
  await page.click('[data-testid="compose-button"]');
  await expect(page.locator('.compose-dialog')).toBeVisible();

  // Type content
  await page.fill('[data-testid="compose-textarea"]', 'Hello Nostr world!');

  // Publish note
  await page.click('[data-testid="publish-button"]');

  // Verify success
  await expect(page.locator('.success-message')).toBeVisible();
});
```

## Performance Monitoring & Optimization

### Bundle Size Monitoring

**Size Limit Configuration:**
```javascript
// .size-limit.js
module.exports = [
  {
    path: 'dist/**/*.js',
    limit: '400 KB',
    gzip: true,
    webpack: false
  },
  {
    path: 'dist/**/*.css',
    limit: '50 KB',
    gzip: true
  },
  {
    path: 'dist/index.html',
    limit: '10 KB',
    gzip: true
  }
];
```

**Bundle Analysis Integration:**
```bash
# CI/CD bundle analysis
npm run build
npm run analyze

# Generate bundle report
npx vite-bundle-analyzer dist --open
```

### Performance Budget Enforcement

**Lighthouse CI Configuration:**
```json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.9 }]
      }
    },
    "collect": {
      "startServerCommand": "npm run preview",
      "url": ["http://localhost:4173"]
    }
  }
}
```

**Performance Testing Script:**
```javascript
// scripts/performance-test.js
import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';

async function runPerformanceTest() {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });

  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port,
  };

  const runnerResult = await lighthouse('http://localhost:3000', options);
  const score = runnerResult.lhr.categories.performance.score * 100;

  if (score < 90) {
    throw new Error(`Performance score ${score} below threshold (90)`);
  }

  console.log(`✅ Performance score: ${score}`);
  await chrome.kill();
}
```

## Code Quality Standards

### TypeScript Configuration

**Strict TypeScript Config (tsconfig.json):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/services/*": ["src/services/*"],
      "@/helpers/*": ["src/helpers/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### ESLint Configuration

**Strict ESLint Rules (.eslintrc.js):**
```javascript
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json'
  },
  rules: {
    // Performance-critical rules
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'warn',
    'no-debugger': 'error',

    // Type safety
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',

    // Code quality
    'complexity': ['error', 10],
    'max-lines-per-function': ['error', 50],
    'max-depth': ['error', 4],
    'no-magic-numbers': ['warn', { 'ignore': [0, 1, -1] }],

    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error'
  }
};
```

### Prettier Configuration

**Code Formatting (.prettierrc):**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test -- --coverage

      - name: Build
        run: npm run build

      - name: Bundle size check
        run: npm run size-limit

      - name: E2E tests
        run: npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install and build
        run: |
          npm ci
          npm run build

      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v1.2
        with:
          publish-dir: './dist'
          production-branch: main
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## Documentation Standards

### Code Documentation

**JSDoc Standards:**
```javascript
/**
 * Manages Nostr relay connections with automatic reconnection and error handling.
 *
 * @example
 * ```javascript
 * const manager = new RelayManager(['wss://relay.damus.io']);
 * await manager.connect();
 * const events = await manager.fetchEvents({ kinds: [1], limit: 10 });
 * ```
 */
class RelayManager {
  /**
   * Creates a new RelayManager instance.
   *
   * @param {string[]} relayUrls - Array of relay WebSocket URLs
   * @param {object} options - Configuration options
   * @param {number} options.connectionTimeout - Connection timeout in milliseconds
   * @param {number} options.maxRetries - Maximum reconnection attempts
   * @throws {Error} When relay URLs are invalid
   */
  constructor(relayUrls, options = {}) {
    // Implementation
  }

  /**
   * Fetches events from connected relays.
   *
   * @param {object} filter - Nostr filter object
   * @param {number[]} filter.kinds - Event kinds to fetch
   * @param {string[]} filter.authors - Author public keys
   * @param {number} filter.limit - Maximum number of events
   * @returns {Promise<NostrEvent[]>} Array of Nostr events
   * @throws {Error} When no relays are connected
   */
  async fetchEvents(filter) {
    // Implementation
  }
}
```

### API Documentation

**Service API Documentation:**
```typescript
// types/NostrTypes.ts
/**
 * Nostr event structure according to NIP-01
 */
export interface NostrEvent {
  /** Event ID (hex string) */
  id: string;
  /** Public key of event creator (hex string) */
  pubkey: string;
  /** Unix timestamp in seconds */
  created_at: number;
  /** Event kind (integer) */
  kind: number;
  /** Array of tags */
  tags: string[][];
  /** Event content */
  content: string;
  /** Event signature (hex string) */
  sig: string;
}

/**
 * Relay connection status
 */
export type RelayStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Configuration for relay connections
 */
export interface RelayConfig {
  /** Relay WebSocket URL */
  url: string;
  /** Whether to attempt reconnection on disconnect */
  autoReconnect: boolean;
  /** Connection timeout in milliseconds */
  timeout: number;
}
```

---

*Workflow optimized for: Code Quality > User Satisfaction > Development Speed > Automation*