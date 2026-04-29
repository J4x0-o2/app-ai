import cron from 'node-cron';
import prisma from '../database/prismaClient';

export function startRefreshTokenCleanupJob(): void {
  // Runs every day at 3:00 AM server time.
  cron.schedule('0 3 * * *', async () => {
    const now = new Date();

    // Delete refresh tokens that are expired OR revoked — both are permanently unusable
    try {
      const tokenResult = await prisma.refresh_tokens.deleteMany({
        where: {
          OR: [
            { expires_at: { lt: now } },
            { revoked_at: { not: null } },
          ],
        },
      });
      console.log(`[RefreshTokenCleanup] Deleted ${tokenResult.count} stale tokens`);
    } catch (error) {
      console.error('[RefreshTokenCleanup] Failed:', error);
    }

    // Delete expired semantic cache entries
    try {
      const cacheResult = await prisma.ai_response_cache.deleteMany({
        where: { expires_at: { lt: now } },
      });
      console.log(`[SemanticCacheCleanup] Deleted ${cacheResult.count} expired entries`);
    } catch (error) {
      console.error('[SemanticCacheCleanup] Failed:', error);
    }
  });

  console.log('[Cleanup] Scheduled — daily at 03:00 (refresh_tokens + semantic cache)');
}
