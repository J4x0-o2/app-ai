import { randomBytes, randomUUID } from 'crypto';
import { AuthProvider } from '../../domain/services/AuthProvider';
import { IAuthRepository } from '../repositories/PrismaAuthRepository';
import { IPasswordHasher } from '../security/PasswordHasher';
import { IJwtService } from '../security/JwtService';
import { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import { RefreshToken } from '../../domain/entities/RefreshToken';
import { ApplicationError } from '../../shared/errors/errors';
import { LoginRequest, LoginResponse } from '../../application/dto/AuthDTO';

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export class DatabaseAuthProvider implements AuthProvider {
    constructor(
        private authRepository: IAuthRepository,
        private passwordHasher: IPasswordHasher,
        private jwtService: IJwtService,
        private refreshTokenRepository: IRefreshTokenRepository,
    ) {}

    async authenticate(request: LoginRequest): Promise<LoginResponse> {
        if (!request.email || !request.password) {
            throw new ApplicationError('Email and password must be provided', 'VALIDATION_ERROR');
        }

        const user = await this.authRepository.findByEmail(request.email);

        if (!user) {
            throw new ApplicationError('Invalid credentials', 'AUTH_FAILED');
        }

        if (!user.isActive) {
            throw new ApplicationError('User is deactivated', 'AUTH_FAILED');
        }

        const isPasswordValid = await this.passwordHasher.compare(request.password, user.passwordHash);

        if (!isPasswordValid) {
            throw new ApplicationError('Invalid credentials', 'AUTH_FAILED');
        }

        const accessToken = this.jwtService.generateToken({
            userId: user.id,
            email: user.email,
            roles: user.roles,
        });

        const rawRefreshToken = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

        const refreshTokenEntity = new RefreshToken(
            randomUUID(),
            user.id,
            rawRefreshToken,
            expiresAt,
            new Date(),
        );
        await this.refreshTokenRepository.save(refreshTokenEntity);

        return {
            token: accessToken,
            refreshToken: rawRefreshToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.roles.length > 0 ? (user.roles[0] as any) : 'EMPLEADO',
                permissions: [],
                profilePhotoUrl: user.profilePhotoUrl,
                mustChangePassword: user.mustChangePassword,
                createdAt: user.createdAt,
            },
        };
    }
}
