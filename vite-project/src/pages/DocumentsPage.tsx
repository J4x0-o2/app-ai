import React, { useState, useEffect, useRef } from 'react';
import { Upload, Search, Trash2, FileText, Loader2, Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { documentService, type Document, type ProcessingStatus } from '../features/documents/services/documentService';
import styles from './DocumentsPage.module.css';

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

const STATUS_LABELS: Record<ProcessingStatus, string> = {
    pending: 'En cola',
    processing: 'Procesando',
    done: 'Listo',
    error: 'Error',
};

const STATUS_STYLE: Record<ProcessingStatus, string> = {
    pending: styles.statusPending,
    processing: styles.statusProcessing,
    done: styles.statusDone,
    error: styles.statusError,
};

function StatusBadge({ status }: { status: ProcessingStatus }) {
    return (
        <span className={`${styles.statusBadge} ${STATUS_STYLE[status]}`}>
            {status === 'processing' && <Loader2 size={10} className={styles.spin} />}
            {status === 'pending' && <Clock size={10} />}
            {status === 'error' && <AlertCircle size={10} />}
            {status === 'done' && <CheckCircle2 size={10} />}
            {STATUS_LABELS[status]}
        </span>
    );
}

export const DocumentsPage: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
    const [statusMessage, setStatusMessage] = useState('');

    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    useEffect(() => {
        fetchDocuments();
    }, []);

    // Poll every 3 s while any document is still being processed.
    // Stops automatically when all documents reach a terminal state (done / error).
    useEffect(() => {
        const hasPending = documents.some(
            d => d.processingStatus === 'pending' || d.processingStatus === 'processing'
        );
        if (!hasPending) return;

        const timer = setInterval(fetchDocuments, 3000);
        return () => clearInterval(timer);
    }, [documents]);

    const fetchDocuments = async () => {
        try {
            const docs = await documentService.list();
            setDocuments(docs);
        } catch {
            setStatusMessage('No se pudo cargar la lista de documentos.');
        } finally {
            setLoading(false);
        }
    };

    const handleUploadClick = () => fileInputRef.current?.click();

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        try {
            setUploadStatus('uploading');
            setStatusMessage(`Subiendo "${file.name}"...`);
            await documentService.upload(file);

            setUploadStatus('done');
            setStatusMessage(`"${file.name}" subido. Procesando en segundo plano...`);
            await fetchDocuments();

            setTimeout(() => {
                setUploadStatus('idle');
                setStatusMessage('');
            }, 5000);
        } catch (err: any) {
            setUploadStatus('error');
            setStatusMessage(err?.message ?? 'Error al subir el documento.');
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTargetId) return;
        try {
            await documentService.delete(deleteTargetId);
            setDocuments(prev => prev.filter(d => d.id !== deleteTargetId));
        } catch {
            setStatusMessage('No se pudo eliminar el documento.');
        } finally {
            setDeleteTargetId(null);
        }
    };

    const isUploading = uploadStatus === 'uploading';

    const filtered = documents.filter(doc => {
        const matchesName = doc.name.toLowerCase().includes(search.toLowerCase());
        const matchesDate = dateFilter ? doc.createdAt.slice(0, 10) === dateFilter : true;
        return matchesName && matchesDate;
    });

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const formatDateTime = (iso: string) =>
        new Date(iso).toLocaleString('es-CO', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

    return (
        <div className={styles.page}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
                <h2 className={styles.pageTitle}>Documentos</h2>

                <div className={styles.toolbarRight}>
                    <div className={styles.searchWrapper}>
                        <Search size={15} className={styles.searchIcon} />
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Buscar por nombre..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className={styles.dateWrapper}>
                        <Calendar size={15} className={styles.dateIcon} />
                        <input
                            type="date"
                            className={styles.dateInput}
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            title="Filtrar por fecha"
                        />
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        style={{ display: 'none' }}
                        onChange={handleFileSelected}
                    />
                    <button
                        className={styles.uploadButton}
                        onClick={handleUploadClick}
                        disabled={isUploading}
                    >
                        {isUploading
                            ? <><Loader2 size={15} className={styles.spin} /> Subiendo...</>
                            : <><Upload size={15} /> Subir Documento</>
                        }
                    </button>
                </div>
            </div>

            {statusMessage && (
                <div className={`${styles.statusBanner} ${styles[uploadStatus]}`}>
                    {statusMessage}
                </div>
            )}

            {/* Table */}
            <div className={styles.tableWrapper}>
                {loading ? (
                    <div className={styles.emptyState}>
                        <Loader2 size={28} className={styles.spin} />
                        <p>Cargando documentos...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={styles.emptyState}>
                        <FileText size={36} className={styles.emptyIcon} />
                        <p>{search || dateFilter ? 'Sin resultados para los filtros aplicados.' : 'No hay documentos cargados aún.'}</p>
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.thIndex}>#</th>
                                <th>Nombre</th>
                                <th>Tipo</th>
                                <th>Estado</th>
                                <th>Fecha y Hora</th>
                                <th>Tamaño</th>
                                <th className={styles.thActions}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((doc, index) => (
                                <tr key={doc.id} className={styles.row}>
                                    <td className={styles.tdIndex}>{index + 1}</td>
                                    <td className={styles.tdName}>
                                        <FileText size={14} className={styles.fileIcon} />
                                        <span title={doc.name}>{doc.name}</span>
                                    </td>
                                    <td className={styles.tdType}>
                                        <span className={styles.typeBadge}>
                                            {(doc.type?.split('/')[1] || doc.type || 'pdf').toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        <StatusBadge status={doc.processingStatus ?? 'done'} />
                                    </td>
                                    <td className={styles.tdDate}>{formatDateTime(doc.createdAt)}</td>
                                    <td className={styles.tdSize}>{formatSize(doc.size)}</td>
                                    <td className={styles.tdActions}>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => setDeleteTargetId(doc.id)}
                                            title="Eliminar documento"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Confirm delete modal */}
            {deleteTargetId && (
                <div className={styles.overlay} onClick={() => setDeleteTargetId(null)}>
                    <div className={styles.dialog} onClick={e => e.stopPropagation()}>
                        <p className={styles.dialogMessage}>
                            ¿Estás seguro de eliminar este documento?
                        </p>
                        <div className={styles.dialogActions}>
                            <button className={styles.cancelButton} onClick={() => setDeleteTargetId(null)}>
                                Cancelar
                            </button>
                            <button className={styles.confirmButton} onClick={handleDeleteConfirm}>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
