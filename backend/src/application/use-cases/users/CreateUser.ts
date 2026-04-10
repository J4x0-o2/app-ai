import { UserRepository } from '../../../domain/repositories/UserRepository';
import { User } from '../../../domain/entities/User';
import { CreateUserRequest, UserResponse, toUserResponse } from '../../dto/UserDTO';
import { ApplicationError } from '../../../shared/errors/errors';
import { randomUUID } from 'crypto';

export class CreateUser {
    constructor(private userRepository: UserRepository) { }

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

        await this.userRepository.save(user);
        return toUserResponse(user);
    }
}
