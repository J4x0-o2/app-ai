import { FastifyRequest, FastifyReply } from 'fastify';
import { LoginUserUseCase } from '../../../application/use-cases/auth/LoginUserUseCase';
import { LoginRequest } from '../../../application/dto/AuthDTO';
import { ApplicationError } from '../../../shared/errors/errors';

export class LoginController {
    constructor(private loginUserUseCase: LoginUserUseCase) {}

    async login(request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) {
        try {
            const body = request.body;
            // The Fastify route should ideally validate payload schemas too,
            // but the use case also has fallback validations.
            const result = await this.loginUserUseCase.execute(body);

            return reply.status(200).send(result);
        } catch (error: any) {
            if (error instanceof ApplicationError && error.code === 'AUTH_FAILED') {
                return reply.status(401).send({ error: error.message });
            }
            if (error instanceof ApplicationError && error.code === 'VALIDATION_ERROR') {
                return reply.status(400).send({ error: error.message });
            }
            // Propagate generic errors to the global error handler
            throw error;
        }
    }
}
