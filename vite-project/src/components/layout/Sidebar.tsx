import React from 'react';
import { Plus, Upload, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './Sidebar.module.css';

interface SidebarProps {
    isOpen: boolean;
    onUploadClick: () => void;
}

// Mock History Data
const HISTORY_DATA = [
    {
        group: 'Hoy',
        items: [
            { id: '1', title: 'Análisis de datos financieros' },
            { id: '2', title: 'Resumen de contrato' }
        ]
    },
    {
        group: 'Ayer',
        items: [
            { id: '3', title: 'Traducción de documento' },
            { id: '4', title: 'Consulta sobre normativas' }
        ]
    },
    {
        group: 'Hace 3 días',
        items: [
            { id: '5', title: 'Revisión de informe Q3' }
        ]
    }
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onUploadClick }) => {
    return (
        <aside className={`${styles.sidebar} ${!isOpen ? styles.collapsed : ''}`}>
            <div className={styles.topActions}>
                <Link to="/chat" className={`${styles.actionButton} ${styles.newChatButton}`}>
                    <Plus size={18} />
                    Nuevo Chat
                </Link>
                <button className={styles.actionButton} onClick={onUploadClick}>
                    <Upload size={18} />
                    Subir Documentos
                </button>
            </div>

            <div className={styles.historyArea}>
                <div className={styles.historyTitle}>Historial</div>

                {HISTORY_DATA.map((group) => (
                    <div key={group.group} className={styles.historyGroup}>
                        {group.items.map((item) => (
                            <Link to={`/chat/${item.id}`} key={item.id} className={styles.historyItem}>
                                <MessageSquare size={16} className={styles.historyItemIcon} />
                                <div className={styles.historyContent}>
                                    <span className={styles.historyItemTitle}>{item.title}</span>
                                    <span className={styles.historyItemDate}>{group.group}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                ))}
            </div>
        </aside>
    );
};
