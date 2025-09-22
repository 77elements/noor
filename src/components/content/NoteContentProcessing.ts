/**
 * Note Content Processing
 * Processes all note types and content into structured, renderable format
 * Handles reposts, quotes, media, links, and rich text formatting
 */

import type { Event as NostrEvent } from 'nostr-tools';
import { UserProfileService } from '../../services/UserProfileService';

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

export class NoteContentProcessing {
  private static instance: NoteContentProcessing;
  private userProfileService: UserProfileService;

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
    console.log(`🔄 PROCESSING NOTE: kind ${event.kind}, id ${event.id.slice(0, 8)}`);

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
          hashtags: []
        },
        rawEvent: event
      };
    }
  }

  /**
   * Process regular text note (kind 1)
   */
  private async processTextNote(event: NostrEvent): Promise<ProcessedNote> {
    const authorProfile = await this.userProfileService.getUserProfile(event.pubkey);

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
      console.log(`📝 Quote detected: ${quoteTags[0][1].slice(0, 8)}`);
    }

    return result;
  }

  /**
   * Process repost (kind 6)
   */
  private async processRepost(event: NostrEvent): Promise<ProcessedNote> {
    const reposterProfile = await this.userProfileService.getUserProfile(event.pubkey);

    // Extract original event info from tags
    const originalEventId = this.extractOriginalEventId(event);
    const originalAuthorPubkey = this.extractOriginalAuthorPubkey(event);

    console.log(`🔄 REPOST: ${event.pubkey.slice(0, 8)} reposted ${originalEventId?.slice(0, 8)} by ${originalAuthorPubkey?.slice(0, 8)}`);

    let originalAuthorProfile;
    if (originalAuthorPubkey) {
      originalAuthorProfile = await this.userProfileService.getUserProfile(originalAuthorPubkey);
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
    const media = this.extractMedia(text);
    const links = this.extractLinks(text);
    const mentions = await this.extractMentions(text);
    const hashtags = this.extractHashtags(text);

    // Create HTML version with processing
    let html = this.escapeHtml(text);
    html = this.linkifyUrls(html);
    html = this.formatMentions(html, mentions);
    html = this.formatHashtags(html, hashtags);
    html = html.replace(/\n/g, '<br>');

    return {
      text,
      html,
      media,
      links,
      mentions,
      hashtags
    };
  }

  /**
   * Extract media URLs from content
   */
  private extractMedia(text: string): MediaContent[] {
    const media: MediaContent[] = [];

    // Image patterns
    const imageRegex = /https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s]*)?/gi;
    const images = text.match(imageRegex) || [];

    images.forEach(url => {
      media.push({
        type: 'image',
        url: url
      });
    });

    // Video patterns
    const videoRegex = /https?:\/\/[^\s]+\.(?:mp4|webm|mov|avi)(?:\?[^\s]*)?/gi;
    const videos = text.match(videoRegex) || [];

    videos.forEach(url => {
      media.push({
        type: 'video',
        url: url
      });
    });

    // YouTube detection
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/gi;
    let match;
    while ((match = youtubeRegex.exec(text)) !== null) {
      media.push({
        type: 'video',
        url: match[0],
        thumbnail: `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`
      });
    }

    return media;
  }

  /**
   * Extract and categorize links
   */
  private extractLinks(text: string): LinkPreview[] {
    const links: LinkPreview[] = [];
    const urlRegex = /https?:\/\/[^\s]+/gi;
    const urls = text.match(urlRegex) || [];

    urls.forEach(url => {
      try {
        const parsed = new URL(url);
        links.push({
          url: url,
          domain: parsed.hostname
        });
      } catch (error) {
        console.warn('Invalid URL:', url);
      }
    });

    return links;
  }

  /**
   * Extract mentions (npub, hex pubkeys)
   */
  private async extractMentions(text: string): Promise<Mention[]> {
    const mentions: Mention[] = [];

    // npub mentions
    const npubRegex = /npub1[a-z0-9]{58}/gi;
    const npubs = text.match(npubRegex) || [];

    for (const npub of npubs) {
      // TODO: Convert npub to hex pubkey
      const pubkey = npub; // Placeholder - need bech32 decoding
      const profile = await this.userProfileService.getUserProfile(pubkey);

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
   * Extract hashtags
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const hashtags = text.match(hashtagRegex) || [];
    return hashtags.map(tag => tag.slice(1)); // Remove # prefix
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
   * Escape HTML entities
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Convert URLs to clickable links
   */
  private linkifyUrls(html: string): string {
    const urlRegex = /(https?:\/\/[^\s<]+)/gi;
    return html.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  /**
   * Format mentions as clickable elements
   */
  private formatMentions(html: string, mentions: Mention[]): string {
    mentions.forEach(mention => {
      const displayName = mention.profile?.display_name || mention.profile?.name || mention.displayText;
      html = html.replace(
        new RegExp(mention.displayText, 'g'),
        `<span class="mention" data-pubkey="${mention.pubkey}">@${displayName}</span>`
      );
    });
    return html;
  }

  /**
   * Format hashtags as clickable elements
   */
  private formatHashtags(html: string, hashtags: string[]): string {
    hashtags.forEach(tag => {
      html = html.replace(
        new RegExp(`#${tag}`, 'g'),
        `<span class="hashtag" data-tag="${tag}">#${tag}</span>`
      );
    });
    return html;
  }
}