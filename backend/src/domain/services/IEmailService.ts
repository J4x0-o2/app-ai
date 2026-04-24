export interface IEmailService {
    sendWelcomeEmail(to: string, name: string, tempPassword: string): Promise<void>;
    sendPasswordResetEmail(to: string, name: string, resetLink: string): Promise<void>;
}
