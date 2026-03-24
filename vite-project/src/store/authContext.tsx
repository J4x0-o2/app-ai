import React, { createContext, useContext, useState, useEffect } from 'react';
import { tokenStorage } from '../utils/apiClient';

interface AuthUser {
    id: string;
    email: string;
    role: string;
    permissions: string[];
}

interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    login: (token: string, user: AuthUser) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);

    // Al montar, si hay token guardado intentamos restaurar la sesión.
    // Por ahora solo verificamos que el token exista; en el módulo 3
    // agregaremos un endpoint /me para validarlo contra el servidor.
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

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return ctx;
};
