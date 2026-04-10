import { UserRepository } from '../../../domain/repositories/UserRepository';
import { ApplicationError } from '../../../shared/errors/errors';

export class DeleteUser {
    constructor(private userRepository: UserRepository) { }

    async execute(userId: string): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new ApplicationError('User not found', 'NOT_FOUND');
        }
        await this.userRepository.delete(userId);
    }
}
