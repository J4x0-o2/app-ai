import prisma from '../database/prismaClient';
import { IPasswordResetTokenRepository } from '../../domain/repositories/IPasswordResetTokenRepository';
import { PasswordResetToken } from '../../domain/entities/PasswordResetToken';

export class PrismaPasswordResetTokenRepository implements IPasswordResetTokenRepository {
    async save(token: PasswordResetToken): Promise<void> {
        await prisma.password_reset_tokens.create({
            data: {
                id: token.id,
                user_id: token.userId,
                token: token.token,
                expires_at: token.expiresAt,
                created_at: token.createdAt,
            },
        });
    }

    async findByToken(token: string): Promise<PasswordResetToken | null> {
        const rec = await prisma.password_reset_tokens.findUnique({
            where: { token },
        });
        if (!rec) return null;
        return new PasswordResetToken(
            rec.id,
            rec.user_id,
            rec.token,
            rec.expires_at,
            rec.created_at,
            rec.used_at,
        );
    }

    async markAsUsed(token: string): Promise<void> {
        await prisma.password_reset_tokens.update({
            where: { token },
            data: { used_at: new Date() },
        });
    }
}
