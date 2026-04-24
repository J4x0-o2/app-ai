import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Trash2, Pencil, Users, Loader2, Eye, EyeOff, Copy, CheckCheck } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { userService, type UserRecord, type UserRole, type CreateUserPayload, type UpdateUserPayload } from '../features/users/services/userService';
import { useAuth } from '../store/authContext';
import styles from './UsersPage.module.css';

const ROLES: UserRole[] = ['ADMIN', 'GESTOR', 'INSTRUCTOR', 'EMPLEADO'];

const ROLE_LABELS: Record<UserRole, string> = {
    ADMIN: 'Administrador',
    GESTOR: 'Gestor',
    INSTRUCTOR: 'Instructor',
    EMPLEADO: 'Empleado',
};

const emptyForm = (): CreateUserPayload => ({
    name: '',
    lastName: '',
    email: '',
    phone: '',
    cargo: '',
    role: '' as UserRole,
    creatorId: '',
});

export const UsersPage: React.FC = () => {
    const { user } = useAuth();

    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState<CreateUserPayload>(emptyForm());
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [createdPassword, setCreatedPassword] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);

    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const [editTarget, setEditTarget] = useState<UserRecord | null>(null);
    const [editForm, setEditForm] = useState<UpdateUserPayload>({ name: '', lastName: '', email: '', phone: '', cargo: '', role: '' as UserRole });
    const [editError, setEditError] = useState('');
    const [editSaving, setEditSaving] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await userService.list();
            setUsers(data);
        } catch {
            setError('No se pudo cargar la lista de usuarios.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = () => {
        setForm({ ...emptyForm(), creatorId: user?.id ?? '' });
        setFormError('');
        setCreatedPassword(null);
        setShowPassword(false);
        setCopied(false);
        setModalOpen(true);
    };

    const handleField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleCreate = async () => {
        if (!form.name || !form.lastName || !form.email) {
            setFormError('Nombres, Apellidos y Correo son obligatorios.');
            return;
        }
        if (!form.role) {
            setFormError('Debes seleccionar un rol para el usuario.');
            return;
        }
        setSaving(true);
        setFormError('');
        try {
            const created = await userService.create(form);
            setUsers(prev => [created, ...prev]);
            if (created.generatedPassword) {
                setCreatedPassword(created.generatedPassword);
            } else {
                setModalOpen(false);
            }
        } catch (err: any) {
            setFormError(err?.message ?? 'Error al crear el usuario.');
        } finally {
            setSaving(false);
        }
    };

    const handleCopyPassword = () => {
        if (!createdPassword) return;
        navigator.clipboard.writeText(createdPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setCreatedPassword(null);
        setShowPassword(false);
        setCopied(false);
    };

    const handleOpenEdit = (u: UserRecord) => {
        setEditTarget(u);
        setEditForm({ name: u.name, lastName: u.lastName, email: u.email, phone: u.phone ?? '', cargo: u.cargo ?? '', role: u.role });
        setEditError('');
    };

    const handleEditField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdate = async () => {
        if (!editTarget) return;
        if (!editForm.name || !editForm.lastName || !editForm.email) {
            setEditError('Nombres, Apellidos y Correo son obligatorios.');
            return;
        }
        if (!editForm.role) {
            setEditError('Debes seleccionar un rol.');
            return;
        }
        setEditSaving(true);
        setEditError('');
        try {
            const updated = await userService.update(editTarget.id, editForm);
            setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
            setEditTarget(null);
        } catch (err: any) {
            setEditError(err?.message ?? 'Error al actualizar el usuario.');
        } finally {
            setEditSaving(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTargetId) return;
        try {
            await userService.delete(deleteTargetId);
            setUsers(prev => prev.filter(u => u.id !== deleteTargetId));
        } catch {
            setError('No se pudo eliminar el usuario.');
        } finally {
            setDeleteTargetId(null);
        }
    };

    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        return (
            u.name.toLowerCase().includes(q) ||
            u.lastName.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
        );
    });

    return (
        <div className={styles.page}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
                <h2 className={styles.pageTitle}>Usuarios</h2>

                <div className={styles.toolbarRight}>
                    <div className={styles.searchWrapper}>
                        <Search size={15} className={styles.searchIcon} />
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Buscar por nombre o correo..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <button className={styles.createButton} onClick={handleOpenModal}>
                        <UserPlus size={15} />
                        Crear Usuario
                    </button>
                </div>
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            {/* Table */}
            <div className={styles.tableWrapper}>
                {loading ? (
                    <div className={styles.emptyState}>
                        <Loader2 size={28} className={styles.spin} />
                        <p>Cargando usuarios...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Users size={36} className={styles.emptyIcon} />
                        <p>{search ? 'Sin resultados para la búsqueda.' : 'No hay usuarios registrados aún.'}</p>
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.thIndex}>#</th>
                                <th>Nombres</th>
                                <th>Apellidos</th>
                                <th>Correo Electrónico</th>
                                <th>Teléfono</th>
                                <th>Cargo</th>
                                <th>Rol</th>
                                <th className={styles.thActions}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((u, index) => (
                                <tr key={u.id} className={styles.row}>
                                    <td className={styles.tdIndex}>{index + 1}</td>
                                    <td className={styles.tdText}>{u.name}</td>
                                    <td className={styles.tdText}>{u.lastName}</td>
                                    <td className={styles.tdMuted}>{u.email}</td>
                                    <td className={styles.tdMuted}>{u.phone || '—'}</td>
                                    <td className={styles.tdMuted}>{u.cargo || '—'}</td>
                                    <td>
                                        <span className={`${styles.roleBadge} ${styles[u.role.toLowerCase()]}`}>
                                            {ROLE_LABELS[u.role]}
                                        </span>
                                    </td>
                                    <td className={styles.tdActions}>
                                        {['ADMIN', 'GESTOR'].includes(user?.role ?? '') && (
                                            <button
                                                className={styles.editBtn}
                                                onClick={() => handleOpenEdit(u)}
                                                title="Editar usuario"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                        )}
                                        {user?.role === 'ADMIN' && (
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={() => setDeleteTargetId(u.id)}
                                                title="Eliminar usuario"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create User Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                title={createdPassword ? 'Usuario creado exitosamente' : 'Crear Usuario'}
                footer={
                    createdPassword ? (
                        <button className={styles.saveButton} onClick={handleCloseModal}>
                            Cerrar
                        </button>
                    ) : (
                        <>
                            <button className={styles.cancelButton} onClick={handleCloseModal}>
                                Cancelar
                            </button>
                            <button className={styles.saveButton} onClick={handleCreate} disabled={saving}>
                                {saving ? <><Loader2 size={14} className={styles.spin} /> Guardando...</> : 'Crear Usuario'}
                            </button>
                        </>
                    )
                }
            >
                {createdPassword ? (
                    <div className={styles.form}>
                        <div className={styles.successBanner}>
                            <p>El usuario fue creado y se le envió un correo de bienvenida con sus credenciales.</p>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Contraseña temporal generada</label>
                            <div className={styles.passwordReveal}>
                                <span className={styles.passwordText}>
                                    {showPassword ? createdPassword : '•'.repeat(createdPassword.length)}
                                </span>
                                <button
                                    type="button"
                                    className={styles.iconBtn}
                                    onClick={() => setShowPassword(p => !p)}
                                    title={showPassword ? 'Ocultar' : 'Mostrar'}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                                <button
                                    type="button"
                                    className={styles.iconBtn}
                                    onClick={handleCopyPassword}
                                    title="Copiar contraseña"
                                >
                                    {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                        <p className={styles.passwordNote}>
                            Esta contraseña solo se muestra una vez. Asegúrate de compartirla con el usuario si es necesario.
                        </p>
                    </div>
                ) : (
                    <div className={styles.form}>
                        {formError && <p className={styles.formError}>{formError}</p>}

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Nombres *</label>
                                <input
                                    className={styles.input}
                                    name="name"
                                    value={form.name}
                                    onChange={handleField}
                                    placeholder="Ej: Juan"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Apellidos *</label>
                                <input
                                    className={styles.input}
                                    name="lastName"
                                    value={form.lastName}
                                    onChange={handleField}
                                    placeholder="Ej: Pérez"
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Correo Electrónico *</label>
                            <input
                                className={styles.input}
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleField}
                                placeholder="usuario@empresa.com"
                            />
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Teléfono</label>
                                <input
                                    className={styles.input}
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleField}
                                    placeholder="Ej: 3001234567"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Cargo</label>
                                <input
                                    className={styles.input}
                                    name="cargo"
                                    value={form.cargo}
                                    onChange={handleField}
                                    placeholder="Ej: Inspector"
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Rol *</label>
                            <select
                                className={styles.select}
                                name="role"
                                value={form.role}
                                onChange={handleField}
                            >
                                <option value="" disabled>Seleccionar rol...</option>
                                {ROLES.map(r => (
                                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Edit User Modal */}
            <Modal
                isOpen={!!editTarget}
                onClose={() => setEditTarget(null)}
                title="Editar Usuario"
                footer={
                    <>
                        <button className={styles.cancelButton} onClick={() => setEditTarget(null)}>
                            Cancelar
                        </button>
                        <button className={styles.saveButton} onClick={handleUpdate} disabled={editSaving}>
                            {editSaving ? <><Loader2 size={14} className={styles.spin} /> Guardando...</> : 'Guardar cambios'}
                        </button>
                    </>
                }
            >
                <div className={styles.form}>
                    {editError && <p className={styles.formError}>{editError}</p>}

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Nombres *</label>
                            <input className={styles.input} name="name" value={editForm.name} onChange={handleEditField} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Apellidos *</label>
                            <input className={styles.input} name="lastName" value={editForm.lastName} onChange={handleEditField} />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Correo Electrónico *</label>
                        <input className={styles.input} name="email" type="email" value={editForm.email} onChange={handleEditField} />
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Teléfono</label>
                            <input className={styles.input} name="phone" value={editForm.phone ?? ''} onChange={handleEditField} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Cargo</label>
                            <input className={styles.input} name="cargo" value={editForm.cargo ?? ''} onChange={handleEditField} />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Rol *</label>
                        <select className={styles.select} name="role" value={editForm.role} onChange={handleEditField}>
                            <option value="" disabled>Seleccionar rol...</option>
                            {ROLES.map(r => (
                                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Modal>

            {/* Confirm delete modal */}
            {deleteTargetId && (
                <div className={styles.overlay} onClick={() => setDeleteTargetId(null)}>
                    <div className={styles.dialog} onClick={e => e.stopPropagation()}>
                        <p className={styles.dialogMessage}>¿Estás seguro de eliminar este usuario?</p>
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
