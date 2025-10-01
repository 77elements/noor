/**
 * Get profile picture URL for a pubkey
 * Uses UserProfileService with fallback to generated avatar
 */

import { UserProfileService } from '../services/UserProfileService';
import { generateFallbackAvatar } from './generateFallbackAvatar';

/**
 * Get profile picture URL for a pubkey
 * @param pubkey - Hex pubkey
 * @returns Profile picture URL or fallback data URL
 */
export async function getProfilePicture(pubkey: string): Promise<string> {
  try {
    const profileService = UserProfileService.getInstance();
    const profile = await profileService.getUserProfile(pubkey);

    if (profile?.picture) {
      return profile.picture;
    }

    // No picture in profile, generate fallback
    return generateFallbackAvatar(pubkey);
  } catch (error) {
    // Error fetching profile, use fallback
    return generateFallbackAvatar(pubkey);
  }
}
