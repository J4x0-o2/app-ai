import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Trash2, MessageSquare, FileText, Users } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { chatService, ConversationSummary } from '../../features/chat/services/chatService';
import { useAuth } from '../../store/authContext';
import styles from './Sidebar.module.css';

interface SidebarProps {
    isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [search, setSearch] = useState('');
    const [activeId, setActiveId] = useState<string | null>(null);

    const loadConversations = useCallback(async () => {
        if (!user) return;
        try {
            const data = await chatService.getConversations();
            setConversations(data);
        } catch {
            // Silencioso — el sidebar no debe bloquear si el endpoint falla
        }
    }, [user]);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    // Refresca la lista cuando ChatArea crea una conversación nueva
    useEffect(() => {
        const handler = () => loadConversations();
        window.addEventListener('conversation-created', handler);
        return () => window.removeEventListener('conversation-created', handler);
    }, [loadConversations]);

    const handleNewChat = () => {
        setActiveId(null);
        navigate('/chat', { state: { newChat: Date.now() } });
    };

    const handleOpenConversation = (conv: ConversationSummary) => {
        setActiveId(conv.id);
        navigate('/chat', { state: { loadConversation: conv.id } });
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await chatService.deleteConversation(id);
            setConversations(prev => prev.filter(c => c.id !== id));
            if (activeId === id) {
                setActiveId(null);
                navigate('/chat', { state: { newChat: Date.now() } });
            }
        } catch {
            // ignorar — podría mostrarse un toast en el futuro
        }
    };

    const filtered = conversations.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <aside className={`${styles.sidebar} ${!isOpen ? styles.collapsed : ''}`}>
            <div className={styles.topActions}>
                <button className={`${styles.actionButton} ${styles.newChatButton}`} onClick={handleNewChat}>
                    <Plus size={18} />
                    Nuevo Chat
                </button>
                <NavLink
                    to="/documents"
                    className={({ isActive }) =>
                        `${styles.actionButton} ${isActive ? styles.navLinkActive : ''}`
                    }
                >
                    <FileText size={18} />
                    Documentos
                </NavLink>
                {user?.role === 'ADMIN' && (
                    <NavLink
                        to="/users"
                        className={({ isActive }) =>
                            `${styles.actionButton} ${isActive ? styles.navLinkActive : ''}`
                        }
                    >
                        <Users size={18} />
                        Usuarios
                    </NavLink>
                )}
            </div>

            <div className={styles.historyArea}>
                <div className={styles.historyTitle}>Historial</div>

                <div className={styles.searchWrapper}>
                    <Search size={14} className={styles.searchIcon} />
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Buscar conversación..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {filtered.length === 0 ? (
                    <p className={styles.emptyHistory}>
                        {search ? 'Sin resultados' : 'No hay conversaciones aún'}
                    </p>
                ) : (
                    <ul className={styles.historyList}>
                        {filtered.map(conv => (
                            <li key={conv.id}>
                                <button
                                    className={`${styles.historyItem} ${activeId === conv.id ? styles.historyItemActive : ''}`}
                                    onClick={() => handleOpenConversation(conv)}
                                    title={conv.id}
                                >
                                    <MessageSquare size={14} className={styles.historyItemIcon} />
                                    <span className={styles.historyItemTitle}>{conv.title}</span>
                                    <button
                                        className={styles.historyDeleteBtn}
                                        onClick={e => handleDelete(e, conv.id)}
                                        title="Eliminar conversación"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </aside>
    );
};
