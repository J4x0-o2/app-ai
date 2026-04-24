import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../features/auth/services/authService';
import styles from './ForgotPasswordPage.module.css';

export const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authService.forgotPassword(email);
            setSubmitted(true);
        } catch {
            setError('Ocurrió un error. Intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className={styles.form}>
                <h1 className={styles.title}>IDS</h1>
                <div className={styles.successBox}>
                    <p className={styles.successTitle}>Revisa tu correo</p>
                    <p className={styles.successText}>
                        Si <strong>{email}</strong> está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
                    </p>
                </div>
                <Link to="/login" className={styles.backLink}>Volver al inicio de sesión</Link>
            </div>
        );
    }

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <h1 className={styles.title}>IDS</h1>
            <p className={styles.subtitle}>Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>

            <div className={styles.field}>
                <label className={styles.label}>Correo electrónico</label>
                <input
                    className={styles.input}
                    type="email"
                    placeholder="usuario@empresa.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button className={styles.button} type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>

            <Link to="/login" className={styles.backLink}>Volver al inicio de sesión</Link>
        </form>
    );
};
