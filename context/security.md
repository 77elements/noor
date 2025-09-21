# Security & Privacy Implementation - Noornote Web Client

## Security Philosophy: Client-Side Only, Zero Trust

### Core Security Principles

**Client-Side Security Model:**
- **Zero Server Dependencies**: All processing happens in the browser
- **No User Data Collection**: Complete user privacy by design
- **No Server-Side Attack Surface**: Static hosting eliminates server vulnerabilities
- **End-to-End Security**: Direct browser-to-relay communication only
- **Open Source Transparency**: All code auditable and verifiable

**Privacy-First Architecture:**
- **Local Storage Only**: All data stored locally in browser
- **No Tracking**: No analytics, telemetry, or fingerprinting
- **VPN Friendly**: Optimized for users behind VPNs/Tor
- **Anonymous Usage**: No registration or personal information required
- **Data Sovereignty**: Users control all their data

## Browser Security Implementation

### Content Security Policy (CSP)

**Production CSP Header:**
```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' wss://*.nostr.com wss://*.damus.io wss://*.snort.social wss://*.wellorder.net wss://*.nos.lol;
  img-src 'self' data: https:;
  media-src 'self' https:;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
```

**Development CSP (More Permissive):**
```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' ws://localhost:* wss://*.nostr.com wss://*.damus.io;
  img-src 'self' data: https:;
```

### Security Headers Configuration

```http
# Security headers for production deployment
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=()
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

### Subresource Integrity (SRI)

```html
<!-- External resources with integrity verification -->
<link rel="stylesheet"
      href="https://cdn.example.com/style.css"
      integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
      crossorigin="anonymous">

<script src="https://cdn.example.com/script.js"
        integrity="sha384-..."
        crossorigin="anonymous"></script>
```

**SRI Generation in Build Process:**
```javascript
// Vite plugin for automatic SRI generation
import { generateSRI } = from 'vite-plugin-sri';

export default {
  plugins: [
    generateSRI({
      algorithms: ['sha384', 'sha256']
    })
  ]
};
```

## Cryptographic Security

### Browser Extension Integration (Secure Key Management)

```javascript
// Secure integration with Nostr browser extensions
class SecureNostrSigner {
  constructor() {
    this.extension = null;
    this.initializeExtension();
  }

  async initializeExtension() {
    // Check for nos2x, Alby, Flamingo, etc.
    if (window.nostr) {
      this.extension = window.nostr;

      // Verify extension capabilities
      const capabilities = await this.checkCapabilities();
      this.validateExtension(capabilities);
    }
  }

  async checkCapabilities() {
    if (!this.extension) return null;

    try {
      // Test basic functionality
      const pubkey = await this.extension.getPublicKey();

      return {
        getPublicKey: !!pubkey,
        signEvent: typeof this.extension.signEvent === 'function',
        nip04: {
          encrypt: typeof this.extension.nip04?.encrypt === 'function',
          decrypt: typeof this.extension.nip04?.decrypt === 'function'
        }
      };
    } catch (error) {
      console.warn('Extension capability check failed:', error);
      return null;
    }
  }

  async signEvent(event) {
    if (!this.extension) {
      throw new Error('No signing extension available');
    }

    // Additional validation before signing
    this.validateEventSecurity(event);

    try {
      const signedEvent = await this.extension.signEvent(event);

      // Verify signature after signing
      if (!this.verifySignature(signedEvent)) {
        throw new Error('Signature verification failed');
      }

      return signedEvent;
    } catch (error) {
      throw new Error(`Signing failed: ${error.message}`);
    }
  }

  validateEventSecurity(event) {
    // Check for potential security issues
    if (!event.content) {
      throw new Error('Event content is required');
    }

    if (event.content.length > 100000) {
      throw new Error('Event content too large (potential DoS)');
    }

    // Validate tags for security
    if (event.tags && event.tags.length > 100) {
      throw new Error('Too many tags (potential DoS)');
    }
  }

