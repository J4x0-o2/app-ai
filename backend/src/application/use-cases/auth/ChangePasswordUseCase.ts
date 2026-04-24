import { UserRepository } from '../../../domain/repositories/UserRepository';
import { IPasswordHasher } from '../../../infrastructure/security/PasswordHasher';
import { ApplicationError } from '../../../shared/errors/errors';

export class ChangePasswordUseCase {
    constructor(
        private userRepository: UserRepository,
        private passwordHasher: IPasswordHasher,
    ) {}

    async execute(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        if (!newPassword || newPassword.length < 8) {
            throw new ApplicationError('La contraseña debe tener al menos 8 caracteres', 'VALIDATION_ERROR');
        }

        const currentHash = await this.userRepository.findPasswordHash(userId);
        if (!currentHash) {
            throw new ApplicationError('Usuario no encontrado', 'NOT_FOUND');
        }

        const isValid = await this.passwordHasher.compare(currentPassword, currentHash);
        if (!isValid) {
            throw new ApplicationError('La contraseña actual es incorrecta', 'AUTH_FAILED');
        }

        const newHash = await this.passwordHasher.hash(newPassword);
        await this.userRepository.updatePassword(userId, newHash);
    }
}
