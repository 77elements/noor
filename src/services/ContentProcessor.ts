/**
 * ContentProcessor Service
 * Shared content processing logic for NoteUI and SingleNoteView
 * Handles: media extraction, link extraction, hashtags, quoted refs, HTML formatting
 */

import { extractMedia } from '../helpers/extractMedia';
import { extractLinks } from '../helpers/extractLinks';
import { extractHashtags } from '../helpers/extractHashtags';
import { extractQuotedReferences } from '../helpers/extractQuotedReferences';
import { escapeHtml } from '../helpers/escapeHtml';
import { linkifyUrls } from '../helpers/linkifyUrls';
import { formatHashtags } from '../helpers/formatHashtags';
import { formatQuotedReferences } from '../helpers/formatQuotedReferences';
import { convertLineBreaks } from '../helpers/convertLineBreaks';
import { npubToUsername } from '../helpers/npubToUsername';
import { hexToNpub } from '../helpers/hexToNpub';
import { UserProfileService } from './UserProfileService';
import type { MediaContent } from '../helpers/renderMediaContent';
import type { QuotedReference as ExtractedQuotedReference } from '../helpers/extractQuotedReferences';

export interface QuotedReference {
  type: 'event' | 'note' | 'addr';
  id: string;
  fullMatch: string;
}

export interface ProcessedContent {
  text: string;
  html: string;
  media: MediaContent[];
  links: any[];
  hashtags: string[];
  quotedReferences: QuotedReference[];
}

export class ContentProcessor {
  private static instance: ContentProcessor;
  private userProfileService: UserProfileService;
  private profileCache: Map<string, any> = new Map();

  private constructor() {
    this.userProfileService = UserProfileService.getInstance();
  }

  static getInstance(): ContentProcessor {
    if (!ContentProcessor.instance) {
      ContentProcessor.instance = new ContentProcessor();
    }
    return ContentProcessor.instance;
  }

  /**
   * Process content without tags
   */
  processContent(text: string): ProcessedContent {
    return this.processContentWithTags(text, []);
  }

  /**
   * Process content with tags (for mention profile loading)
   * SYNCHRONOUS - no blocking calls
   */
  processContentWithTags(text: string, tags: string[][]): ProcessedContent {
    const media = extractMedia(text);
    const links = extractLinks(text);
    const hashtags = extractHashtags(text);
    const quotedRefs = extractQuotedReferences(text);

    const quotedReferences: QuotedReference[] = quotedRefs.map(ref => ({
      type: ref.type as 'event' | 'note' | 'addr',
      id: ref.id,
      fullMatch: ref.fullMatch
    }));

    // NON-BLOCKING: Trigger profile fetch for ALL p-tags in background
    const mentionTags = tags.filter(tag => tag[0] === 'p');
    if (mentionTags.length > 0) {
      const mentionPubkeys = mentionTags.map(tag => tag[1]);
      this.userProfileService.getUserProfiles(mentionPubkeys).then(profiles => {
        profiles.forEach((profile, pubkey) => {
          this.profileCache.set(pubkey, profile);
          // Update DOM immediately when profile loads
          this.updateMentionsInDOM(pubkey, profile);
        });
      }).catch(err => console.warn('Failed to load mention profiles:', err));
    }

    // Profile resolver for mentions
    const profileResolver = (hexPubkey: string) => {
      const profile = this.getNonBlockingProfile(hexPubkey);
      return profile ? {
        name: profile.name,
        display_name: profile.display_name,
        picture: profile.picture
      } : null;
    };

    // Remove media URLs and quoted references from text
    let cleanedText = text;
    media.forEach(item => {
      cleanedText = cleanedText.replace(item.url, '');
    });
    quotedReferences.forEach(ref => {
      cleanedText = cleanedText.replace(ref.fullMatch, '');
    });
    cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n').trim();

    // Process HTML with individual helpers
    let html = escapeHtml(cleanedText);
    html = linkifyUrls(html);
    html = npubToUsername(html, 'html-multi', profileResolver);
    html = formatHashtags(html, hashtags);
    html = formatQuotedReferences(html, quotedReferences);
    html = convertLineBreaks(html);

    return {
      text,
      html,
      media,
      links,
      hashtags,
      quotedReferences
    };
  }

  /**
   * Get profile non-blocking with cache
   */
  getNonBlockingProfile(pubkey: string): any {
    if (this.profileCache.has(pubkey)) {
      return this.profileCache.get(pubkey);
    }

    const fallbackProfile = {
      pubkey,
      name: null,
      display_name: null,
      picture: '',
      about: null
    };

    this.profileCache.set(pubkey, fallbackProfile);

    this.userProfileService.getUserProfile(pubkey)
      .then(realProfile => {
        if (realProfile) {
          this.profileCache.set(pubkey, realProfile);
          // Update mentions in DOM after profile loads
          this.updateMentionsInDOM(pubkey, realProfile);
        }
      })
      .catch(error => {
        console.warn(`Profile load failed for ${pubkey.slice(0, 8)}:`, error);
      });

    return fallbackProfile;
  }

  /**
   * Update mentions in DOM after profile loads (progressive enhancement)
   */
  private updateMentionsInDOM(hexPubkey: string, profile: any): void {
    const username = profile.name || profile.display_name;
    if (!username) return;

    // Convert hex to npub for profile URL
    const npub = hexToNpub(hexPubkey);

    // Find all mention links that point to this profile
    const mentionLinks = document.querySelectorAll(`a[href="/profile/${npub}"]`);

    mentionLinks.forEach((link) => {
      const linkElement = link as HTMLAnchorElement;
      const currentText = linkElement.textContent || '';

      // Only update if it's still showing the raw nostr: format
      if (currentText.startsWith('nostr:npub') || currentText.startsWith('nostr:nprofile')) {
        linkElement.textContent = `@${username}`;
      }
    });
  }
}