  verifySignature(event) {
    try {
      return verifySignature(event);
    } catch (error) {
      return false;
    }
  }
}
```

### Input Validation & Sanitization

```javascript
// Comprehensive input validation
class SecurityValidator {
  static validateEventContent(content) {
    if (typeof content !== 'string') {
      throw new Error('Content must be a string');
    }

    // Length validation
    if (content.length > 100000) {
      throw new Error('Content too long');
    }

    // HTML/Script injection prevention
    if (this.containsHTMLTags(content)) {
      return this.sanitizeHTML(content);
    }

    return content;
  }

  static containsHTMLTags(content) {
    return /<[^>]*>/g.test(content);
  }

  static sanitizeHTML(content) {
    // Basic HTML sanitization (could use DOMPurify for more robust solution)
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  static validateRelayURL(url) {
    try {
      const parsedURL = new URL(url);

      // Only allow wss:// and ws:// protocols
      if (!['ws:', 'wss:'].includes(parsedURL.protocol)) {
        throw new Error('Invalid relay protocol');
      }

      // Prevent localhost access in production
      if (process.env.NODE_ENV === 'production' &&
          ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsedURL.hostname)) {
        throw new Error('Localhost relays not allowed in production');
      }

      return true;
    } catch (error) {
      throw new Error(`Invalid relay URL: ${error.message}`);
    }
  }

  static validatePublicKey(pubkey) {
    // Validate hex public key format
    if (!/^[0-9a-fA-F]{64}$/.test(pubkey)) {
      throw new Error('Invalid public key format');
    }

    return true;
  }
}
```

## XSS Prevention

### Content Sanitization Pipeline

```javascript
// Multi-layer XSS prevention
class XSSProtection {
  constructor() {
    // Initialize DOMPurify-like sanitizer
    this.allowedTags = ['p', 'br', 'strong', 'em', 'code', 'pre', 'blockquote'];
    this.allowedAttributes = {};
  }

  sanitizeContent(content, allowHTML = false) {
    if (!allowHTML) {
      return this.escapeHTML(content);
    }

    // For rich content, use more sophisticated sanitization
    return this.sanitizeRichContent(content);
  }

  escapeHTML(content) {
    const div = document.createElement('div');
    div.textContent = content;
    return div.innerHTML;
  }

  sanitizeRichContent(content) {
    // Create a temporary DOM element for parsing
    const temp = document.createElement('div');
    temp.innerHTML = content;

    // Remove dangerous elements and attributes
    this.removeDangerousElements(temp);
    this.removeDangerousAttributes(temp);

    return temp.innerHTML;
  }

  removeDangerousElements(element) {
    const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input'];

    dangerousTags.forEach(tag => {
      const elements = element.querySelectorAll(tag);
      elements.forEach(el => el.remove());
    });
  }

  removeDangerousAttributes(element) {
    const dangerousAttrs = [
      'onclick', 'onload', 'onerror', 'onmouseover',
      'javascript:', 'vbscript:', 'data:',
      'src', 'href'
    ];

    const allElements = element.querySelectorAll('*');
    allElements.forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (dangerousAttrs.some(dangerous =>
          attr.name.toLowerCase().includes(dangerous.toLowerCase()) ||
          attr.value.toLowerCase().includes(dangerous.toLowerCase())
        )) {
          el.removeAttribute(attr.name);
        }
      });
    });
  }
}
```

### URL Validation for Links

```javascript
// Safe URL handling for user-generated content
class URLValidator {
  static validateURL(url) {
    try {
      const parsed = new URL(url);

      // Allow only safe protocols
      const allowedProtocols = ['http:', 'https:', 'nostr:', 'lightning:'];
      if (!allowedProtocols.includes(parsed.protocol)) {
        return null;
      }

      // Prevent javascript: and data: URLs
      if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
        return null;
      }

      return parsed.toString();
    } catch (error) {
      return null;
    }
  }

  static createSafeLink(url, text) {
    const safeURL = this.validateURL(url);
    if (!safeURL) {
      return document.createTextNode(text || url);
    }

    const link = document.createElement('a');
    link.href = safeURL;
    link.textContent = text || safeURL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer'; // Security: prevent window.opener access

    return link;
  }
}
```

## Privacy Protection

### Local Storage Security

```javascript
// Secure local storage management
class SecureStorage {
  constructor() {
    this.encryptionKey = null;
    this.initializeEncryption();
  }

