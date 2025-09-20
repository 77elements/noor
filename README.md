# Noor - High-Performance Nostr Web Client

**Noor** (Arabic: نور, meaning "light") is a high-performance, enterprise-grade Nostr web client designed to combine the best performance patterns from existing clients while delivering superior UX, security, and global accessibility.

## Project Status

🏗️ **Planning Phase Complete** - Ready for development implementation

### Current State
- ✅ Comprehensive competitor analysis completed
- ✅ Architecture and technology stack defined
- ✅ Development workflow and standards established
- ✅ Modular documentation system created
- 🎯 **Next**: Development environment setup and core infrastructure

## Key Features & Goals

### Performance Targets
- **Bundle Size**: <500KB gzipped (50% smaller than competitors)
- **Load Time**: <2 seconds on 3G connections
- **Memory Usage**: <50MB for 1000+ timeline events
- **Real-time Updates**: <200ms latency

### Technical Highlights
- **Vanilla JavaScript**: Zero framework overhead for maximum performance
- **Multi-layer Caching**: Memory + IndexedDB + Service Worker
- **VPN Optimized**: Global accessibility and privacy focus
- **Progressive Enhancement**: Works without JavaScript
- **Enterprise Security**: Client-side only, zero server dependencies

## Documentation Structure

This project uses a modular documentation system for maintainability and clarity:

### Core Documentation
- **[CLAUDE.md](./CLAUDE.md)** - Main development standards and project overview
- **[.gitignore](./.gitignore)** - Git exclusions (private analysis files excluded)

### Context Documentation (`context/`)
- **[architecture.md](./context/architecture.md)** - Software architecture patterns and component system
- **[competitors.md](./context/competitors.md)** - Competitive analysis reference and benchmarks
- **[frontend-ui.md](./context/frontend-ui.md)** - UI/UX design system and component library
- **[performance.md](./context/performance.md)** - Performance optimization strategies and monitoring
- **[security.md](./context/security.md)** - Security implementation and privacy protection
- **[server-tech.md](./context/server-tech.md)** - Deployment strategy and hosting configuration
- **[tech-stack.md](./context/tech-stack.md)** - Technology decisions and implementation rationale
- **[workflow.md](./context/workflow.md)** - Development workflow, testing, and quality standards

## Development Approach

### 5-Phase Development Process
1. **Code Implementation** - Clean, documented, TypeScript-compliant code
2. **Real-World Testing** - User browser testing across platforms
3. **User Approval Gate** - Explicit user approval required
4. **Commit Process** - Mandatory format with ✅ TESTED tags
5. **Research First** - Look up standards before implementation

### Quality Requirements
- **TypeScript**: Strict compilation with zero errors
- **Testing**: 90%+ code coverage requirement
- **Performance**: Lighthouse score 95+ requirement
- **Accessibility**: WCAG 2.1 AA compliance minimum
- **Browser Support**: Modern browsers with progressive enhancement

## Technology Stack

### Core Technologies
- **Language**: TypeScript with strict configuration
- **Framework**: Vanilla JavaScript (zero framework overhead)
- **Build**: Vite + Rollup with aggressive optimization
- **Styling**: Modern CSS3 with CSS Variables
- **Storage**: IndexedDB + Memory cache + Service Worker
- **Search**: FlexSearch for client-side search
- **Testing**: Vitest + Playwright for comprehensive coverage

### Nostr Integration
- **Library**: nostr-tools (minimal, battle-tested)
- **Relay Management**: SimplePool + DataLoader pattern
- **Authentication**: Browser extension integration (nos2x, Alby, Flamingo)
- **Security**: Client-side only with strict validation

## Competitive Advantage

Based on comprehensive analysis of Jumble.social, Primal.net, YakiHonne.com, and Gleasonator.dev:

### Performance Improvements
- **50% smaller bundle size** vs best competitor
- **Faster load times** through vanilla JS optimization
- **Better memory efficiency** with advanced caching
- **Safari optimization** for WebSocket connections

### Unique Features
- **VPN optimization** for global accessibility
- **Enterprise security** with zero server dependencies
- **Privacy-first** with no tracking or analytics
- **Progressive enhancement** for maximum compatibility

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Modern browser for testing

### Development Setup
```bash
# Clone the repository
git clone <repository-url>
cd noor

# Install dependencies (coming next session)
npm install

# Start development server (coming next session)
npm run dev

# Run tests (coming next session)
npm test

# Build for production (coming next session)
npm run build
```

## Contributing

This project follows strict enterprise development standards. Please review:
- [Development Workflow](./context/workflow.md) for contribution guidelines
- [Architecture Documentation](./context/architecture.md) for technical patterns
- [CLAUDE.md](./CLAUDE.md) for core project standards

### Quality Gates
All contributions must pass:
1. TypeScript compilation without errors
2. ESLint compliance
3. 90%+ test coverage
4. Bundle size budget (<500KB)
5. Performance requirements (Lighthouse 95+)
6. Accessibility compliance (WCAG 2.1 AA)

## License

[License to be determined]

## Contact

[Contact information to be added]

---

*Project initiated: September 20, 2025*
*Status: Planning complete - Ready for development*