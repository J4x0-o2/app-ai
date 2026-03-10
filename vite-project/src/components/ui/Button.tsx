import React, { type ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const baseClass = styles.button;
  const variantClass = styles[variant];
  const widthClass = fullWidth ? 'w-full' : '';

  // Combine classes string
  const combinedClassName = [baseClass, variantClass, widthClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
};
