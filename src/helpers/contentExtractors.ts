/**
 * Content Extraction Utilities
 * Pure functions for extracting structured data from text content
 * Reusable for search indexing, content analysis, notifications, etc.
 */

import type { MediaContent, LinkPreview } from '../components/content/NoteContentProcessing';

/**
 * Extract media URLs from content (images, videos, YouTube)
 */
export function extractMedia(text: string): MediaContent[] {
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
 * Extract and categorize links from content
 */
export function extractLinks(text: string): LinkPreview[] {
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
 * Extract quoted nostr references from content
 * Handles all quote types: nostr:event, nostr:note, nostr:nevent, nostr:addr
 */
export function extractQuotedReferences(text: string): { type: string; id: string; fullMatch: string }[] {
  const quotes: { type: string; id: string; fullMatch: string }[] = [];

  // Single regex to catch all nostr references (event, note, nevent, addr)
  const nostrRegex = /nostr:(event1[a-z0-9]{58}|note1[a-z0-9]{58}|nevent1[a-z0-9]+|addr1[a-z0-9]+)/gi;
  const matches = text.match(nostrRegex) || [];

  matches.forEach(match => {
    // Determine type from the match
    let type = 'unknown';
    if (match.includes('event1')) type = 'event';
    else if (match.includes('note1')) type = 'note';
    else if (match.includes('nevent1')) type = 'nevent';
    else if (match.includes('addr1')) type = 'addr';

    quotes.push({
      type,
      id: match, // Keep full reference for fetching
      fullMatch: match
    });
  });

  return quotes;
}

/**
 * Extract hashtags from content
 */
export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  const hashtags = text.match(hashtagRegex) || [];
  return hashtags.map(tag => tag.slice(1)); // Remove # prefix
}

/**
 * Extract npub mentions from content (returns raw npub strings)
 * Note: Profile resolution should be handled separately by the calling code
 */
export function extractNpubMentions(text: string): string[] {
  const npubRegex = /npub1[a-z0-9]{58}/gi;
  return text.match(npubRegex) || [];
}