import * as jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export interface JwtPayload {
    userId: string;
    email: string;
    roles?: string[];
}

export interface IJwtService {
    generateToken(payload: JwtPayload): string;
    verifyToken(token: string): JwtPayload;
}

export class JwtService implements IJwtService {
    generateToken(payload: JwtPayload): string {
        return jwt.sign(payload, env.JWT_SECRET, {
            expiresIn: env.JWT_EXPIRES_IN as any
        });
    }

    verifyToken(token: string): JwtPayload {
        try {
            return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
}
