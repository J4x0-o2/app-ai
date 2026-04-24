import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { UserSummary } from '../features/profile/components/UserSummary';
import { Avatar } from '../components/ui/Avatar';
import { DropdownMenu } from '../components/ui/DropdownMenu';
import { PhotoCropModal } from '../components/ui/PhotoCropModal';
import { useAuth } from '../store/authContext';
import { apiClient } from '../utils/apiClient';
import styles from './ProfilePage.module.css';

const MAX_FILE_SIZE_MB = 3;
const PASSWORD_DEADLINE_DAYS = 7;

function getDaysRemaining(createdAt: string): number {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    return PASSWORD_DEADLINE_DAYS - elapsed;
}

export const ProfilePage: React.FC = () => {
    const { user, logout, updateProfilePhoto, clearMustChangePassword } = useAuth();
    const photoInputRef = useRef<HTMLInputElement>(null);

    const [cropFile, setCropFile] = useState<File | null>(null);
    const [photoError, setPhotoError] = useState('');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pwError, setPwError] = useState('');
    const [pwSuccess, setPwSuccess] = useState('');
    const [pwLoading, setPwLoading] = useState(false);

    const handlePhotoClick = () => {
        setPhotoError('');
        photoInputRef.current?.click();
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > MAX_FILE_SIZE_MB) {
            setPhotoError(`La imagen no puede superar ${MAX_FILE_SIZE_MB} MB. Tamaño actual: ${sizeMB.toFixed(1)} MB.`);
            return;
        }

        setCropFile(file);
    };

    const handleCropConfirm = async (dataUrl: string) => {
        setCropFile(null);
        try {
            await apiClient.patch(`/api/users/${user?.id}/photo`, { photoUrl: dataUrl });
            updateProfilePhoto(dataUrl);
        } catch {
            setPhotoError('No se pudo actualizar la foto de perfil.');
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwError('');
        setPwSuccess('');

        if (newPassword !== confirmPassword) {
            setPwError('Las contraseñas nuevas no coinciden.');
            return;
        }
        if (newPassword.length < 8) {
            setPwError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        setPwLoading(true);
        try {
            await apiClient.put('/api/auth/change-password', { currentPassword, newPassword });
            setPwSuccess('Contraseña actualizada correctamente.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            clearMustChangePassword();
        } catch (err: any) {
            setPwError(err?.message ?? 'No se pudo actualizar la contraseña.');
        } finally {
            setPwLoading(false);
        }
    };

    const daysRemaining = user?.mustChangePassword ? getDaysRemaining(user.createdAt) : null;

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <Link to="/chat" className={styles.backLink}>
                    <ArrowLeft size={20} /> IDS AI CHAT
                </Link>
                <DropdownMenu
                    trigger={<Avatar name={user?.email ?? ''} imageUrl={user?.profilePhotoUrl} size="sm" />}
                    items={[
                        { label: 'Cerrar Sesión', danger: true, onClick: logout }
                    ]}
                />
            </header>

            <main className={styles.content}>
                <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileSelected}
                />

                <UserSummary
                    name={user?.email ?? ''}
                    role={user?.role ?? ''}
                    photoUrl={user?.profilePhotoUrl}
                    onPhotoChange={handlePhotoClick}
                />

                {photoError && (
                    <p className={styles.photoError}>{photoError}</p>
                )}

                {user?.mustChangePassword && daysRemaining !== null && (
                    <div className={`${styles.banner} ${daysRemaining <= 0 ? styles.bannerDanger : daysRemaining <= 2 ? styles.bannerWarningHot : styles.bannerWarning}`}>
                        <AlertTriangle size={18} className={styles.bannerIcon} />
                        <span>
                            {daysRemaining <= 0
                                ? 'Tu contraseña temporal ha vencido. Cámbiala ahora para continuar usando la plataforma.'
                                : `Tu contraseña temporal vence en ${daysRemaining} día${daysRemaining === 1 ? '' : 's'}. Te recomendamos cambiarla cuanto antes.`}
                        </span>
                    </div>
                )}

                <section className={styles.passwordSection}>
                    <h2 className={styles.sectionTitle}>Cambiar contraseña</h2>
                    <form className={styles.passwordForm} onSubmit={handleChangePassword}>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Contraseña actual</label>
                            <div className={styles.inputWrapper}>
                                <input
                                    type={showCurrent ? 'text' : 'password'}
                                    className={styles.input}
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                                <button type="button" className={styles.eyeBtn} onClick={() => setShowCurrent(v => !v)}>
                                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Nueva contraseña</label>
                            <div className={styles.inputWrapper}>
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    className={styles.input}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                />
                                <button type="button" className={styles.eyeBtn} onClick={() => setShowNew(v => !v)}>
                                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Confirmar nueva contraseña</label>
                            <div className={styles.inputWrapper}>
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    className={styles.input}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                />
                                <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(v => !v)}>
                                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {pwError && <p className={styles.pwError}>{pwError}</p>}
                        {pwSuccess && <p className={styles.pwSuccess}>{pwSuccess}</p>}

                        <button type="submit" className={styles.submitBtn} disabled={pwLoading}>
                            {pwLoading ? 'Guardando...' : 'Actualizar contraseña'}
                        </button>
                    </form>
                </section>
            </main>

            {cropFile && (
                <PhotoCropModal
                    file={cropFile}
                    onConfirm={handleCropConfirm}
                    onClose={() => setCropFile(null)}
                />
            )}
        </div>
    );
};
