# Frontend UI/UX Design System - Noornote Web Client

## Design Philosophy & Core Principles

### Performance-First Design
**Every UI decision optimized for speed and efficiency**
- **Minimal DOM**: Reduce element count for faster rendering
- **CSS-only Animations**: No JavaScript animation libraries
- **Lazy Loading**: Load UI components only when needed
- **Virtual Scrolling**: Handle large timelines efficiently
- **Critical Path**: Inline critical CSS, defer non-essential styles

### Accessibility-First Approach
**WCAG 2.1 AA compliance as minimum standard**
- **Semantic HTML**: Proper element structure for screen readers
- **Keyboard Navigation**: Full functionality without mouse
- **Focus Management**: Visible focus indicators and logical tab order
- **Color Contrast**: 4.5:1 minimum for normal text, 3:1 for large text
- **Motion Preferences**: Respect prefers-reduced-motion

### Mobile-First Responsive Design
**Progressive enhancement from mobile to desktop**
- **Touch-Friendly**: 44px minimum touch targets
- **Thumb Navigation**: Critical actions within thumb reach
- **One-Handed Use**: Primary functions accessible with one hand
- **Network Awareness**: Graceful degradation on slow connections

## Visual Design System

### Color Palette

#### Primary Colors:
```css
:root {
  /* Nostr Brand Colors */
  --primary-purple: #8B5CF6;    /* Nostr signature purple */
  --primary-orange: #F59E0B;    /* Bitcoin orange accent */

  /* Semantic Colors */
  --success: #10B981;           /* Green for success states */
  --warning: #F59E0B;           /* Orange for warnings */
  --error: #EF4444;             /* Red for errors */
  --info: #3B82F6;              /* Blue for information */

  /* Neutral Palette */
  --gray-50: #F9FAFB;
  --gray-100: #F3F4F6;
  --gray-200: #E5E7EB;
  --gray-300: #D1D5DB;
  --gray-400: #9CA3AF;
  --gray-500: #6B7280;
  --gray-600: #4B5563;
  --gray-700: #374151;
  --gray-800: #1F2937;
  --gray-900: #111827;
}
```

#### Theme System:
```css
/* Light Theme (Default) */
:root {
  --background: white;
  --surface: var(--gray-50);
  --surface-elevated: white;
  --text-primary: var(--gray-900);
  --text-secondary: var(--gray-600);
  --border: var(--gray-200);
  --border-focus: var(--primary-purple);
}

/* Dark Theme */
[data-theme="dark"] {
  --background: var(--gray-900);
  --surface: var(--gray-800);
  --surface-elevated: var(--gray-700);
  --text-primary: white;
  --text-secondary: var(--gray-300);
  --border: var(--gray-700);
  --border-focus: var(--primary-purple);
}

/* High Contrast Theme (Accessibility) */
[data-theme="high-contrast"] {
  --background: black;
  --surface: black;
  --text-primary: white;
  --border: white;
  --primary-purple: #BB86FC; /* Higher contrast purple */
}
```

### Typography System

#### Font Stack:
```css
:root {
  /* System font stack for performance */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
               "Helvetica Neue", Arial, sans-serif;
  --font-mono: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono",
               Consolas, "Courier New", monospace;

  /* Fluid typography scale */
  --text-xs: clamp(0.75rem, 0.5vw + 0.65rem, 0.875rem);
  --text-sm: clamp(0.875rem, 0.75vw + 0.75rem, 1rem);
  --text-base: clamp(1rem, 1vw + 0.875rem, 1.125rem);
  --text-lg: clamp(1.125rem, 1.25vw + 1rem, 1.25rem);
  --text-xl: clamp(1.25rem, 1.5vw + 1.125rem, 1.5rem);
  --text-2xl: clamp(1.5rem, 2vw + 1.25rem, 2rem);
  --text-3xl: clamp(1.875rem, 2.5vw + 1.5rem, 2.5rem);
}
```

#### Typography Classes:
```css
.text-display {
  font-size: var(--text-3xl);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.025em;
}

.text-headline {
  font-size: var(--text-2xl);
  font-weight: 600;
  line-height: 1.3;
}

.text-body {
  font-size: var(--text-base);
  font-weight: 400;
  line-height: 1.6;
}

.text-caption {
  font-size: var(--text-sm);
  font-weight: 400;
  line-height: 1.4;
  color: var(--text-secondary);
}
```

### Layout System

#### CSS Grid Foundation:
```css
/* Main application layout */
.app-layout {
  display: grid;
  grid-template-areas:
    "sidebar header"
    "sidebar main"
    "sidebar footer";
  grid-template-columns: 280px 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

/* Responsive breakpoints */
@media (max-width: 768px) {
  .app-layout {
    grid-template-areas:
      "header"
      "main"
      "footer";
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
  }
}
```

#### Container Queries (Modern Approach):
```css
/* Component-level responsiveness */
.timeline-container {
  container-type: inline-size;
}

@container (max-width: 600px) {
  .timeline-item {
    padding: 0.75rem;
    font-size: var(--text-sm);
  }
}

@container (min-width: 800px) {
  .timeline-item {
    padding: 1.5rem;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 1rem;
  }
}
```

### Component Architecture

#### Web Components Strategy:
```javascript
// Base component class
class NoornoteComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = {};
    this.render();
  }

  connectedCallback() {
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = this.template();
  }
}
```

