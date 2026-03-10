import React from 'react';
import styles from './Avatar.module.css';

interface AvatarProps {
    name: string;
    imageUrl?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
    name,
    imageUrl,
    size = 'md',
    className = ''
}) => {
    // Extract initials (first letter of first and optionally second word)
    const getInitials = (fullName: string) => {
        const parts = fullName.trim().split(' ');
        if (parts.length === 0) return 'U';
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    };

    const combinedClass = `${styles.avatar} ${styles[size]} ${className}`;

    return (
        <div className={combinedClass} aria-label={`Avatar de ${name}`} title={name}>
            {imageUrl ? (
                <img src={imageUrl} alt={`Avatar de ${name}`} className={styles.avatarImage} />
            ) : (
                <span>{getInitials(name)}</span>
            )}
        </div>
    );
};
