import { FastifyRequest, FastifyReply } from 'fastify';
import { RefreshTokenUseCase } from '../../../application/use-cases/auth/RefreshTokenUseCase';
import { IRefreshTokenRepository } from '../../../domain/repositories/IRefreshTokenRepository';
import { ApplicationError } from '../../../shared/errors/errors';

export class RefreshTokenController {
    constructor(
        private refreshTokenUseCase: RefreshTokenUseCase,
        private refreshTokenRepository: IRefreshTokenRepository,
    ) {}

    async refresh(request: FastifyRequest<{ Body: { refreshToken: string } }>, reply: FastifyReply) {
        const { refreshToken } = request.body;

        if (!refreshToken) {
            return reply.status(400).send({ error: 'refreshToken is required' });
        }

        try {
            const result = await this.refreshTokenUseCase.execute(refreshToken);
            return reply.status(200).send(result);
        } catch (error) {
            if (error instanceof ApplicationError && error.code === 'AUTH_FAILED') {
                return reply.status(401).send({ error: error.message });
            }
            throw error;
        }
    }

    async logout(request: FastifyRequest, reply: FastifyReply) {
        const userId = request.user!.userId;
        await this.refreshTokenRepository.revokeAllForUser(userId);
        return reply.status(204).send();
    }
}
