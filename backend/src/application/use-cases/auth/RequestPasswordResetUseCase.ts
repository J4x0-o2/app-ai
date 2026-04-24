import { randomBytes, randomUUID } from 'crypto';
import { UserRepository } from '../../../domain/repositories/UserRepository';
import { IPasswordResetTokenRepository } from '../../../domain/repositories/IPasswordResetTokenRepository';
import { IEmailService } from '../../../domain/services/IEmailService';
import { PasswordResetToken } from '../../../domain/entities/PasswordResetToken';

const EXPIRY_HOURS = 24;

export class RequestPasswordResetUseCase {
    constructor(
        private userRepository: UserRepository,
        private tokenRepository: IPasswordResetTokenRepository,
        private emailService: IEmailService,
    ) { }

    async execute(email: string): Promise<void> {
        const user = await this.userRepository.findByEmail(email);

        // Respuesta silenciosa si el correo no existe — no revelar si está registrado
        if (!user) return;

        const rawToken = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);

        const resetToken = new PasswordResetToken(
            randomUUID(),
            user.id,
            rawToken,
            expiresAt,
            new Date(),
        );

        await this.tokenRepository.save(resetToken);

        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
        await this.emailService.sendPasswordResetEmail(user.email, user.name, resetLink);
    }
}
