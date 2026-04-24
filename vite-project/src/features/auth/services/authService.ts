import { apiClient } from '../../../utils/apiClient';

export const authService = {
    forgotPassword: (email: string) =>
        apiClient.post<{ message: string }>('/api/auth/forgot-password', { email }),

    resetPassword: (token: string, password: string) =>
        apiClient.post<{ message: string }>('/api/auth/reset-password', { token, password }),
};
