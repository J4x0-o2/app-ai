import React, { useState, useRef, useEffect } from 'react';
import styles from './DropdownMenu.module.css';

export interface DropdownMenuItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
}

interface DropdownMenuProps {
    trigger: React.ReactNode;
    items: DropdownMenuItem[];
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, items }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const toggleOpen = () => setIsOpen((prev) => !prev);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={styles.dropdownWrapper} ref={dropdownRef}>
            <div className={styles.trigger} onClick={toggleOpen} role="button" aria-haspopup="true" aria-expanded={isOpen}>
                {trigger}
            </div>

            {isOpen && (
                <div className={styles.menu} role="menu">
                    {items.map((item, index) => (
                        <button
                            key={index}
                            className={`${styles.item} ${item.danger ? styles.itemDanger : ''}`}
                            onClick={() => {
                                item.onClick();
                                setIsOpen(false);
                            }}
                            role="menuitem"
                        >
                            {item.icon && <span className={styles.icon}>{item.icon}</span>}
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
