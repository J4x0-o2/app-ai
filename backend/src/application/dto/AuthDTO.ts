import { Role } from '../../shared/types/roles';

export interface LoginRequest {
    email: string;
    password?: string;
}

export interface LoginResponse {
    token: string;
    user: {
        id: string;
        email: string;
        role: Role;
        permissions: string[];
        profilePhotoUrl?: string;
        mustChangePassword: boolean;
        createdAt: string;
    };
}
