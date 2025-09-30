/**
 * Render media content (images, videos) to HTML
 * Single purpose: MediaContent[] → HTML string
 *
 * @param media - Array of MediaContent objects
 * @returns HTML string with rendered media elements
 *
 * @example
 * renderMediaContent([{ type: 'image', url: 'https://example.com/img.jpg' }])
 * // => '<div class="note-media"><img src="..." class="note-image" loading="lazy"></div>'
 */

export interface MediaContent {
  type: 'image' | 'video' | 'audio';
  url: string;
  alt?: string;
  thumbnail?: string;
  dimensions?: { width: number; height: number };
}

export function renderMediaContent(media: MediaContent[]): string {
  if (media.length === 0) return '';

  const mediaHtml = media.map(item => {
    switch (item.type) {
      case 'image':
        return `<img src="${item.url}" alt="${item.alt || ''}" class="note-image" loading="lazy">`;
      case 'video':
        if (item.thumbnail) {
          // YouTube or video with thumbnail
          return `
            <div class="note-video">
              <img src="${item.thumbnail}" alt="Video thumbnail" class="video-thumbnail">
              <a href="${item.url}" target="_blank" class="video-link">▶️ Watch Video</a>
            </div>
          `;
        } else {
          return `<video src="${item.url}" controls class="note-video" preload="metadata"></video>`;
        }
      default:
        return '';
    }
  }).join('');

  return `<div class="note-media">${mediaHtml}</div>`;
}