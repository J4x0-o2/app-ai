import React, { useState } from 'react';
import { MessageInput } from './MessageInput';
import styles from './ChatArea.module.css';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface ChatAreaProps {
    onAttachClick: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onAttachClick }) => {
    const [messages, setMessages] = useState<Message[]>([]);

    const handleSendMessage = (content: string, model: string) => {
        // Add user message
        const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content };
        setMessages((prev) => [...prev, newUserMsg]);

        // Mock AI response
        setTimeout(() => {
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Esta es una respuesta simulada usando ${model}. Aquí se integrará el RAG con los documentos subidos.`
            };
            setMessages((prev) => [...prev, aiResponse]);
        }, 1000);
    };

    return (
        <div className={styles.chatArea}>
            <div className={styles.messagesContainer}>
                {messages.length === 0 ? (
                    <div className={styles.emptyState}>
                        <h1 className={styles.welcomeTitle}>Bienvenido</h1>
                        <p className={styles.welcomeSubtitle}>¿En qué puedo ayudarte hoy?</p>
                    </div>
                ) : (
                    <div>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`${styles.messageRow} ${msg.role === 'user' ? styles.messageRowUser : ''}`}
                            >
                                <div className={`${styles.messageAvatar} ${msg.role === 'user' ? styles.avatarUser : styles.avatarAi}`}>
                                    {msg.role === 'user' ? 'U' : 'AI'}
                                </div>
                                <div className={`${styles.messageContent} ${msg.role === 'user' ? styles.contentUser : styles.contentAi}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className={styles.inputContainer}>
                <MessageInput onSendMessage={handleSendMessage} onAttachClick={onAttachClick} />
            </div>
        </div>
    );
};
