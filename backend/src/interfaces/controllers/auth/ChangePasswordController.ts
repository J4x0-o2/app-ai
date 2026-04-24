import { FastifyRequest, FastifyReply } from 'fastify';
import { ChangePasswordUseCase } from '../../../application/use-cases/auth/ChangePasswordUseCase';
import { ApplicationError } from '../../../shared/errors/errors';

export class ChangePasswordController {
    constructor(private changePasswordUseCase: ChangePasswordUseCase) {}

    async handle(
        request: FastifyRequest<{ Body: { currentPassword: string; newPassword: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const userId = request.user!.userId;
            await this.changePasswordUseCase.execute(
                userId,
                request.body.currentPassword,
                request.body.newPassword,
            );
            return reply.status(200).send({ message: 'Contraseña actualizada correctamente.' });
        } catch (error: any) {
            if (error instanceof ApplicationError) {
                const statusMap: Record<string, number> = {
                    VALIDATION_ERROR: 400,
                    AUTH_FAILED: 401,
                    NOT_FOUND: 404,
                };
                return reply.status(statusMap[error.code] ?? 500).send({ error: error.message });
            }
            throw error;
        }
    }
}
