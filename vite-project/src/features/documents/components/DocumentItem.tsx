import React, { useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import styles from './DocumentItem.module.css';

interface DocumentItemProps {
    id: string;
    name: string;
    size: number;
    createdAt: string;
    onDelete: (id: string) => void;
}

export const DocumentItem: React.FC<DocumentItemProps> = ({ id, name, size, createdAt, onDelete }) => {
    const [confirmOpen, setConfirmOpen] = useState(false);

    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    const date = new Date(createdAt).toLocaleDateString('es-CO', {
        year: 'numeric', month: 'short', day: 'numeric',
    });

    return (
        <>
            <div className={styles.item}>
                <div className={styles.iconContainer}>
                    <FileText size={20} />
                </div>
                <div className={styles.content}>
                    <span className={styles.name} title={name}>{name}</span>
                    <div className={styles.meta}>
                        <span>{sizeMB} MB</span>
                        <span className={styles.bullet}>&bull;</span>
                        <span>{date}</span>
                    </div>
                </div>
                <button
                    className={styles.deleteButton}
                    onClick={() => setConfirmOpen(true)}
                    title="Eliminar documento"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {confirmOpen && (
                <div className={styles.overlay} onClick={() => setConfirmOpen(false)}>
                    <div className={styles.dialog} onClick={e => e.stopPropagation()}>
                        <p className={styles.dialogMessage}>
                            ¿Estás seguro de eliminar este documento?
                        </p>
                        <div className={styles.dialogActions}>
                            <button
                                className={styles.cancelButton}
                                onClick={() => setConfirmOpen(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                className={styles.confirmButton}
                                onClick={() => {
                                    setConfirmOpen(false);
                                    onDelete(id);
                                }}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
