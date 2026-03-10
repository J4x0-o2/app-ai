import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticateUser } from '../../application/useCases/AuthenticateUser';
import { LoginRequest } from '../../application/dto/AuthDTO';

export class AuthController {
    constructor(private authenticateUser: AuthenticateUser) { }

    async login(request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) {
        const result = await this.authenticateUser.execute(request.body);
        return reply.status(200).send(result);
    }
}
