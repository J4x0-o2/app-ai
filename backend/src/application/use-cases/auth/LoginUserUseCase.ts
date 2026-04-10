import { AuthProvider } from '../../../domain/services/AuthProvider';
import { LoginRequest, LoginResponse } from '../../dto/AuthDTO';

export class LoginUserUseCase {
    constructor(
        private authProvider: AuthProvider
    ) { }

    async execute(request: LoginRequest): Promise<LoginResponse> {
        return this.authProvider.authenticate(request);
    }
}
