import { UserRepository } from '../../domain/repositories/UserRepository';
import { User } from '../../domain/entities/User';
import { Role } from '../../shared/types/roles';
import prisma from '../database/prismaClient';

const toUser = (userRec: any): User => {
    const roleName = userRec.user_roles?.[0]?.roles?.name as Role || Role.EMPLEADO;
    return new User(
        userRec.id,
        userRec.name || '',
        userRec.last_name || '',
        userRec.email,
        roleName,
        userRec.created_at || new Date(),
        'system',
        userRec.phone || undefined,
        userRec.cargo || undefined,
        userRec.profile_image || undefined
    );
};

const userInclude = {
    user_roles: { include: { roles: true } }
};

export class PrismaUserRepository implements UserRepository {
    async findById(id: string): Promise<User | null> {
        const rec = await prisma.users.findUnique({ where: { id }, include: userInclude });
        return rec ? toUser(rec) : null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const rec = await prisma.users.findUnique({ where: { email }, include: userInclude });
        return rec ? toUser(rec) : null;
    }

    async findAll(): Promise<User[]> {
        const recs = await prisma.users.findMany({
            where: { is_active: true },
            include: userInclude,
            orderBy: { created_at: 'desc' },
        });
        return recs.map(toUser);
    }

    async save(user: User, passwordHash: string): Promise<void> {
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
                last_name: user.lastName,
                phone: user.phone,
                cargo: user.cargo,
                username,
                password_hash: passwordHash,
                profile_image: user.profilePhotoUrl,
                created_at: user.createdAt,
                user_roles: {
                    create: { role_id: roleRec.id }
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
                last_name: user.lastName,
                phone: user.phone,
                cargo: user.cargo,
                email: user.email,
                profile_image: user.profilePhotoUrl,
                user_roles: {
                    deleteMany: {},
                    create: { role_id: roleRec.id }
                }
            }
        });
    }

    async updatePassword(userId: string, passwordHash: string): Promise<void> {
        await prisma.users.update({
            where: { id: userId },
            data: { password_hash: passwordHash, updated_at: new Date() },
        });
    }

    async delete(id: string): Promise<void> {
        await prisma.users.update({
            where: { id },
            data: { is_active: false }
        });
    }
}
