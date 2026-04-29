import prisma from '../database/prismaClient';
import { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import { RefreshToken } from '../../domain/entities/RefreshToken';

export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
    async save(token: RefreshToken): Promise<void> {
        await prisma.refresh_tokens.create({
            data: {
                id: token.id,
                user_id: token.userId,
                token: token.token,
                expires_at: token.expiresAt,
                created_at: token.createdAt,
            },
        });
    }

    async findByToken(token: string): Promise<RefreshToken | null> {
        const rec = await prisma.refresh_tokens.findUnique({
            where: { token },
        });
        if (!rec) return null;
        return new RefreshToken(
            rec.id,
            rec.user_id,
            rec.token,
            rec.expires_at,
            rec.created_at,
            rec.revoked_at,
        );
    }

    async revoke(token: string): Promise<void> {
        await prisma.refresh_tokens.update({
            where: { token },
            data: { revoked_at: new Date() },
        });
    }

    async revokeAllForUser(userId: string): Promise<void> {
        await prisma.refresh_tokens.updateMany({
            where: { user_id: userId, revoked_at: null },
            data: { revoked_at: new Date() },
        });
    }
}
