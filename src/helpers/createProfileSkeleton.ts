/**
 * Create skeleton loader for profile picture
 * Single purpose: Generate skeleton HTML for avatar loading state
 *
 * @param size - Size variant: 'small' | 'medium' | 'large'
 * @returns HTMLElement skeleton
 *
 * @example
 * const skeleton = createProfileSkeleton('medium');
 * avatarContainer.appendChild(skeleton);
 * // Later: skeleton.replaceWith(actualImage);
 */

export function createProfileSkeleton(size: 'small' | 'medium' | 'large' = 'medium'): HTMLElement {
  const skeleton = document.createElement('div');
  skeleton.className = `profile-skeleton profile-skeleton--${size}`;

  return skeleton;
}
