import React, { createContext, useContext, useState, useEffect } from 'react';
import { tokenStorage } from '../utils/apiClient';

interface AuthUser {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    profilePhotoUrl?: string;
}

interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    login: (token: string, user: AuthUser) => void;
    logout: () => void;
    updateProfilePhoto: (url: string) => void;
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
                localStorage.removeItem('auth_user');
            }
        }
    }, []);

    const login = (token: string, userData: AuthUser) => {
        tokenStorage.set(token);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        tokenStorage.remove();
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

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, updateProfilePhoto }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return ctx;
};
