import { UserRepository } from '../../domain/repositories/UserRepository';
import { ApplicationError } from '../../shared/errors/errors';

export class UpdateProfilePhoto {
    constructor(private userRepository: UserRepository) { }

    async execute(userId: string, photoUrlOrPath: string): Promise<void> {
        if (!photoUrlOrPath) {
            throw new ApplicationError('Invalid photo url', 'VALIDATION_ERROR');
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new ApplicationError('User not found', 'NOT_FOUND');
        }

        user.profilePhotoUrl = photoUrlOrPath;
        await this.userRepository.update(user);
    }
}
