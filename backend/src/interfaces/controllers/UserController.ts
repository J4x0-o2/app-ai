import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateUser } from '../../application/use-cases/users/CreateUser';
import { DeleteUser } from '../../application/use-cases/users/DeleteUser';
import { UpdateProfilePhoto } from '../../application/use-cases/users/UpdateProfilePhoto';
import { ListUsersUseCase } from '../../application/use-cases/users/ListUsersUseCase';
import { CreateUserRequest } from '../../application/dto/UserDTO';

export class UserController {
    constructor(
        private createUser: CreateUser,
        private deleteUser: DeleteUser,
        private updateProfilePhoto: UpdateProfilePhoto,
        private listUsers: ListUsersUseCase
    ) { }

    async list(_request: FastifyRequest, reply: FastifyReply) {
        const users = await this.listUsers.execute();
        return reply.status(200).send(users);
    }

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
