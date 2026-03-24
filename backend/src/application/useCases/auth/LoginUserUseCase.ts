import { AuthProvider } from '../../../domain/services/AuthProvider';
import { LoginRequest, LoginResponse } from '../../dto/AuthDTO';

export class LoginUserUseCase {
    constructor(
        private authProvider: AuthProvider
    ) { }

    async execute(request: LoginRequest): Promise<LoginResponse> {
        // Delegate authentication to the injected provider.
        // This makes the UseCase provider-agnostic (Database, Keycloak, or Authentik).
        return this.authProvider.authenticate(request);
    }
}
