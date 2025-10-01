/**
 * Create skeleton loader for media content
 * Single purpose: Generate skeleton HTML for image/video loading state
 *
 * @param type - Media type: 'image' | 'video'
 * @returns HTMLElement skeleton
 *
 * @example
 * const skeleton = createMediaSkeleton('image');
 * mediaContainer.appendChild(skeleton);
 * // Later: skeleton.replaceWith(actualImage);
 */

export function createMediaSkeleton(type: 'image' | 'video' = 'image'): HTMLElement {
  const skeleton = document.createElement('div');
  skeleton.className = `media-skeleton media-skeleton--${type}`;

  if (type === 'video') {
    skeleton.innerHTML = `
      <div class="media-skeleton__play-icon">▶</div>
    `;
  }

  return skeleton;
}
