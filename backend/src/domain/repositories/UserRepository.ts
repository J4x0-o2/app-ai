import { User } from '../entities/User';

export interface UserRepository {
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findAll(): Promise<User[]>;
    save(user: User, passwordHash: string): Promise<void>;
    update(user: User): Promise<void>;
    updatePassword(userId: string, passwordHash: string): Promise<void>;
    delete(id: string): Promise<void>;
}
