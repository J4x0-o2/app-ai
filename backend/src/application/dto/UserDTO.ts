import { Role } from '../../shared/types/roles';
import { User } from '../../domain/entities/User';

export interface CreateUserRequest {
    name: string;
    email: string;
    role: Role;
    creatorId: string;
}

export interface UserResponse {
    id: string;
    name: string;
    email: string;
    role: Role;
    createdAt: Date;
    createdBy: string;
    profilePhotoUrl?: string;
}

export const toUserResponse = (user: User): UserResponse => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    createdBy: user.createdBy,
    profilePhotoUrl: user.profilePhotoUrl
});
