import { AuthProvider } from '../../domain/services/AuthProvider';
import { IAuthRepository } from '../repositories/PrismaAuthRepository';
import { IPasswordHasher } from '../security/PasswordHasher';
import { IJwtService } from '../security/JwtService';
import { ApplicationError } from '../../shared/errors/errors';
import { LoginRequest, LoginResponse } from '../../application/dto/AuthDTO';

export class DatabaseAuthProvider implements AuthProvider {
    constructor(
        private authRepository: IAuthRepository,
        private passwordHasher: IPasswordHasher,
        private jwtService: IJwtService
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

        const token = this.jwtService.generateToken({
            userId: user.id,
            email: user.email,
            roles: user.roles
        });

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.roles.length > 0 ? (user.roles[0] as any) : 'EMPLEADO',
                permissions: [] // Default or resolve via AuthorizationService later
            }
        };
    }
}
