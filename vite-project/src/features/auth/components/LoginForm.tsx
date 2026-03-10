import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import styles from './LoginForm.module.css';

export const LoginForm: React.FC = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate login for now
        if (username && password) {
            navigate('/chat');
        }
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <h1 className={styles.title}>IDS</h1>

            <div className={styles.inputGroup}>
                <Input
                    label="Nombre de usuario"
                    placeholder="Ingrese su usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
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

            <Button type="submit" variant="primary" fullWidth>
                Iniciar Sesión
            </Button>

            <a href="#" className={styles.forgotPassword}>¿Olvidó su contraseña?</a>
        </form>
    );
};
