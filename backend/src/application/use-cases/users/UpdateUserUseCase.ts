import { UserRepository } from '../../../domain/repositories/UserRepository';
import { UpdateUserRequest, UserResponse, toUserResponse } from '../../dto/UserDTO';
import { ApplicationError } from '../../../shared/errors/errors';

export class UpdateUserUseCase {
    constructor(private userRepository: UserRepository) {}

    async execute(id: string, request: UpdateUserRequest): Promise<UserResponse> {
        if (!request.name || !request.lastName || !request.email || !request.role) {
            throw new ApplicationError('Missing required fields', 'VALIDATION_ERROR');
        }

        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new ApplicationError('User not found', 'NOT_FOUND');
        }

        user.name = request.name;
        user.lastName = request.lastName;
        user.email = request.email;
        user.phone = request.phone;
        user.cargo = request.cargo;
        user.role = request.role;

        await this.userRepository.update(user);
        return toUserResponse(user);
    }
}
