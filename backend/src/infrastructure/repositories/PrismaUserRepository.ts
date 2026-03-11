import { UserRepository } from '../../domain/repositories/UserRepository';
import { User } from '../../domain/entities/User';
import { Role } from '../../shared/types/roles';
import prisma from '../database/prismaClient';

export class PrismaUserRepository implements UserRepository {
    async findById(id: string): Promise<User | null> {
        const userRec = await prisma.users.findUnique({
            where: { id },
            include: { user_roles: { include: { roles: true } } }
        });

        if (!userRec) return null;

        const roleName = userRec.user_roles?.[0]?.roles?.name as Role || Role.EMPLEADO;

        return new User(
            userRec.id,
            userRec.name || userRec.username,
            userRec.email,
            roleName,
            userRec.created_at || new Date(),
            'system', // createdBy not in Prisma schema
            userRec.profile_image || undefined
        );
    }

    async findByEmail(email: string): Promise<User | null> {
        const userRec = await prisma.users.findUnique({
            where: { email },
            include: { user_roles: { include: { roles: true } } }
        });

        if (!userRec) return null;

        const roleName = userRec.user_roles?.[0]?.roles?.name as Role || Role.EMPLEADO;

        return new User(
            userRec.id,
            userRec.name || userRec.username,
            userRec.email,
            roleName,
            userRec.created_at || new Date(),
            'system', 
            userRec.profile_image || undefined
        );
    }

    async save(user: User): Promise<void> {
        let roleRec = await prisma.roles.findUnique({ where: { name: user.role } });
        if (!roleRec) {
            roleRec = await prisma.roles.create({ data: { name: user.role } });
        }

        const username = user.email.split('@')[0] + '-' + user.id.slice(0, 4);

        await prisma.users.create({
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                username: username,
                password_hash: 'default_password',
                profile_image: user.profilePhotoUrl,
                created_at: user.createdAt,
                user_roles: {
                    create: {
                        role_id: roleRec.id
                    }
                }
            }
        });
    }

    async update(user: User): Promise<void> {
        let roleRec = await prisma.roles.findUnique({ where: { name: user.role } });
        if (!roleRec) {
            roleRec = await prisma.roles.create({ data: { name: user.role } });
        }

        await prisma.users.update({
            where: { id: user.id },
            data: {
                name: user.name,
                email: user.email,
                profile_image: user.profilePhotoUrl,
                // Update role mapping requires deleting old roles and adding new ones,
                // to keep it simple we either ignore role update or recreate it.
                user_roles: {
                    deleteMany: {},
                    create: { role_id: roleRec.id }
                }
            }
        });
    }

    async delete(id: string): Promise<void> {
        await prisma.users.delete({ where: { id } });
    }
}
