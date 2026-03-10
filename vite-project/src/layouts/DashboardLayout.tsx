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

    const handleUploadClick = () => {
        // This could open a generic modal via context or local state
        // We'll wire it later to the global/shared feature component
        console.log("Open upload modal");
    };

    return (
        <div className={styles.layout}>
            <Header onMenuToggle={toggleSidebar} showMenuButton={true} />
            <div className={styles.mainArea}>
                <Sidebar isOpen={isSidebarOpen} onUploadClick={handleUploadClick} />
                <main className={styles.content}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
