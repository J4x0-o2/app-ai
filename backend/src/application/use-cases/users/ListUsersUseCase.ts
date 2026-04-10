import { UserRepository } from '../../../domain/repositories/UserRepository';
import { UserResponse, toUserResponse } from '../../dto/UserDTO';

export class ListUsersUseCase {
    constructor(private userRepository: UserRepository) { }

    async execute(): Promise<UserResponse[]> {
        const users = await this.userRepository.findAll();
        return users.map(toUserResponse);
    }
}
