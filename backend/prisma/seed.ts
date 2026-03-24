import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    // 1. Crear roles si no existen
    const roleNames = ['ADMIN', 'GESTOR', 'INSTRUCTOR', 'EMPLEADO'];

    for (const name of roleNames) {
        await prisma.roles.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }

    console.log('✓ Roles creados');

    // 2. Crear usuario admin de prueba
    const passwordHash = await bcrypt.hash('admin123', 10);

    const user = await prisma.users.upsert({
        where: { email: 'admin@test.com' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@test.com',
            password_hash: passwordHash,
            name: 'Admin',
            last_name: 'Test',
            is_active: true,
        },
    });

    console.log('✓ Usuario creado:', user.email);

    // 3. Asignar rol ADMIN al usuario
    const adminRole = await prisma.roles.findUnique({ where: { name: 'ADMIN' } });

    if (adminRole) {
        await prisma.user_roles.upsert({
            where: {
                user_id_role_id: {
                    user_id: user.id,
                    role_id: adminRole.id,
                },
            },
            update: {},
            create: {
                user_id: user.id,
                role_id: adminRole.id,
            },
        });
        console.log('✓ Rol ADMIN asignado');
    }

    console.log('\nUsuario de prueba listo:');
    console.log('  Email:    admin@test.com');
    console.log('  Password: admin123');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
