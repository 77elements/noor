/**
 * InteractionStatsService
 * Thin wrapper around ReactionsOrchestrator for backwards compatibility
 * All logic now in ReactionsOrchestrator
 */

import { ReactionsOrchestrator } from './orchestration/ReactionsOrchestrator';

export interface InteractionStats {
  replies: number;
  reposts: number;      // Regular reposts (kind 6 without 'q' tag)
  quotedReposts: number; // Quoted reposts (kind 6 with 'q' tag)
  likes: number;         // Reactions (kind 7 with content '+')
  zaps: number;          // Zap receipts (kind 9735)
  lastUpdated: number;
}

export class InteractionStatsService {
  private static instance: InteractionStatsService;
  private orchestrator: ReactionsOrchestrator;

  private constructor() {
    this.orchestrator = ReactionsOrchestrator.getInstance();
  }

  public static getInstance(): InteractionStatsService {
    if (!InteractionStatsService.instance) {
      InteractionStatsService.instance = new InteractionStatsService();
    }
    return InteractionStatsService.instance;
  }

  /**
   * Get stats for a note (delegates to ReactionsOrchestrator)
   */
  public async getStats(noteId: string): Promise<InteractionStats> {
    return this.orchestrator.getStats(noteId);
  }

  /**
   * Clear cached stats for a note
   */
  public clearCache(noteId: string): void {
    this.orchestrator.clearCache(noteId);
  }

  /**
   * Clear all cached stats
   */
  public clearAllCache(): void {
    this.orchestrator.clearAllCache();
  }
}
