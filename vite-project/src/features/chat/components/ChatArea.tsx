import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { MessageInput } from './MessageInput';
import { chatService } from '../services/chatService';
import { useAuth } from '../../../store/authContext';
import { ApiError } from '../../../utils/apiClient';
import styles from './ChatArea.module.css';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export const ChatArea: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [conversationId, setConversationId] = useState<string | undefined>();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Nuevo chat
    useEffect(() => {
        if (location.state?.newChat) {
            setMessages([]);
            setConversationId(undefined);
            setError('');
        }
    }, [location.state?.newChat]);

    // Cargar conversación existente desde el sidebar
    useEffect(() => {
        const targetId: string | undefined = location.state?.loadConversation;
        if (!targetId || !user) return;

        setIsLoading(true);
        setError('');
        setMessages([]);
        setConversationId(targetId);

        chatService.getHistory(targetId, user.id)
            .then(history => {
                const loaded: Message[] = [];
                for (const prompt of history.prompts) {
                    loaded.push({ id: prompt.id, role: 'user', content: prompt.content });
                    if (prompt.response) {
                        loaded.push({ id: `${prompt.id}-res`, role: 'assistant', content: prompt.response });
                    }
                }
                setMessages(loaded);
            })
            .catch(() => setError('No se pudo cargar el historial de esta conversación.'))
            .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state?.loadConversation]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSendMessage = async (content: string, model: string) => {
        if (!user) return;
        setError('');

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content,
        };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const result = await chatService.sendMessage({
                userId: user.id,
                prompt: content,
                model,
                conversationId,
            });

            // Si es una conversación nueva, avisa al sidebar para que refresque la lista
            if (!conversationId) {
                window.dispatchEvent(new CustomEvent('conversation-created'));
            }
            setConversationId(result.conversationId);

            const aiMessage: Message = {
                id: result.response.id,
                role: 'assistant',
                content: result.response.content,
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setError('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.');
            } else {
                setError('Ocurrió un error al procesar tu consulta. Intenta nuevamente.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.chatArea}>
            <div className={styles.messagesContainer}>
                {messages.length === 0 && !isLoading ? (
                    <div className={styles.emptyState}>
                        <h1 className={styles.welcomeTitle}>Bienvenido</h1>
                        <p className={styles.welcomeSubtitle}>¿En qué puedo ayudarte hoy?</p>
                    </div>
                ) : (
                    <div>
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`${styles.messageRow} ${msg.role === 'user' ? styles.messageRowUser : ''}`}
                            >
                                <div className={`${styles.messageAvatar} ${msg.role === 'user' ? styles.avatarUser : styles.avatarAi}`}>
                                    {msg.role === 'user' ? 'U' : 'AI'}
                                </div>
                                <div className={`${styles.messageContent} ${msg.role === 'user' ? styles.contentUser : styles.contentAi}`}>
                                    {msg.role === 'assistant' ? (
                                        <div className={styles.markdown}>
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className={styles.messageRow}>
                                <div className={`${styles.messageAvatar} ${styles.avatarAi}`}>AI</div>
                                <div className={`${styles.messageContent} ${styles.contentAi} ${styles.typing}`}>
                                    <span /><span /><span />
                                </div>
                            </div>
                        )}

                        {error && <p className={styles.errorMessage}>{error}</p>}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            <div className={styles.inputContainer}>
                <MessageInput onSendMessage={handleSendMessage} disabled={isLoading} />
            </div>
        </div>
    );
};
