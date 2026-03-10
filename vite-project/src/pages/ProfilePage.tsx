import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, Trash2 } from 'lucide-react';
import { UserSummary } from '../features/profile/components/UserSummary';
import { DocumentItem } from '../features/documents/components/DocumentItem';
import { Button } from '../components/ui/Button';
import { DropdownMenu } from '../components/ui/DropdownMenu';
import { Avatar } from '../components/ui/Avatar';
import styles from './ProfilePage.module.css';

const MOCK_DOCS = [
    { id: '1', name: 'Reporte_Anual_2024.pdf', sizeMB: 2.4, date: '2024-12-15', type: 'pdf' as const },
    { id: '2', name: 'Contrato_Servicios.docx', sizeMB: 1.1, date: '2024-11-20', type: 'docx' as const },
    { id: '3', name: 'Presentacion_Q4.pptx', sizeMB: 5.8, date: '2024-10-05', type: 'pptx' as const },
    { id: '4', name: 'Datos_Financieros.xlsx', sizeMB: 0.89, date: '2024-09-18', type: 'xlsx' as const },
];

export const ProfilePage: React.FC = () => {
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <Link to="/chat" className={styles.backLink}>
                    <ArrowLeft size={20} /> IDS AI CHAT
                </Link>
                <DropdownMenu
                    trigger={<Avatar name="Admin" size="sm" />}
                    items={[
                        { label: 'Cerrar Sesión', danger: true, onClick: () => console.log('logout') }
                    ]}
                />
            </header>

            <main className={styles.content}>
                <UserSummary name="Admin" role="Administrador" />

                <div className={styles.actions}>
                    <Button variant="primary">
                        <Upload size={16} /> Subir Documentos
                    </Button>
                    <Button variant="danger">
                        <Trash2 size={16} /> Eliminar Documentos
                    </Button>
                </div>

                <section className={styles.documentsSection}>
                    <h3 className={styles.sectionTitle}>Documentos Cargados</h3>
                    <div className={styles.documentList}>
                        {MOCK_DOCS.map((doc) => (
                            <DocumentItem
                                key={doc.id}
                                id={doc.id}
                                name={doc.name}
                                sizeMB={doc.sizeMB}
                                date={doc.date}
                                type={doc.type}
                            />
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};
