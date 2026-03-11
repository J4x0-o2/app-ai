import { FastifyRequest, FastifyReply } from 'fastify';
import { IJwtService } from '../../infrastructure/security/JwtService';
import { GetUserRolesUseCase } from '../../application/auth/GetUserRolesUseCase';

// Extend FastifyRequest to include user context
declare module 'fastify' {
    interface FastifyRequest {
        user?: {
            userId: string;
            email: string;
            roles: string[];
        };
    }
}

export class AuthMiddleware {
    constructor(
        private jwtService: IJwtService,
        private getUserRolesUseCase: GetUserRolesUseCase
    ) {}

    handle = async (request: FastifyRequest, reply: FastifyReply) => {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.status(401).send({ error: 'Missing or malformed Authorization header' });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = this.jwtService.verifyToken(token);
            
            // Consult fresh roles from database to ensure up-to-date authorization
            const roles = await this.getUserRolesUseCase.execute(decoded.userId);

            // Attach the payload and fresh roles to the request for subsequent handlers
            request.user = {
                userId: decoded.userId,
                email: decoded.email,
                roles: roles
            };
        } catch (error) {
            return reply.status(401).send({ error: 'Invalid or expired token' });
        }
    };
}
