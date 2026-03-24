import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import styles from './DashboardLayout.module.css';

export const DashboardLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setIsSidebarOpen((prev) => !prev);
    };

    return (
        <div className={styles.layout}>
            <Header onMenuToggle={toggleSidebar} showMenuButton={true} />
            <div className={styles.mainArea}>
                <Sidebar isOpen={isSidebarOpen} />
                <main className={styles.content}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