#### Component Examples:

**Timeline Item Component:**
```javascript
class TimelineItem extends NoornoteComponent {
  template() {
    return `
      <style>
        :host {
          display: block;
          padding: 1rem;
          border-bottom: 1px solid var(--border);
          transition: background-color 0.2s ease;
        }

        :host(:hover) {
          background-color: var(--surface);
        }

        .author {
          font-weight: 600;
          color: var(--primary-purple);
        }

        .timestamp {
          color: var(--text-secondary);
          font-size: var(--text-sm);
        }

        .content {
          margin-top: 0.5rem;
          line-height: 1.6;
        }
      </style>

      <article>
        <header>
          <span class="author">${this.state.author}</span>
          <time class="timestamp">${this.state.timestamp}</time>
        </header>
        <div class="content">${this.state.content}</div>
      </article>
    `;
  }
}

customElements.define('timeline-item', TimelineItem);
```

### Animation & Interaction Design

#### Performance-Optimized Animations:
```css
/* Use transform and opacity for 60fps animations */
.timeline-item {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.timeline-item:hover {
  transform: translateY(-1px);
}

/* Loading states */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Respect motion preferences */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### Micro-interactions:
```css
/* Button interactions */
.button {
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}

.button::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.3s ease, height 0.3s ease;
}

.button:active::before {
  width: 300px;
  height: 300px;
}
```

### Form & Input Design

#### Input Component System:
```css
.input-group {
  position: relative;
  margin-bottom: 1rem;
}

.input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border);
  border-radius: 0.5rem;
  font-size: var(--text-base);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.input-label {
  position: absolute;
  top: 0.75rem;
  left: 1rem;
  pointer-events: none;
  transition: all 0.2s ease;
  color: var(--text-secondary);
}

.input:focus + .input-label,
.input:not(:placeholder-shown) + .input-label {
  top: -0.5rem;
  left: 0.75rem;
  font-size: var(--text-sm);
  background: var(--background);
  padding: 0 0.25rem;
  color: var(--border-focus);
}
```

### Media & Content Design

#### Image Optimization:
```css
.image-container {
  position: relative;
  overflow: hidden;
  border-radius: 0.5rem;
}

.image {
  width: 100%;
  height: auto;
  transition: transform 0.3s ease;
}

.image:hover {
  transform: scale(1.02);
}

/* Lazy loading placeholder */
.image-placeholder {
  background: linear-gradient(90deg, var(--gray-200) 25%, var(--gray-100) 50%, var(--gray-200) 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

#### Video Player Integration:
```css
.video-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  overflow: hidden;
  border-radius: 0.5rem;
}

.video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}
```

### Accessibility Features

#### Focus Management:
```css
/* Visible focus indicators */
.focusable:focus-visible {
  outline: 2px solid var(--primary-purple);
  outline-offset: 2px;
}

/* Skip links */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--primary-purple);
  color: white;
  padding: 8px;
  text-decoration: none;
  border-radius: 4px;
  z-index: 1000;
}

.skip-link:focus {
  top: 6px;
}
```

#### Screen Reader Support:
```html
<!-- ARIA landmarks and labels -->
<main role="main" aria-label="Timeline">
  <article aria-labelledby="note-123-author" aria-describedby="note-123-content">
    <h3 id="note-123-author">@alice</h3>
    <div id="note-123-content">Note content here</div>
    <time aria-label="Posted 2 hours ago">2h</time>
  </article>
</main>

<!-- Live regions for dynamic content -->
<div aria-live="polite" aria-atomic="true" class="sr-only">
  New note from @bob
</div>
```

### Performance Optimizations

#### Critical CSS Inlining:
```html
<head>
  <style>
    /* Critical path CSS inlined */
    body { margin: 0; font-family: var(--font-sans); }
    .app-layout { display: grid; /* ... */ }
  </style>
  <link rel="preload" href="/css/non-critical.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
</head>
```

#### CSS Containment:
```css
.timeline-item {
  contain: layout style paint;
}

.sidebar {
  contain: size layout style paint;
}
```

#### Virtual Scrolling Implementation:
```javascript
class VirtualScroller {
  constructor(container, itemHeight, renderItem) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.renderItem = renderItem;
    this.visibleItems = [];
    this.scrollTop = 0;

    this.setupIntersectionObserver();
  }

  render(data) {
    const containerHeight = this.container.clientHeight;
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = startIndex + Math.ceil(containerHeight / this.itemHeight) + 1;

    this.visibleItems = data.slice(startIndex, endIndex);
    this.updateDOM();
  }
}
```

### Testing & Validation

#### Visual Regression Testing:
```javascript
// Playwright visual testing
test('timeline component appearance', async ({ page }) => {
  await page.goto('/timeline');
  await expect(page.locator('.timeline')).toHaveScreenshot('timeline.png');
});
```

#### Accessibility Testing:
```javascript
// axe-core integration
import { injectAxe, checkA11y } from 'axe-playwright';

test('timeline accessibility', async ({ page }) => {
  await injectAxe(page);
  await checkA11y(page, '.timeline', {
    detailedReport: true,
    detailedReportOptions: { html: true }
  });
});
```

---

*UI/UX System optimized for: Performance > Accessibility > Mobile Experience > Visual Appeal*