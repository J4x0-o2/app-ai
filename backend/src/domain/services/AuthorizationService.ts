import { Role, Action } from '../../shared/types/roles';

export class AuthorizationService {
    private static permissions: Record<Role, Action[]> = {
        [Role.ADMIN]: [
            Action.CREATE_USER, Action.EDIT_USER, Action.DELETE_USER,
            Action.UPLOAD_DOCUMENT, Action.DELETE_DOCUMENT,
            Action.SEND_PROMPT, Action.UPDATE_PROFILE_PHOTO, Action.VIEW_CONVERSATION_HISTORY
        ],
        [Role.GESTOR]: [
            Action.CREATE_USER, Action.SEND_PROMPT, Action.UPDATE_PROFILE_PHOTO, Action.VIEW_CONVERSATION_HISTORY
        ],
        [Role.INSTRUCTOR]: [
            Action.UPLOAD_DOCUMENT, Action.DELETE_DOCUMENT, Action.SEND_PROMPT, Action.UPDATE_PROFILE_PHOTO, Action.VIEW_CONVERSATION_HISTORY
        ],
        [Role.EMPLEADO]: [
            Action.SEND_PROMPT, Action.UPDATE_PROFILE_PHOTO, Action.VIEW_CONVERSATION_HISTORY
        ]
    };

    public static canPerformAction(userRole: Role, action: Action): boolean {
        const rolePermissions = this.permissions[userRole] || [];
        return rolePermissions.includes(action);
    }
}
