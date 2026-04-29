import React, { useState, useRef, useEffect, useCallback } from 'react';
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
    streaming?: boolean;
}

// Caracteres revelados por tick. Adaptativo: drena más rápido si hay backlog.
const CHARS_SLOW = 4;   // cola pequeña  → efecto suave visible
const CHARS_FAST = 12;  // cola grande   → no se queda atrás
const BACKLOG_THRESHOLD = 120;
const TICK_MS = 18; // ~55 fps

export const ChatArea: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [conversationId, setConversationId] = useState<string | undefined>();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Cola de caracteres pendientes de pintar
    const charQueueRef = useRef<string[]>([]);
    // ID del mensaje del asistente que se está animando
    const animMsgIdRef = useRef<string | null>(null);
    // Handle del timer de animación
    const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Flag: el stream HTTP terminó (puede quedar cola pendiente)
    const streamEndedRef = useRef(false);

    const stopAnimation = useCallback(() => {
        if (animTimerRef.current !== null) {
            clearTimeout(animTimerRef.current);
            animTimerRef.current = null;
        }
    }, []);

    const finalizeMessage = useCallback((msgId: string) => {
        stopAnimation();
        charQueueRef.current = [];
        animMsgIdRef.current = null;
        streamEndedRef.current = false;
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, streaming: false } : m));
        setIsLoading(false);
    }, [stopAnimation]);

    const startAnimation = useCallback((msgId: string) => {
        if (animTimerRef.current !== null) return; // ya corriendo

        const tick = () => {
            const queue = charQueueRef.current;

            if (queue.length === 0) {
                animTimerRef.current = null;
                if (streamEndedRef.current) {
                    finalizeMessage(msgId);
                }
                // Si el stream HTTP aún no terminó, el próximo chunk reinicia el timer
                return;
            }

            const charsThisTick = queue.length > BACKLOG_THRESHOLD ? CHARS_FAST : CHARS_SLOW;
            const batch = queue.splice(0, charsThisTick).join('');

            setMessages(prev =>
                prev.map(m => m.id === msgId ? { ...m, content: m.content + batch } : m),
            );

            animTimerRef.current = setTimeout(tick, TICK_MS);
        };

        animTimerRef.current = setTimeout(tick, TICK_MS);
    }, [finalizeMessage]);

    // Nuevo chat
    useEffect(() => {
        if (location.state?.newChat) {
            abortRef.current?.abort();
            stopAnimation();
            charQueueRef.current = [];
            streamEndedRef.current = true;
            setMessages([]);
            setConversationId(undefined);
            setError('');
            setIsLoading(false);
        }
    }, [location.state?.newChat, stopAnimation]);

    // Cargar conversación existente desde el sidebar
    useEffect(() => {
        const targetId: string | undefined = location.state?.loadConversation;
        if (!targetId || !user) return;

        abortRef.current?.abort();
        stopAnimation();
        charQueueRef.current = [];
        streamEndedRef.current = true;
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

    // Auto-scroll solo cuando hay cambios reales (no en cada char para evitar jank)
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, isLoading]);

    const handleSendMessage = async (content: string, model: string) => {
        if (!user || isLoading) return;
        setError('');

        // Reinicia el estado de animación
        stopAnimation();
        charQueueRef.current = [];
        streamEndedRef.current = false;

        const userMessage: Message = { id: Date.now().toString(), role: 'user', content };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        const aiMessageId = `ai-${Date.now()}`;
        animMsgIdRef.current = aiMessageId;
        setMessages(prev => [...prev, { id: aiMessageId, role: 'assistant', content: '', streaming: true }]);

        abortRef.current = new AbortController();

        try {
            const stream = chatService.streamMessage(
                { userId: user.id, prompt: content, model, conversationId },
                abortRef.current.signal,
            );

            for await (const event of stream) {
                if (event.error) {
                    setError(event.error);
                    break;
                }

                if (event.chunk) {
                    // Encola los caracteres — el timer los pinta suavemente
                    charQueueRef.current.push(...event.chunk.split(''));
                    startAnimation(aiMessageId);
                }

                if (event.done && event.conversationId) {
                    if (!conversationId) {
                        window.dispatchEvent(new CustomEvent('conversation-created'));
                    }
                    setConversationId(event.conversationId);
                }
            }

            // HTTP stream terminó — si la cola ya está vacía, finaliza ahora;
            // si no, el tick la drena y llama a finalizeMessage cuando acabe.
            streamEndedRef.current = true;
            if (charQueueRef.current.length === 0 && animTimerRef.current === null) {
                finalizeMessage(aiMessageId);
            }

        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                // cancelado — sin mensaje de error
            } else if (err instanceof ApiError && err.status === 401) {
                setError('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.');
            } else {
                setError('Ocurrió un error al procesar tu consulta. Intenta nuevamente.');
            }
            // En error: vuelca la cola restante de golpe y limpia
            const remaining = charQueueRef.current.splice(0).join('');
            streamEndedRef.current = true;
            if (remaining) {
                setMessages(prev =>
                    prev.map(m => m.id === aiMessageId ? { ...m, content: m.content + remaining } : m),
                );
            }
            finalizeMessage(aiMessageId);
        } finally {
            abortRef.current = null;
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
                                            {msg.streaming && (
                                                <span className={styles.cursor} aria-hidden="true">▋</span>
                                            )}
                                        </div>
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>
                        ))}

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
