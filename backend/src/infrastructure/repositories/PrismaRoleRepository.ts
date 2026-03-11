import prisma from '../database/prismaClient';

export interface IRoleRepository {
    getRolesByUserId(userId: string): Promise<string[]>;
}

export class PrismaRoleRepository implements IRoleRepository {
    async getRolesByUserId(userId: string): Promise<string[]> {
        const userRoles = await prisma.user_roles.findMany({
            where: { user_id: userId },
            include: { roles: true }
        });

        return userRoles.map(ur => ur.roles.name);
    }
}
