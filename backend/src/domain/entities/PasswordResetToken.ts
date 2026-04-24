export class PasswordResetToken {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly token: string,
        public readonly expiresAt: Date,
        public readonly createdAt: Date,
        public readonly usedAt: Date | null = null,
    ) { }

    isExpired(): boolean {
        return new Date() > this.expiresAt;
    }

    isUsed(): boolean {
        return this.usedAt !== null;
    }
}