  async initializeEncryption() {
    // Generate or retrieve encryption key for sensitive data
    const stored = localStorage.getItem('noor_encryption_key');

    if (stored) {
      this.encryptionKey = await this.importKey(stored);
    } else {
      this.encryptionKey = await this.generateKey();
      localStorage.setItem('noor_encryption_key', await this.exportKey(this.encryptionKey));
    }
  }

  async generateKey() {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async exportKey(key) {
    const exported = await crypto.subtle.exportKey('raw', key);
    return Array.from(new Uint8Array(exported));
  }

  async importKey(keyData) {
    return await crypto.subtle.importKey(
      'raw',
      new Uint8Array(keyData),
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async encryptData(data) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      this.encryptionKey,
      encoded
    );

    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    };
  }

  async decryptData(encryptedData) {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(encryptedData.iv),
      },
      this.encryptionKey,
      new Uint8Array(encryptedData.data)
    );

    const decoded = new TextDecoder().decode(decrypted);
    return JSON.parse(decoded);
  }

  // Store sensitive data with encryption
  async setSecure(key, value) {
    const encrypted = await this.encryptData(value);
    localStorage.setItem(`secure_${key}`, JSON.stringify(encrypted));
  }

  // Retrieve and decrypt sensitive data
  async getSecure(key) {
    const stored = localStorage.getItem(`secure_${key}`);
    if (!stored) return null;

    try {
      const encrypted = JSON.parse(stored);
      return await this.decryptData(encrypted);
    } catch (error) {
      console.warn('Failed to decrypt stored data:', error);
      return null;
    }
  }
}
```

### Fingerprinting Prevention

```javascript
// Anti-fingerprinting measures
class PrivacyProtection {
  static initializePrivacyProtections() {
    // Disable potential fingerprinting vectors
    this.disableFingerprintingAPIs();
    this.normalizeCanvasFingerprinting();
    this.protectAgainstTimingAttacks();
  }

  static disableFingerprintingAPIs() {
    // Override potentially fingerprintable APIs
    if (typeof navigator.getBattery === 'function') {
      navigator.getBattery = () => Promise.reject(new Error('Battery API disabled for privacy'));
    }

    // Limit precision of performance APIs
    if (performance.now) {
      const originalNow = performance.now.bind(performance);
      performance.now = () => Math.floor(originalNow() / 100) * 100;
    }
  }

  static normalizeCanvasFingerprinting() {
    // Add noise to canvas rendering to prevent fingerprinting
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

    HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
      // Add minimal noise to prevent exact fingerprinting
      const ctx = this.getContext('2d');
      const imageData = ctx.getImageData(0, 0, 1, 1);

      // Add 1-bit noise
      if (Math.random() > 0.5) {
        imageData.data[0] = imageData.data[0] ^ 1;
      }

      ctx.putImageData(imageData, 0, 0);
      return originalToDataURL.call(this, type, quality);
    };
  }

  static protectAgainstTimingAttacks() {
    // Normalize timing for certain operations
    const timingNoise = () => Math.random() * 2 - 1; // ±1ms noise

    // Add timing protection to critical operations
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const result = await originalFetch(...args);
      const elapsed = performance.now() - start;

      // Add timing noise to prevent side-channel attacks
      await new Promise(resolve =>
        setTimeout(resolve, Math.max(0, 100 - elapsed + timingNoise()))
      );

      return result;
    };
  }
}
```

## VPN & Tor Support

### Optimized Relay Selection for Privacy Networks

```javascript
// VPN/Tor-optimized relay management
class PrivacyRelayManager {
  constructor() {
    this.relayPools = {
      clearnet: [
        'wss://relay.damus.io',
        'wss://nostr-pub.wellorder.net',
        'wss://relay.snort.social'
      ],
      tor: [
        'wss://relay-tor.example.onion',
        // Add .onion relays when available
      ],
      ipv6: [
        'wss://[2001:db8::1]:7777',
        // IPv6-only relays for IPv6 VPNs
      ]
    };

    this.networkType = this.detectNetworkType();
  }

