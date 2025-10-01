/**
 * Create skeleton loader for note
 * Single purpose: Generate skeleton HTML for loading state
 *
 * @returns HTMLElement skeleton
 *
 * @example
 * const skeleton = createNoteSkeleton();
 * container.appendChild(skeleton);
 * // Later: skeleton.replaceWith(actualNote);
 */

export function createNoteSkeleton(): HTMLElement {
  const skeleton = document.createElement('div');
  skeleton.className = 'note-skeleton';

  skeleton.innerHTML = `
    <div class="skeleton-header">
      <div class="skeleton-avatar"></div>
      <div class="skeleton-text-group">
        <div class="skeleton-line skeleton-name"></div>
        <div class="skeleton-line skeleton-timestamp"></div>
      </div>
    </div>
    <div class="skeleton-content">
      <div class="skeleton-line skeleton-text-line"></div>
      <div class="skeleton-line skeleton-text-line"></div>
      <div class="skeleton-line skeleton-text-line short"></div>
    </div>
  `;

  return skeleton;
}
