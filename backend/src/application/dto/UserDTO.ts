import { Role } from '../../shared/types/roles';
import { User } from '../../domain/entities/User';

export interface CreateUserRequest {
    name: string;
    lastName: string;
    email: string;
    phone?: string;
    cargo?: string;
    role: Role;
    creatorId: string;
}

export interface UserResponse {
    id: string;
    name: string;
    lastName: string;
    email: string;
    phone?: string;
    cargo?: string;
    role: Role;
    createdAt: Date;
    createdBy: string;
    profilePhotoUrl?: string;
    generatedPassword?: string;
}

export const toUserResponse = (user: User): UserResponse => ({
    id: user.id,
    name: user.name,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    cargo: user.cargo,
    role: user.role,
    createdAt: user.createdAt,
    createdBy: user.createdBy,
    profilePhotoUrl: user.profilePhotoUrl,
});
