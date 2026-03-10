import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateUser } from '../../application/useCases/CreateUser';
import { DeleteUser } from '../../application/useCases/DeleteUser';
import { UpdateProfilePhoto } from '../../application/useCases/UpdateProfilePhoto';
import { CreateUserRequest } from '../../application/dto/UserDTO';

export class UserController {
    constructor(
        private createUser: CreateUser,
        private deleteUser: DeleteUser,
        private updateProfilePhoto: UpdateProfilePhoto
    ) { }

    async create(request: FastifyRequest<{ Body: CreateUserRequest }>, reply: FastifyReply) {
        const result = await this.createUser.execute(request.body);
        return reply.status(201).send(result);
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        await this.deleteUser.execute(request.params.id);
        return reply.status(204).send();
    }

    async updatePhoto(request: FastifyRequest<{ Params: { id: string }, Body: { photoUrl: string } }>, reply: FastifyReply) {
        await this.updateProfilePhoto.execute(request.params.id, request.body.photoUrl);
        return reply.status(200).send({ success: true });
    }
}
