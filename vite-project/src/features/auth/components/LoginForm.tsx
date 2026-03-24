import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { apiClient, ApiError } from '../../../utils/apiClient';
import { useAuth } from '../../../store/authContext';
import styles from './LoginForm.module.css';

interface LoginResponse {
    token: string;
    user: {
        id: string;
        email: string;
        role: string;
        permissions: string[];
    };
}

export const LoginForm: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await apiClient.post<LoginResponse>('/api/auth/login', { email, password });
            login(response.token, response.user);
            navigate('/chat');
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setError('Credenciales incorrectas. Verifique su email y contraseña.');
            } else {
                setError('Ocurrió un error. Intente nuevamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <h1 className={styles.title}>IDS</h1>

            <div className={styles.inputGroup}>
                <Input
                    label="Correo electrónico"
                    placeholder="Ingrese su correo"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <Input
                    label="Contraseña"
                    placeholder="Ingrese su contraseña"
                    type="password"
                    isPassword
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <Button type="submit" variant="primary" fullWidth disabled={loading}>
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>

            <a href="#" className={styles.forgotPassword}>¿Olvidó su contraseña?</a>
        </form>
    );
};
