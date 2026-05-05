import { FastifyRequest, FastifyReply } from 'fastify';
import { IAuthRepository } from '../../../infrastructure/repositories/PrismaAuthRepository';

export class GetMeController {
    constructor(private authRepository: IAuthRepository) {}

    async handle(request: FastifyRequest, reply: FastifyReply) {
        const userId = request.user!.userId;
        const user = await this.authRepository.findById(userId);

        if (!user || !user.isActive) {
            return reply.status(401).send({ error: 'User not found or inactive' });
        }

        return reply.send({
            user: {
                id: user.id,
                email: user.email,
                role: user.roles[0] ?? 'EMPLEADO',
                permissions: [],
                profilePhotoUrl: user.profilePhotoUrl,
                mustChangePassword: user.mustChangePassword,
                createdAt: user.createdAt,
            },
        });
    }
}
