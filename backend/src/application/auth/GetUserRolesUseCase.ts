import { IRoleRepository } from '../../infrastructure/repositories/PrismaRoleRepository';

export class GetUserRolesUseCase {
    constructor(private roleRepository: IRoleRepository) {}

    async execute(userId: string): Promise<string[]> {
        return await this.roleRepository.getRolesByUserId(userId);
    }
}
