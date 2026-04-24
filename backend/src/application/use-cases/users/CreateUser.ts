import { UserRepository } from '../../../domain/repositories/UserRepository';
import { IEmailService } from '../../../domain/services/IEmailService';
import { IPasswordHasher } from '../../../infrastructure/security/PasswordHasher';
import { User } from '../../../domain/entities/User';
import { CreateUserRequest, UserResponse, toUserResponse } from '../../dto/UserDTO';
import { ApplicationError } from '../../../shared/errors/errors';
import { randomUUID } from 'crypto';

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';

function generatePassword(length = 12): string {
    let password = '';
    for (let i = 0; i < length; i++) {
        password += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)];
    }
    return password;
}

export class CreateUser {
    constructor(
        private userRepository: UserRepository,
        private passwordHasher: IPasswordHasher,
        private emailService: IEmailService,
    ) { }

    async execute(request: CreateUserRequest): Promise<UserResponse> {
        if (!request.email || !request.name || !request.lastName || !request.role || !request.creatorId) {
            throw new ApplicationError('Missing required fields', 'VALIDATION_ERROR');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(request.email)) {
            throw new ApplicationError('Invalid email format', 'VALIDATION_ERROR');
        }

        const existingUser = await this.userRepository.findByEmail(request.email);
        if (existingUser) {
            throw new ApplicationError('Email already in use', 'CONFLICT');
        }

        const tempPassword = generatePassword();
        const passwordHash = await this.passwordHasher.hash(tempPassword);

        const user = new User(
            randomUUID(),
            request.name,
            request.lastName,
            request.email,
            request.role,
            new Date(),
            request.creatorId,
            request.phone,
            request.cargo,
        );

        await this.userRepository.save(user, passwordHash);

        await this.emailService.sendWelcomeEmail(user.email, user.name, tempPassword);

        return { ...toUserResponse(user), generatedPassword: tempPassword };
    }
}