  detectNetworkType() {
    // Detect if user is likely behind Tor/VPN
    const checks = {
      tor: window.location.hostname.endsWith('.onion'),
      vpn: this.detectVPNIndicators(),
      ipv6: this.hasIPv6Support()
    };

    return checks;
  }

  detectVPNIndicators() {
    // Heuristics for VPN detection (not foolproof)
    const indicators = [
      // WebRTC leak protection
      !window.RTCPeerConnection,
      // DNS leak indicators
      this.checkDNSConsistency(),
      // Timezone mismatches
      this.checkTimezoneConsistency()
    ];

    return indicators.some(Boolean);
  }

  async getOptimalRelays() {
    const relays = [];

    // Prefer .onion relays for Tor users
    if (this.networkType.tor) {
      relays.push(...this.relayPools.tor);
    }

    // Add IPv6 relays for IPv6 networks
    if (this.networkType.ipv6) {
      relays.push(...this.relayPools.ipv6);
    }

    // Always include clearnet relays as fallback
    relays.push(...this.relayPools.clearnet);

    // Test connectivity and return best relays
    return await this.testRelayConnectivity(relays);
  }

  async testRelayConnectivity(relays) {
    const results = await Promise.allSettled(
      relays.map(relay => this.testSingleRelay(relay))
    );

    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value)
      .sort((a, b) => a.latency - b.latency)
      .slice(0, 5); // Top 5 fastest relays
  }

  async testSingleRelay(relayURL) {
    const start = performance.now();

    try {
      const ws = new WebSocket(relayURL);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Connection timeout'));
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          const latency = performance.now() - start;
          ws.close();
          resolve({ url: relayURL, latency });
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Connection failed'));
        };
      });
    } catch (error) {
      throw error;
    }
  }
}
```

## Security Monitoring & Incident Response

### Security Event Logging

```javascript
// Security event monitoring (privacy-respecting)
class SecurityMonitor {
  constructor() {
    this.events = [];
    this.maxEvents = 1000; // Limit memory usage
  }

  logSecurityEvent(type, details, severity = 'info') {
    const event = {
      timestamp: Date.now(),
      type,
      details: this.sanitizeDetails(details),
      severity,
      userAgent: navigator.userAgent.substring(0, 100) // Limit fingerprinting
    };

    this.events.push(event);

    // Prevent memory overflow
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Handle critical security events
    if (severity === 'critical') {
      this.handleCriticalEvent(event);
    }
  }

  sanitizeDetails(details) {
    // Remove potentially sensitive information
    const sanitized = { ...details };
    delete sanitized.privateKey;
    delete sanitized.password;
    delete sanitized.token;

    return sanitized;
  }

  handleCriticalEvent(event) {
    // Critical security event response
    console.warn('Critical security event:', event);

    // Could implement additional measures:
    // - Clear sensitive local storage
    // - Disconnect from relays
    // - Show security warning to user
  }

  getSecurityReport() {
    const report = {
      totalEvents: this.events.length,
      eventsByType: this.groupEventsByType(),
      eventsBySeverity: this.groupEventsBySeverity(),
      recentEvents: this.events.slice(-10)
    };

    return report;
  }

  groupEventsByType() {
    return this.events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});
  }

  groupEventsBySeverity() {
    return this.events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {});
  }
}
```

---

*Security implementation optimized for: Privacy > Client-Side Security > Transparency > Usability*