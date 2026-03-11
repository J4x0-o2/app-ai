import { LoginRequest, LoginResponse } from '../../application/dto/AuthDTO';

export interface AuthProvider {
    authenticate(request: LoginRequest): Promise<LoginResponse>;
}
