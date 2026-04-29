import { randomBytes, randomUUID } from 'crypto';
import { IRefreshTokenRepository } from '../../../domain/repositories/IRefreshTokenRepository';
import { RefreshToken } from '../../../domain/entities/RefreshToken';
import { UserRepository } from '../../../domain/repositories/UserRepository';
import { IJwtService } from '../../../infrastructure/security/JwtService';
import { ApplicationError } from '../../../shared/errors/errors';

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export class RefreshTokenUseCase {
    constructor(
        private refreshTokenRepository: IRefreshTokenRepository,
        private userRepository: UserRepository,
        private jwtService: IJwtService,
    ) {}

    async execute(rawToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        const tokenEntity = await this.refreshTokenRepository.findByToken(rawToken);

        if (!tokenEntity || !tokenEntity.isValid()) {
            throw new ApplicationError('Invalid or expired refresh token', 'AUTH_FAILED');
        }

        const user = await this.userRepository.findById(tokenEntity.userId);
        if (!user) {
            throw new ApplicationError('User not found', 'AUTH_FAILED');
        }

        // Rotate: revoke old token
        await this.refreshTokenRepository.revoke(rawToken);

        // Generate new access token
        const accessToken = this.jwtService.generateToken({
            userId: user.id,
            email: user.email,
        });

        // Generate new refresh token
        const newRawToken = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        await this.refreshTokenRepository.save(
            new RefreshToken(randomUUID(), user.id, newRawToken, expiresAt, new Date()),
        );

        return { accessToken, refreshToken: newRawToken };
    }
}
