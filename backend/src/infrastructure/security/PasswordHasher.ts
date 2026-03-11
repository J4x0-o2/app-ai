import * as bcrypt from 'bcrypt';

export interface IPasswordHasher {
    hash(password: string): Promise<string>;
    compare(password: string, hash: string): Promise<boolean>;
}

export class PasswordHasher implements IPasswordHasher {
    private readonly SALT_ROUNDS = 10;

    async hash(password: string): Promise<string> {
        return await bcrypt.hash(password, this.SALT_ROUNDS);
    }

    async compare(password: string, hash: string): Promise<boolean> {
        return await bcrypt.compare(password, hash);
    }
}
