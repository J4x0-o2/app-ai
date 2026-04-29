import React, { createContext, useContext, useState, useEffect } from 'react';
import { tokenStorage, refreshTokenStorage } from '../utils/apiClient';

export interface AuthUser {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    profilePhotoUrl?: string;
    mustChangePassword: boolean;
    createdAt: string;
}

interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    login: (token: string, refreshToken: string, user: AuthUser) => void;
    logout: () => void;
    updateProfilePhoto: (url: string) => void;
    clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        const token = tokenStorage.get();
        const savedUser = localStorage.getItem('auth_user');
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                tokenStorage.remove();
                refreshTokenStorage.remove();
                localStorage.removeItem('auth_user');
            }
        }
    }, []);

    // Escucha el evento de sesión expirada lanzado por apiClient cuando el refresh falla
    useEffect(() => {
        const handleExpired = () => {
            setUser(null);
            localStorage.removeItem('auth_user');
        };
        window.addEventListener('auth:session-expired', handleExpired);
        return () => window.removeEventListener('auth:session-expired', handleExpired);
    }, []);

    const login = (token: string, refreshToken: string, userData: AuthUser) => {
        tokenStorage.set(token);
        refreshTokenStorage.set(refreshToken);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = async () => {
        try {
            // Revoca todos los refresh tokens del usuario en el servidor
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/logout`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${tokenStorage.get()}` },
            });
        } catch {
            // Si falla el servidor, igual limpiamos el cliente
        }
        tokenStorage.remove();
        refreshTokenStorage.remove();
        localStorage.removeItem('auth_user');
        setUser(null);
    };

    const updateProfilePhoto = (url: string) => {
        setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, profilePhotoUrl: url };
            localStorage.setItem('auth_user', JSON.stringify(updated));
            return updated;
        });
    };

    const clearMustChangePassword = () => {
        setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, mustChangePassword: false };
            localStorage.setItem('auth_user', JSON.stringify(updated));
            return updated;
        });
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, updateProfilePhoto, clearMustChangePassword }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return ctx;
};
