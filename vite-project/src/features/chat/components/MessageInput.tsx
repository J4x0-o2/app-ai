import React, { useState, useRef, useEffect } from 'react';
import { Plus, Send, ChevronDown } from 'lucide-react';
import styles from './MessageInput.module.css';

interface MessageInputProps {
    onSendMessage: (message: string, model: string) => void;
    onAttachClick: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onAttachClick }) => {
    const [message, setMessage] = useState('');
    const [model, setModel] = useState('GPT-4');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [message]);

    const handleSend = () => {
        if (message.trim()) {
            onSendMessage(message.trim(), model);
            setMessage('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'; // Reset size
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className={styles.inputWrapper}>
            <button
                type="button"
                className={styles.iconButton}
                onClick={onAttachClick}
                title="Adjuntar"
            >
                <Plus size={20} />
            </button>

            <div className={styles.selectContainer}>
                <select
                    className={styles.modelSelect}
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                >
                    <option value="GPT-4">GPT-4</option>
                    <option value="GPT-3.5">GPT-3.5</option>
                    <option value="Claude-3">Claude-3</option>
                </select>
                <ChevronDown size={14} className={styles.selectIcon} />
            </div>

            <div className={styles.divider} />

            <textarea
                ref={textareaRef}
                className={styles.input}
                placeholder="Escribe tu mensaje..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
            />

            <button
                type="button"
                className={styles.sendButton}
                disabled={!message.trim()}
                onClick={handleSend}
                aria-label="Enviar mensaje"
            >
                <Send size={16} />
            </button>
        </div>
    );
};
