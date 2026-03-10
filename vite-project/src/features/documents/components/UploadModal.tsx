import React, { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import styles from './UploadModal.module.css';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: FileList | null) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // In a real app we'd save this to state and show a list before actual upload
            console.log('Files dropped:', e.dataTransfer.files);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            console.log('Files selected:', e.target.files);
        }
    };

    const handleSave = () => {
        // Mock save
        onUpload(null);
        onClose();
    };

    const footer = (
        <>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>Guardar</Button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Subir Documentos" footer={footer}>
            <div
                className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className={styles.iconWrapper}>
                    <Plus size={24} />
                </div>
                <p className={styles.text}>Haz clic o arrastra archivos aquí</p>
                <input
                    type="file"
                    multiple
                    className={styles.hiddenInput}
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                />
            </div>
        </Modal>
    );
};
