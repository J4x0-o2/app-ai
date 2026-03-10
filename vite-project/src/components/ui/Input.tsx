import React, { type InputHTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    isPassword = false,
    className = '',
    ...props
}) => {
    const [showPassword, setShowPassword] = useState(false);

    const handleTogglePassword = () => {
        setShowPassword((prev) => !prev);
    };

    const currentType = isPassword ? (showPassword ? 'text' : 'password') : props.type || 'text';

    return (
        <div className={styles.inputWrapper}>
            {label && <label className={styles.label}>{label}</label>}
            <div className={styles.inputContainer}>
                <input
                    className={`${styles.input} ${className} ${error ? styles.inputError : ''}`}
                    type={currentType}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={handleTogglePassword}
                        className={styles.iconRight}
                        aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
            {error && <span className={styles.errorText}>{error}</span>}
        </div>
    );
};
