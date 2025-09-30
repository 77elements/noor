/**
 * Note Content Processing
 * Processes all note types and content into structured, renderable format
 * Handles reposts, quotes, media, links, and rich text formatting
 */

import type { Event as NostrEvent } from 'nostr-tools';
import { UserProfileService } from '../../services/UserProfileService';
import { formatContent } from '../../helpers/formatContent';
import { extractMedia } from '../../helpers/extractMedia';
import { extractLinks } from '../../helpers/extractLinks';
import { extractQuotedReferences } from '../../helpers/extractQuotedReferences';
import { extractHashtags } from '../../helpers/extractHashtags';
import { extractNpubMentions } from '../../helpers/extractNpubMentions';

export interface ProcessedNote {
  id: string;
  type: 'original' | 'repost' | 'quote';
  timestamp: number;

  // Author info
  author: {
    pubkey: string;
    profile?: {
      name?: string;
      display_name?: string;
      picture?: string;
    };
  };

  // For reposts: the reposter info
  reposter?: {
    pubkey: string;
    profile?: {
      name?: string;
      display_name?: string;
      picture?: string;
    };
  };

  // Content structure
  content: {
    text: string;
    html: string;
    media: MediaContent[];
    links: LinkPreview[];
    mentions: Mention[];
    hashtags: string[];
    quotedReferences: QuotedReference[];
  };

  // Original event reference
  rawEvent: NostrEvent;

  // Quoted event (for quote posts)
  quotedEvent?: ProcessedNote;
}

export interface MediaContent {
  type: 'image' | 'video' | 'audio';
  url: string;
  alt?: string;
  thumbnail?: string;
  dimensions?: { width: number; height: number };
}

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  domain: string;
}

export interface Mention {
  pubkey: string;
  displayText: string;
  profile?: {
    name?: string;
    display_name?: string;
    picture?: string;
  };
}

export interface QuotedReference {
  type: 'event' | 'note' | 'addr';
  id: string;
  fullMatch: string;
  quotedNote?: ProcessedNote; // The quoted note if we can fetch it
}

export class NoteContentProcessing {
  private static instance: NoteContentProcessing;
  private userProfileService: UserProfileService;
  private profileCache: Map<string, any> = new Map(); // Simple cache for profiles

  private constructor() {
    this.userProfileService = UserProfileService.getInstance();
  }

  public static getInstance(): NoteContentProcessing {
    if (!NoteContentProcessing.instance) {
      NoteContentProcessing.instance = new NoteContentProcessing();
    }
    return NoteContentProcessing.instance;
  }

  /**
   * Main processing entry point - processes any note type
   */
  public async processNote(event: NostrEvent): Promise<ProcessedNote> {

    try {
      switch (event.kind) {
        case 1:
          return await this.processTextNote(event);
        case 6:
          return await this.processRepost(event);
        default:
          console.warn(`⚠️ Unsupported note kind: ${event.kind}`);
          return await this.processTextNote(event); // Fallback to text note
      }
    } catch (error) {
      console.error(`❌ ERROR processing note ${event.id.slice(0, 8)}:`, error);
      // Return a basic processed note as fallback
      return {
        id: event.id,
        type: 'original',
        timestamp: event.created_at,
        author: { pubkey: event.pubkey },
        content: {
          text: event.content,
          html: event.content.replace(/\n/g, '<br>'),
          media: [],
          links: [],
          mentions: [],
          hashtags: [],
          quotedReferences: []
        },
        rawEvent: event
      };
    }
  }

  /**
   * Process regular text note (kind 1)
   */
  private async processTextNote(event: NostrEvent): Promise<ProcessedNote> {
    // Load profile non-blocking with fallback
    const authorProfile = this.getNonBlockingProfile(event.pubkey);

    // Check if this is a quote post (has 'q' tags)
    const quoteTags = event.tags.filter(tag => tag[0] === 'q');
    const isQuote = quoteTags.length > 0;

    const processedContent = await this.processContent(event.content);

    const result: ProcessedNote = {
      id: event.id,
      type: isQuote ? 'quote' : 'original',
      timestamp: event.created_at,
      author: {
        pubkey: event.pubkey,
        profile: authorProfile ? {
          name: authorProfile.name,
          display_name: authorProfile.display_name,
          picture: authorProfile.picture
        } : undefined
      },
      content: processedContent,
      rawEvent: event
    };

    // If it's a quote, try to fetch the quoted event
    if (isQuote && quoteTags[0] && quoteTags[0][1]) {
      // TODO: Implement quoted event fetching
      // console.log(`📝 Quote detected: ${quoteTags[0][1].slice(0, 8)}`);
    }

    return result;
  }

