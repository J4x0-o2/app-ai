import prisma from '../database/prismaClient';

export interface AuthUserDTO {
    id: string;
    email: string;
    passwordHash: string;
    isActive: boolean;
    roles: string[];
}

export interface IAuthRepository {
    findByEmail(email: string): Promise<AuthUserDTO | null>;
}

export class PrismaAuthRepository implements IAuthRepository {
    async findByEmail(email: string): Promise<AuthUserDTO | null> {
        const userRec = await prisma.users.findUnique({
            where: { email },
            include: {
                user_roles: {
                    include: { roles: true }
                }
            }
        });

        if (!userRec) {
            return null;
        }

        // Extract role names
        const roleNames = userRec.user_roles.map(ur => ur.roles.name);

        return {
            id: userRec.id,
            email: userRec.email,
            passwordHash: userRec.password_hash,
            isActive: userRec.is_active ?? true,
            roles: roleNames
        };
    }
}
