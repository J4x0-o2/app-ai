import React from 'react';
import { Avatar } from '../../../components/ui/Avatar';
import styles from './UserSummary.module.css';

interface UserSummaryProps {
    name: string;
    role: string;
}

export const UserSummary: React.FC<UserSummaryProps> = ({ name, role }) => {
    return (
        <div className={styles.summary}>
            <Avatar name={name} size="lg" />
            <div className={styles.details}>
                <h2 className={styles.name}>{name}</h2>
                <p className={styles.role}>{role}</p>
            </div>
        </div>
    );
};
