import React from 'react';
import { Camera } from 'lucide-react';
import { Avatar } from '../../../components/ui/Avatar';
import styles from './UserSummary.module.css';

interface UserSummaryProps {
    name: string;
    role: string;
    photoUrl?: string;
    onPhotoChange?: () => void;
}

export const UserSummary: React.FC<UserSummaryProps> = ({ name, role, photoUrl, onPhotoChange }) => {
    return (
        <div className={styles.summary}>
            <div className={styles.avatarWrapper} onClick={onPhotoChange} title="Cambiar foto de perfil">
                <Avatar name={name} imageUrl={photoUrl} size="lg" />
                <div className={styles.avatarOverlay}>
                    <Camera size={18} />
                    <span className={styles.overlayText}>Cambiar foto</span>
                </div>
            </div>
            <div className={styles.details}>
                <h2 className={styles.name}>{name}</h2>
                <p className={styles.role}>{role}</p>
            </div>
        </div>
    );
};
