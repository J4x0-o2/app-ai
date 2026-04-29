const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const tokenStorage = {
    get: (): string | null => localStorage.getItem(TOKEN_KEY),
    set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
    remove: (): void => localStorage.removeItem(TOKEN_KEY),
};

export const refreshTokenStorage = {
    get: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
    set: (token: string): void => localStorage.setItem(REFRESH_TOKEN_KEY, token),
    remove: (): void => localStorage.removeItem(REFRESH_TOKEN_KEY),
};

class ApiError extends Error {
    status: number;
    data?: unknown;

    constructor(status: number, message: string, data?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

// Shared promise so concurrent 401s only trigger one refresh
let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

async function doRefresh(): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = refreshTokenStorage.get();
    if (!refreshToken) throw new Error('No refresh token');

    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) throw new Error('Refresh failed');
    return response.json();
}

async function tryRefresh(): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false,
): Promise<T> {
    const token = tokenStorage.get();

    const isFormData = options.body instanceof FormData;
    const hasBody = options.body !== undefined;
    const headers: HeadersInit = {
        ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

    if (response.status === 401 && !isRetry && endpoint !== '/api/auth/refresh') {
        try {
            const tokens = await tryRefresh();
            tokenStorage.set(tokens.accessToken);
            refreshTokenStorage.set(tokens.refreshToken);
            return request<T>(endpoint, options, true);
        } catch {
            tokenStorage.remove();
            refreshTokenStorage.remove();
            window.dispatchEvent(new CustomEvent('auth:session-expired'));
            throw new ApiError(401, 'Sesión expirada. Por favor, inicia sesión de nuevo.');
        }
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
            response.status,
            errorData.error || errorData.message || `Error ${response.status}`,
            errorData,
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

export const apiClient = {
    get: <T>(endpoint: string) =>
        request<T>(endpoint, { method: 'GET' }),

    post: <T>(endpoint: string, body: unknown) =>
        request<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        }),

    put: <T>(endpoint: string, body: unknown) =>
        request<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
        }),

    patch: <T>(endpoint: string, body: unknown) =>
        request<T>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body),
        }),

    delete: <T>(endpoint: string) =>
        request<T>(endpoint, { method: 'DELETE' }),

    postForm: <T>(endpoint: string, formData: FormData) =>
        request<T>(endpoint, {
            method: 'POST',
            headers: {},
            body: formData,
        }),
};

export { ApiError };
