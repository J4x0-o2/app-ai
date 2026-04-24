import { FastifyRequest, FastifyReply } from 'fastify';
import { RequestPasswordResetUseCase } from '../../../application/use-cases/auth/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from '../../../application/use-cases/auth/ResetPasswordUseCase';
import { ApplicationError } from '../../../shared/errors/errors';

export class PasswordResetController {
    constructor(
        private requestReset: RequestPasswordResetUseCase,
        private resetPassword: ResetPasswordUseCase,
    ) { }

    async requestResetHandler(
        request: FastifyRequest<{ Body: { email: string } }>,
        reply: FastifyReply,
    ) {
        await this.requestReset.execute(request.body.email ?? '');
        // Respuesta siempre igual: no revelar si el correo existe
        return reply.status(200).send({ message: 'Si el correo está registrado, recibirás un enlace en breve.' });
    }

    async resetPasswordHandler(
        request: FastifyRequest<{ Body: { token: string; password: string } }>,
        reply: FastifyReply,
    ) {
        try {
            await this.resetPassword.execute(request.body.token, request.body.password);
            return reply.status(200).send({ message: 'Contraseña actualizada correctamente.' });
        } catch (error: any) {
            if (error instanceof ApplicationError) {
                const statusMap: Record<string, number> = {
                    VALIDATION_ERROR: 400,
                    INVALID_TOKEN: 400,
                    TOKEN_ALREADY_USED: 400,
                    TOKEN_EXPIRED: 400,
                    NOT_FOUND: 404,
                };
                const status = statusMap[error.code] ?? 500;
                return reply.status(status).send({ error: error.message });
            }
            throw error;
        }
    }
}
