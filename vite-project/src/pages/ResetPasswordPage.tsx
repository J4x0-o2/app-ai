import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { authService } from '../features/auth/services/authService';
import styles from './ResetPasswordPage.module.css';

export const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') ?? '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (!token) {
        return (
            <div className={styles.form}>
                <h1 className={styles.title}>IDS</h1>
                <div className={styles.errorBox}>
                    <p className={styles.errorBoxText}>Enlace inválido o expirado. Solicita un nuevo enlace de recuperación.</p>
                </div>
                <Link to="/forgot-password" className={styles.backLink}>Solicitar nuevo enlace</Link>
            </div>
        );
    }

    if (success) {
        return (
            <div className={styles.form}>
                <h1 className={styles.title}>IDS</h1>
                <div className={styles.successBox}>
                    <p className={styles.successTitle}>¡Contraseña actualizada!</p>
                    <p className={styles.successText}>Tu contraseña fue restablecida correctamente. Ya puedes iniciar sesión.</p>
                </div>
                <Link to="/login" className={styles.backLink}>Ir al inicio de sesión</Link>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (password !== confirm) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            await authService.resetPassword(token, password);
            setSuccess(true);
        } catch (err: any) {
            const msg = err?.message ?? '';
            if (msg.includes('expirado')) setError('El enlace ha expirado. Solicita uno nuevo.');
            else if (msg.includes('utilizado')) setError('Este enlace ya fue utilizado.');
            else if (msg.includes('inválido')) setError('Enlace inválido.');
            else setError('Ocurrió un error. Intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <h1 className={styles.title}>IDS</h1>
            <p className={styles.subtitle}>Crea tu nueva contraseña.</p>

            <div className={styles.field}>
                <label className={styles.label}>Nueva contraseña</label>
                <div className={styles.passwordWrapper}>
                    <input
                        className={styles.input}
                        type={showPass ? 'text' : 'password'}
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(p => !p)}>
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            </div>

            <div className={styles.field}>
                <label className={styles.label}>Confirmar contraseña</label>
                <div className={styles.passwordWrapper}>
                    <input
                        className={styles.input}
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Repite tu nueva contraseña"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        required
                    />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(p => !p)}>
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button className={styles.button} type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Establecer nueva contraseña'}
            </button>

            <Link to="/login" className={styles.backLink}>Volver al inicio de sesión</Link>
        </form>
    );
};
