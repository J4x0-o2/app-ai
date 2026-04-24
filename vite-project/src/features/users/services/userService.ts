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

export interface UpdateUserPayload {
    name: string;
    lastName: string;
    email: string;
    phone?: string;
    cargo?: string;
    role: UserRole;
}

export const userService = {
    list: () => apiClient.get<UserRecord[]>('/api/users'),

    create: (payload: CreateUserPayload) =>
        apiClient.post<UserRecord>('/api/users', payload),

    update: (id: string, payload: UpdateUserPayload) =>
        apiClient.put<UserRecord>(`/api/users/${id}`, payload),

    delete: (id: string) => apiClient.delete<void>(`/api/users/${id}`),
};
