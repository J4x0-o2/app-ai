import React from 'react';
import { FileText, FileSpreadsheet, FileIcon as FilePresentation, File } from 'lucide-react';
import styles from './DocumentItem.module.css';

interface DocumentItemProps {
    id: string;
    name: string;
    sizeMB: number;
    date: string;
    type: 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'generic';
}

export const DocumentItem: React.FC<DocumentItemProps> = ({ name, sizeMB, date, type }) => {
    const getIcon = () => {
        switch (type) {
            case 'pdf': return <FileText size={20} />;
            case 'docx': return <FileText size={20} />;
            case 'xlsx': return <FileSpreadsheet size={20} />;
            case 'pptx': return <FilePresentation size={20} />;
            default: return <File size={20} />;
        }
    };

    return (
        <div className={styles.item}>
            <div className={styles.iconContainer}>
                {getIcon()}
            </div>
            <div className={styles.content}>
                <span className={styles.name} title={name}>{name}</span>
                <div className={styles.meta}>
                    <span>{sizeMB} MB</span>
                    <span className={styles.bullet}>&bull;</span>
                    <span>{date}</span>
                </div>
            </div>
        </div>
    );
};
