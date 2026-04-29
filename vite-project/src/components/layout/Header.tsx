import React from 'react';
import { Menu, User, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { DropdownMenu } from '../ui/DropdownMenu';
import { useAuth } from '../../store/authContext';
import styles from './Header.module.css';

interface HeaderProps {
    onMenuToggle?: () => void;
    showMenuButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle, showMenuButton = true }) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <header className={styles.header}>
            <div className={styles.leftSection}>
                {showMenuButton && (
                    <button className={styles.menuButton} onClick={onMenuToggle} aria-label="Alternar menú">
                        <Menu size={24} />
                    </button>
                )}
                <Link to="/chat" className={styles.logoArea}>
                    IDS AI CHAT
                </Link>
            </div>

            <div className={styles.rightSection}>
                <DropdownMenu
                    trigger={
                        <div className={styles.userInfo}>
                            <Avatar
                                name={user?.email ?? ''}
                                imageUrl={user?.profilePhotoUrl}
                                size="sm"
                            />
                        </div>
                    }
                    items={[
                        {
                            label: 'Perfil',
                            icon: <User size={16} />,
                            onClick: () => navigate('/profile'),
                        },
                        {
                            label: 'Cerrar Sesión',
                            icon: <LogOut size={16} />,
                            onClick: handleLogout,
                            danger: true,
                        },
                    ]}
                />
            </div>
        </header>
    );
};