  /**
   * Process repost (kind 6)
   */
  private async processRepost(event: NostrEvent): Promise<ProcessedNote> {
    const reposterProfile = this.getNonBlockingProfile(event.pubkey);

    // Extract original event info from tags
    const originalEventId = this.extractOriginalEventId(event);
    const originalAuthorPubkey = this.extractOriginalAuthorPubkey(event);

    console.log(`🔄 REPOST: ${event.pubkey.slice(0, 8)} reposted ${originalEventId?.slice(0, 8)} by ${originalAuthorPubkey?.slice(0, 8)}`);

    let originalAuthorProfile;
    if (originalAuthorPubkey) {
      originalAuthorProfile = this.getNonBlockingProfile(originalAuthorPubkey);
    }

    // Try to parse original event from content
    let originalContent = 'Reposted content';
    try {
      if (event.content && event.content.trim()) {
        const originalEvent = JSON.parse(event.content);
        if (originalEvent.content) {
          originalContent = originalEvent.content;
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not parse repost content as JSON');
    }

    const processedContent = await this.processContent(originalContent);

    return {
      id: event.id,
      type: 'repost',
      timestamp: event.created_at,
      author: originalAuthorPubkey ? {
        pubkey: originalAuthorPubkey,
        profile: originalAuthorProfile ? {
          name: originalAuthorProfile.name,
          display_name: originalAuthorProfile.display_name,
          picture: originalAuthorProfile.picture
        } : undefined
      } : {
        pubkey: event.pubkey,
        profile: reposterProfile ? {
          name: reposterProfile.name,
          display_name: reposterProfile.display_name,
          picture: reposterProfile.picture
        } : undefined
      },
      reposter: {
        pubkey: event.pubkey,
        profile: reposterProfile ? {
          name: reposterProfile.name,
          display_name: reposterProfile.display_name,
          picture: reposterProfile.picture
        } : undefined
      },
      content: processedContent,
      rawEvent: event
    };
  }

  /**
   * Process content text into structured format
   */
  private async processContent(text: string): Promise<ProcessedNote['content']> {
    const media = extractMedia(text);
    const links = extractLinks(text);
    const mentions = await this.extractMentions(text); // Still uses instance method (needs profile cache)
    const hashtags = extractHashtags(text);
    const quotedRefs = extractQuotedReferences(text);

    // Convert quoted references to full objects
    const quotedReferences: QuotedReference[] = quotedRefs.map(ref => ({
      type: ref.type as 'event' | 'note' | 'addr',
      id: ref.id,
      fullMatch: ref.fullMatch
      // quotedNote will be fetched later if needed
    }));

    // Remove media URLs from text since they will be rendered separately
    let cleanedText = text;
    media.forEach(item => {
      cleanedText = cleanedText.replace(item.url, '');
    });

    // Remove quoted references from text since they will be rendered separately
    quotedReferences.forEach(ref => {
      cleanedText = cleanedText.replace(ref.fullMatch, '');
    });

    // Clean up multiple consecutive line breaks (more than 2)
    cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n');
    cleanedText = cleanedText.trim();

    // Use formatContent utility from contentFormatters
    const html = formatContent(cleanedText, mentions, hashtags, quotedReferences);

    return {
      text,
      html,
      media,
      links,
      mentions,
      hashtags,
      quotedReferences
    };
  }

  /**
   * Extract mentions (npub, hex pubkeys) with profile resolution
   * Uses extractNpubMentions() helper then resolves profiles from cache
   */
  private async extractMentions(text: string): Promise<Mention[]> {
    const mentions: Mention[] = [];
    const npubs = extractNpubMentions(text);

    for (const npub of npubs) {
      // TODO: Convert npub to hex pubkey
      const pubkey = npub; // Placeholder - need bech32 decoding
      const profile = this.getNonBlockingProfile(pubkey);

      mentions.push({
        pubkey: pubkey,
        displayText: npub,
        profile: profile ? {
          name: profile.name,
          display_name: profile.display_name,
          picture: profile.picture
        } : undefined
      });
    }

    return mentions;
  }

  /**
   * Extract original event ID from repost tags
   */
  private extractOriginalEventId(event: NostrEvent): string | null {
    const eTags = event.tags.filter(tag => tag[0] === 'e');
    return eTags.length > 0 ? eTags[0][1] : null;
  }

  /**
   * Extract original author pubkey from repost tags
   */
  private extractOriginalAuthorPubkey(event: NostrEvent): string | null {
    const pTags = event.tags.filter(tag => tag[0] === 'p');
    return pTags.length > 0 ? pTags[0][1] : null;
  }

  /**
   * Get profile non-blocking with immediate fallback
   */
  private getNonBlockingProfile(pubkey: string): any {
    // Check cache first
    if (this.profileCache.has(pubkey)) {
      return this.profileCache.get(pubkey);
    }

    // Create fallback profile immediately
    const fallbackProfile = {
      pubkey,
      name: pubkey.slice(0, 8) + '...',
      display_name: null,
      picture: '', // Will use DiceBear fallback in UI
      about: null
    };

    // Cache the fallback
    this.profileCache.set(pubkey, fallbackProfile);

    // Load real profile in background (non-blocking)
    this.userProfileService.getUserProfile(pubkey)
      .then(realProfile => {
        if (realProfile) {
          this.profileCache.set(pubkey, realProfile);
          // TODO: Could trigger UI update here if needed
        }
      })
      .catch(error => {
        console.warn(`Profile load failed for ${pubkey.slice(0, 8)}:`, error);
      });

    return fallbackProfile;
  }
}