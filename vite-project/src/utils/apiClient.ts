const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TOKEN_KEY = 'auth_token';

export const tokenStorage = {
    get: (): string | null => localStorage.getItem(TOKEN_KEY),
    set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
    remove: (): void => localStorage.removeItem(TOKEN_KEY),
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

async function request<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const token = tokenStorage.get();

    const isFormData = options.body instanceof FormData;
    const hasBody = options.body !== undefined;
    const headers: HeadersInit = {
        ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
            response.status,
            errorData.error || errorData.message || `Error ${response.status}`,
            errorData,
        );
    }

    // 204 No Content no tiene body
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
            // No ponemos Content-Type — el browser lo pone solo con el boundary correcto
            headers: {},
            body: formData,
        }),
};

export { ApiError };
