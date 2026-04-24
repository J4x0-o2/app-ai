import { PasswordResetToken } from '../entities/PasswordResetToken';

export interface IPasswordResetTokenRepository {
    save(token: PasswordResetToken): Promise<void>;
    findByToken(token: string): Promise<PasswordResetToken | null>;
    markAsUsed(token: string): Promise<void>;
}
