import { Role } from '../../shared/types/roles';

export class User {
    constructor(
        public readonly id: string,
        public name: string,
        public email: string,
        public role: Role,
        public createdAt: Date,
        public createdBy: string,
        public profilePhotoUrl?: string
    ) { }
}
