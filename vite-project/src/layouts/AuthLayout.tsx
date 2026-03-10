import React from 'react';
import { Outlet } from 'react-router-dom';
import styles from './AuthLayout.module.css';

export const AuthLayout: React.FC = () => {
    return (
        <div className={styles.container}>
            <main className={styles.card}>
                <Outlet />
            </main>
        </div>
    );
};
