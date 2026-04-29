import { RefreshToken } from '../entities/RefreshToken';

export interface IRefreshTokenRepository {
    save(token: RefreshToken): Promise<void>;
    findByToken(token: string): Promise<RefreshToken | null>;
    revoke(token: string): Promise<void>;
    revokeAllForUser(userId: string): Promise<void>;
}
