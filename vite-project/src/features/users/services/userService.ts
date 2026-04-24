import { apiClient } from '../../../utils/apiClient';

export type UserRole = 'ADMIN' | 'GESTOR' | 'INSTRUCTOR' | 'EMPLEADO';

export interface UserRecord {
    id: string;
    name: string;
    lastName: string;
    email: string;
    phone?: string;
    cargo?: string;
    role: UserRole;
    createdAt: string;
    generatedPassword?: string;
}

export interface CreateUserPayload {
    name: string;
    lastName: string;
    email: string;
    phone?: string;
    cargo?: string;
    role: UserRole;
    creatorId: string;
}

export const userService = {
    list: () => apiClient.get<UserRecord[]>('/api/users'),

    create: (payload: CreateUserPayload) =>
        apiClient.post<UserRecord>('/api/users', payload),

    delete: (id: string) => apiClient.delete<void>(`/api/users/${id}`),
};
