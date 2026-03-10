import { UserRepository } from '../../domain/repositories/UserRepository';
import { AuthorizationService } from '../../domain/services/AuthorizationService';
import { LoginRequest, LoginResponse } from '../dto/AuthDTO';
import { ApplicationError } from '../../shared/errors/errors';
import { Action } from '../../shared/types/roles';

export class AuthenticateUser {
    constructor(private userRepository: UserRepository) { }

    async execute(request: LoginRequest): Promise<LoginResponse> {
        const user = await this.userRepository.findByEmail(request.email);
        if (!user) {
            throw new ApplicationError('Invalid credentials or user not found', 'AUTH_FAILED');
        }

        // Note: Mocking password logic for now

        const token = `mock_token_for_${user.id}`;

        const allActions = Object.values(Action);
        const permissions = allActions.filter(action => AuthorizationService.canPerformAction(user.role, action));

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                permissions
            }
        };
    }
}
