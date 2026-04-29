export class RefreshToken {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly token: string,
        public readonly expiresAt: Date,
        public readonly createdAt: Date,
        public readonly revokedAt: Date | null = null,
    ) { }

    isExpired(): boolean {
        return new Date() > this.expiresAt;
    }

    isRevoked(): boolean {
        return this.revokedAt !== null;
    }

    isValid(): boolean {
        return !this.isExpired() && !this.isRevoked();
    }
}
