import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Loader2 } from 'lucide-react';
import { UserSummary } from '../features/profile/components/UserSummary';
import { DocumentItem } from '../features/documents/components/DocumentItem';
import { documentService, Document } from '../features/documents/services/documentService';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { DropdownMenu } from '../components/ui/DropdownMenu';
import { useAuth } from '../store/authContext';
import styles from './ProfilePage.module.css';

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export const ProfilePage: React.FC = () => {
    const { user, logout } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [documents, setDocuments] = useState<Document[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
    const [statusMessage, setStatusMessage] = useState('');

    // Carga la lista de documentos desde el backend al entrar a la página
    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setLoadingDocs(true);
        try {
            const docs = await documentService.list();
            setDocuments(docs);
        } catch {
            setStatusMessage('No se pudo cargar la lista de documentos.');
        } finally {
            setLoadingDocs(false);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        try {
            // Paso 1 — subir el archivo al backend
            setUploadStatus('uploading');
            setStatusMessage(`Subiendo "${file.name}"...`);
            const uploaded = await documentService.upload(file);

            // Paso 2 — procesar el documento (chunking + embeddings)
            // Esto puede tardar unos segundos dependiendo del tamaño del PDF
            setUploadStatus('processing');
            setStatusMessage(`Procesando "${file.name}" para el RAG...`);
            await documentService.process(uploaded.id);

            // Paso 3 — refrescar la lista
            setUploadStatus('done');
            setStatusMessage(`"${file.name}" listo para consultas.`);
            await fetchDocuments();

            // Limpiar mensaje después de 4 segundos
            setTimeout(() => {
                setUploadStatus('idle');
                setStatusMessage('');
            }, 4000);

        } catch (err: any) {
            setUploadStatus('error');
            setStatusMessage(err?.message ?? 'Error al subir el documento. Intenta nuevamente.');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await documentService.delete(id);
            // Quitamos el documento de la lista localmente sin recargar todo
            setDocuments((prev) => prev.filter((d) => d.id !== id));
        } catch {
            setStatusMessage('No se pudo eliminar el documento.');
        }
    };

    const isUploading = uploadStatus === 'uploading' || uploadStatus === 'processing';

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <Link to="/chat" className={styles.backLink}>
                    <ArrowLeft size={20} /> IDS AI CHAT
                </Link>
                <DropdownMenu
                    trigger={<Avatar name={user?.email ?? ''} size="sm" />}
                    items={[
                        { label: 'Cerrar Sesión', danger: true, onClick: logout }
                    ]}
                />
            </header>

            <main className={styles.content}>
                <UserSummary name={user?.email ?? ''} role={user?.role ?? ''} />

                <div className={styles.actions}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        style={{ display: 'none' }}
                        onChange={handleFileSelected}
                    />
                    <Button variant="primary" onClick={handleUploadClick} disabled={isUploading}>
                        {isUploading
                            ? <><Loader2 size={16} className={styles.spin} /> {uploadStatus === 'uploading' ? 'Subiendo...' : 'Procesando...'}</>
                            : <><Upload size={16} /> Subir Documento</>
                        }
                    </Button>
                </div>

                {/* Mensaje de estado del upload */}
                {statusMessage && (
                    <p className={`${styles.statusMessage} ${styles[uploadStatus]}`}>
                        {statusMessage}
                    </p>
                )}

                <section className={styles.documentsSection}>
                    <h3 className={styles.sectionTitle}>Documentos Cargados</h3>

                    {loadingDocs ? (
                        <div className={styles.emptyDocuments}>
                            <Loader2 size={28} className={styles.spin} />
                            <p>Cargando documentos...</p>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className={styles.emptyDocuments}>
                            <FileText size={40} className={styles.emptyIcon} />
                            <p>No hay documentos cargados aún.</p>
                            <p>Sube un PDF para que la IA pueda consultarlo.</p>
                        </div>
                    ) : (
                        <div className={styles.documentList}>
                            {documents.map((doc) => (
                                <DocumentItem
                                    key={doc.id}
                                    id={doc.id}
                                    name={doc.name}
                                    size={doc.size}
                                    createdAt={doc.createdAt}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};
