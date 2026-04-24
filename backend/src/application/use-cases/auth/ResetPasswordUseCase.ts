import { IPasswordResetTokenRepository } from '../../../domain/repositories/IPasswordResetTokenRepository';
import { UserRepository } from '../../../domain/repositories/UserRepository';
import { IPasswordHasher } from '../../../infrastructure/security/PasswordHasher';
import { ApplicationError } from '../../../shared/errors/errors';

export class ResetPasswordUseCase {
    constructor(
        private tokenRepository: IPasswordResetTokenRepository,
        private userRepository: UserRepository,
        private passwordHasher: IPasswordHasher,
    ) { }

    async execute(token: string, newPassword: string): Promise<void> {
        if (!newPassword || newPassword.length < 8) {
            throw new ApplicationError('La contraseña debe tener al menos 8 caracteres', 'VALIDATION_ERROR');
        }

        const resetToken = await this.tokenRepository.findByToken(token);

        if (!resetToken) {
            throw new ApplicationError('Token inválido', 'INVALID_TOKEN');
        }

        if (resetToken.isUsed()) {
            throw new ApplicationError('Este enlace ya fue utilizado', 'TOKEN_ALREADY_USED');
        }

        if (resetToken.isExpired()) {
            throw new ApplicationError('El enlace ha expirado', 'TOKEN_EXPIRED');
        }

        const user = await this.userRepository.findById(resetToken.userId);
        if (!user) {
            throw new ApplicationError('Usuario no encontrado', 'NOT_FOUND');
        }

        const passwordHash = await this.passwordHasher.hash(newPassword);
        await this.userRepository.updatePassword(user.id, passwordHash);
        await this.tokenRepository.markAsUsed(token);
    }
}
