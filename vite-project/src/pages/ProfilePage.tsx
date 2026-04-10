import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { UserSummary } from '../features/profile/components/UserSummary';
import { Avatar } from '../components/ui/Avatar';
import { DropdownMenu } from '../components/ui/DropdownMenu';
import { PhotoCropModal } from '../components/ui/PhotoCropModal';
import { useAuth } from '../store/authContext';
import { apiClient } from '../utils/apiClient';
import styles from './ProfilePage.module.css';

const MAX_FILE_SIZE_MB = 3;

export const ProfilePage: React.FC = () => {
    const { user, logout, updateProfilePhoto } = useAuth();
    const photoInputRef = useRef<HTMLInputElement>(null);

    const [cropFile, setCropFile] = useState<File | null>(null);
    const [photoError, setPhotoError] = useState('');

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
